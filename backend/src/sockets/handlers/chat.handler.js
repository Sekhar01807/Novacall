import { findRoomBySocketId, addChatMessage, getParticipantSocketIds } from "../roomState.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle in-meeting real-time chat messages
 * Uses server-enforced sender identity to prevent impersonation and sanitizes against XSS.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} rawData - Text message content
 * @param {string} [untrustedSender] - Client supplied sender (ignored for authenticated identity)
 */
export const handleChatMessage = (io, socket, rawData, untrustedSender) => {
    if (!rawData || typeof rawData !== 'string' || !rawData.trim()) {
        return;
    }

    // Limit maximum message length to prevent spam / payload abuse
    const messageText = rawData.trim().substring(0, 2000);

    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) {
        logger.warn(`Rejected chat message from ${socket.id}: User is not in an active room.`);
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
