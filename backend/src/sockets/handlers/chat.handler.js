import { findRoomBySocketId, addChatMessage, getParticipantSocketIds } from "../roomState.js";
import { logger } from "../../utils/logger.js";
import { ERROR_CODES } from "../../utils/errorCodes.js";

// Message Rate Limiting Configuration
// Maximum 5 messages within a 3-second sliding window per socket
const CHAT_RATE_LIMIT_WINDOW_MS = 3000;
const CHAT_MAX_MESSAGES_PER_WINDOW = 5;

// SocketId => Array of timestamps
const socketMessageTimestamps = new Map();

/**
 * Reset chat rate limiter for a specific socket or all sockets (for testing / cleanup)
 * @param {string} [socketId]
 */
export const resetChatRateLimits = (socketId = null) => {
    if (socketId) {
        socketMessageTimestamps.delete(socketId);
    } else {
        socketMessageTimestamps.clear();
    }
};

/**
 * Handle in-meeting real-time chat messages
 * Uses server-enforced sender identity, sliding-window rate limiting, and sanitizes against XSS.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} rawData - Text message content
 * @param {string} [untrustedSender] - Client supplied sender (ignored for authenticated identity)
 */
export const handleChatMessage = (io, socket, rawData, untrustedSender) => {
    if (!rawData || typeof rawData !== 'string' || !rawData.trim()) {
        return;
    }

    // 1. Enforce Per-Socket Chat Rate Limiting
    const now = Date.now();
    let timestamps = socketMessageTimestamps.get(socket.id) || [];
    // Keep only timestamps within the current sliding window
    timestamps = timestamps.filter(t => now - t < CHAT_RATE_LIMIT_WINDOW_MS);

    if (timestamps.length >= CHAT_MAX_MESSAGES_PER_WINDOW) {
        logger.warn(`Chat rate limit exceeded for socket ${socket.id}`);
        socket.emit("error-message", {
            code: ERROR_CODES.RATE_LIMIT_EXCEEDED,
            message: "You are sending messages too fast. Please slow down and try again.",
            retryAfterMs: Math.max(500, CHAT_RATE_LIMIT_WINDOW_MS - (now - timestamps[0]))
        });
        return;
    }

    timestamps.push(now);
    socketMessageTimestamps.set(socket.id, timestamps);

    // Limit maximum message length to prevent spam / payload abuse
    const messageText = rawData.trim().substring(0, 2000);

    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) {
        logger.warn(`Rejected chat message from ${socket.id}: User is not in an active room.`);
        socket.emit("error-message", {
            code: ERROR_CODES.NOT_IN_ROOM,
            message: "You must join a meeting room before sending messages."
        });
        return;
    }

    // Enforce server-side authoritative display name
    const participant = room.participants.get(socket.id);
    const authoritativeSenderName = participant?.displayName || socket.user?.name || socket.user?.username || "Participant";

    const messageObj = addChatMessage(roomCode, socket.id, authoritativeSenderName, messageText);
    if (!messageObj) return;

    // Broadcast to all participants in this room
    const participantSocketIds = getParticipantSocketIds(roomCode);
    participantSocketIds.forEach((sId) => {
        io.to(sId).emit(
            "chat-message",
            messageObj.data,
            messageObj.sender,
            socket.id,
            messageObj.timestamp
        );
    });
};
