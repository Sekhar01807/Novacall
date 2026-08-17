import { findRoomBySocketId, isParticipant } from "../roomState.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle WebRTC signaling exchange (SDP offers/answers and ICE candidates)
 * Validates room membership to ensure signaling is strictly contained within the same room.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} toId - Target socket ID
 * @param {string} message - Serialized SDP or ICE candidate
 */
export const handleSignal = (io, socket, toId, message) => {
    if (!toId || typeof toId !== 'string' || !message) {
        return;
    }

    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) {
        logger.warn(`Rejected signaling from socket ${socket.id}: Sender is not in any room.`);
        return;
    }

    // Verify recipient belongs to the exact same room
    if (!isParticipant(roomCode, toId)) {
        logger.warn(`Security violation: Socket ${socket.id} attempted to signal ${toId} outside room [${roomCode}].`);
        return;
    }

    // Forward signaling message directly to target peer
    io.to(toId).emit("signal", socket.id, message);
};
