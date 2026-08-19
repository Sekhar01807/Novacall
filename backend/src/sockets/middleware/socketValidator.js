import { ERROR_CODES } from "../../utils/errorCodes.js";
import { logger } from "../../utils/logger.js";

/**
 * Socket.IO Event Payload Validators and Rate Limiters
 * 
 * Architecture Note:
 * Socket rate limiters maintain in-memory sliding-window token arrays indexed by socketId.
 * - Single-instance model: State is stored locally per Node process.
 * - Multi-instance scaling: In a clustered multi-node deployment, Socket.IO adapter
 *   (@socket.io/redis-adapter) synchronizes rooms while distributed rate-limiting can be offloaded
 *   to Redis token-bucket keys (e.g. ioredis EVAL scripts) or IP-level reverse proxy throttles.
 */

// Sliding window rate limiting stores (socketId => timestamp array)
const signalingRateLimits = new Map();
const moderationRateLimits = new Map();
const joinRateLimits = new Map();

// Rate limiting parameters
const SIGNALING_WINDOW_MS = 3000;
const SIGNALING_MAX_EVENTS = 30; // Max 30 SDP/ICE exchanges per 3s window

const MODERATION_WINDOW_MS = 5000;
const MODERATION_MAX_EVENTS = 10; // Max 10 mod actions per 5s window

const JOIN_WINDOW_MS = 10000;
const JOIN_MAX_EVENTS = 5; // Max 5 join attempts per 10s window

/**
 * Generic sliding-window rate limit checker
 * @param {Map} store
 * @param {string} socketId
 * @param {number} windowMs
 * @param {number} maxEvents
 * @returns {boolean} true if allowed, false if limit exceeded
 */
const checkRateLimit = (store, socketId, windowMs, maxEvents) => {
    const now = Date.now();
    let timestamps = store.get(socketId) || [];
    timestamps = timestamps.filter(t => now - t < windowMs);

    if (timestamps.length >= maxEvents) {
        return false;
    }

    timestamps.push(now);
    store.set(socketId, timestamps);
    return true;
};

/**
 * Reset rate limit stores (for testing / cleanup)
 * @param {string} [socketId]
 */
export const resetSocketRateLimits = (socketId = null) => {
    if (socketId) {
        signalingRateLimits.delete(socketId);
        moderationRateLimits.delete(socketId);
        joinRateLimits.delete(socketId);
    } else {
        signalingRateLimits.clear();
        moderationRateLimits.clear();
        joinRateLimits.clear();
    }
};

/**
 * Validate join-call payload
 * @param {import('socket.io').Socket} socket
 * @param {any} roomCodeOrUrl
 * @param {any} [clientSuppliedName]
 * @returns {boolean}
 */
export const validateJoinCall = (socket, roomCodeOrUrl, clientSuppliedName) => {
    if (!checkRateLimit(joinRateLimits, socket.id, JOIN_WINDOW_MS, JOIN_MAX_EVENTS)) {
        logger.warn(`Join rate limit exceeded for socket ${socket.id}`);
        socket.emit("error-message", {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: "Too many join attempts. Please wait a moment before trying again."
        });
        return false;
    }

    if (!roomCodeOrUrl || typeof roomCodeOrUrl !== 'string' || roomCodeOrUrl.trim().length === 0) {
        socket.emit("error-message", {
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: "Room code or URL must be a non-empty string."
        });
        return false;
    }

    if (roomCodeOrUrl.length > 256) {
        socket.emit("error-message", {
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: "Room code or URL is excessively long."
        });
        return false;
    }

    if (clientSuppliedName !== undefined && clientSuppliedName !== null) {
        if (typeof clientSuppliedName !== 'string' || clientSuppliedName.length > 100) {
            socket.emit("error-message", {
                code: ERROR_CODES.INVALID_PAYLOAD,
                message: "Guest display name must be a string under 100 characters."
            });
            return false;
        }
    }

    return true;
};

/**
 * Validate WebRTC signaling payload
 * @param {import('socket.io').Socket} socket
 * @param {any} toId
 * @param {any} message
 * @returns {boolean}
 */
export const validateSignal = (socket, toId, message) => {
    if (!checkRateLimit(signalingRateLimits, socket.id, SIGNALING_WINDOW_MS, SIGNALING_MAX_EVENTS)) {
        logger.warn(`Signaling rate limit exceeded for socket ${socket.id}`);
        socket.emit("error-message", {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: "Signaling rate limit exceeded. Slow down peer connections."
        });
        return false;
    }

    if (!toId || typeof toId !== 'string' || toId.trim().length === 0) {
        return false;
    }

    if (!message || (typeof message !== 'string' && typeof message !== 'object')) {
        return false;
    }

    // Limit serialized signaling message payload to 64KB
    const messageSize = typeof message === 'string' ? message.length : JSON.stringify(message).length;
    if (messageSize > 65536) {
        logger.warn(`Rejected oversized signaling payload from ${socket.id} (${messageSize} bytes)`);
        return false;
    }

    return true;
};

/**
 * Validate chat message payload
 * @param {import('socket.io').Socket} socket
 * @param {any} rawData
 * @returns {boolean}
 */
export const validateChatMessage = (socket, rawData) => {
    if (!rawData || typeof rawData !== 'string' || !rawData.trim()) {
        return false;
    }
    return true;
};

/**
 * Validate media toggle payload
 * @param {import('socket.io').Socket} socket
 * @param {any} mediaType
 * @param {any} isEnabled
 * @returns {boolean}
 */
export const validateMediaToggle = (socket, mediaType, isEnabled) => {
    if (mediaType !== 'audio' && mediaType !== 'video') {
        socket.emit("error-message", {
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: "Media type must be either 'audio' or 'video'."
        });
        return false;
    }

    if (typeof isEnabled !== 'boolean' && typeof isEnabled !== 'number') {
        socket.emit("error-message", {
            code: ERROR_CODES.INVALID_PAYLOAD,
            message: "isEnabled must be a boolean."
        });
        return false;
    }

    return true;
};

/**
 * Validate moderation action payload
 * @param {import('socket.io').Socket} socket
 * @param {any} targetSocketId
 * @returns {boolean}
 */
export const validateModerationAction = (socket, targetSocketId = null) => {
    if (!checkRateLimit(moderationRateLimits, socket.id, MODERATION_WINDOW_MS, MODERATION_MAX_EVENTS)) {
        logger.warn(`Moderation rate limit exceeded for socket ${socket.id}`);
        socket.emit("error-message", {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: "Moderation rate limit exceeded. Please wait before issuing further moderation commands."
        });
        return false;
    }

    if (targetSocketId !== null && targetSocketId !== undefined) {
        if (typeof targetSocketId !== 'string' || !targetSocketId.trim()) {
            socket.emit("error-message", {
                code: ERROR_CODES.INVALID_PAYLOAD,
                message: "Target participant socket ID is required."
            });
            return false;
        }
    }

    return true;
};
