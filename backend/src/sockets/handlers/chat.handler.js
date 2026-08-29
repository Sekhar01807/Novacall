import { requireRoomParticipant, addChatMessage, getParticipantSocketIds } from "../roomState.js";
import { validateChatMessage } from "../middleware/socketValidator.js";
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
 * Uses server-enforced sender identity, sliding-window rate limiting, hard 1000-character cap, and sanitizes against XSS.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} rawData - Text message content
 * @param {string} [untrustedSender] - Client supplied sender (ignored for authenticated identity)
 */
export const handleChatMessage = (io, socket, rawData, untrustedSender) => {
    if (!validateChatMessage(socket, rawData)) {
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

    // Enforce 1000-character cap on incoming message payload
    const messageText = (typeof rawData === "string" ? rawData : String(rawData || "")).trim().substring(0, 1000);

    const participantCheck = requireRoomParticipant(socket);
    if (!participantCheck.ok) {
        logger.warn(`Rejected chat message from ${socket.id}: User is not in an active room.`);
        socket.emit("error-message", {
            code: ERROR_CODES.NOT_IN_ROOM,
            message: "You must join a meeting room before sending messages."
        });
        return;
    }

    const { roomCode, room, participant } = participantCheck;

    // Enforce server-side authoritative display name (strictly prefer username over email address)
    let authoritativeSenderName = participant?.username || participant?.displayName || socket.user?.username || socket.user?.name || "Participant";
    if (typeof authoritativeSenderName === 'string' && authoritativeSenderName.includes('@')) {
        authoritativeSenderName = (socket.user?.username && !socket.user.username.includes('@')) 
            ? socket.user.username 
            : authoritativeSenderName.split('@')[0];
    }

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
