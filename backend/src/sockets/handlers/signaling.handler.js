import { requireRoomParticipant, isParticipant } from "../roomState.js";
import { validateSignal } from "../middleware/socketValidator.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle WebRTC signaling exchange (SDP offers/answers and ICE candidates)
 * Validates room membership and rate limits to ensure signaling is strictly contained within the same room.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} toId - Target socket ID
 * @param {string} message - Serialized SDP or ICE candidate
 */
export const handleSignal = (io, socket, toId, message) => {
    if (!validateSignal(socket, toId, message)) {
        return;
    }

    const participantCheck = requireRoomParticipant(socket);
    if (!participantCheck.ok) {
        logger.warn(`Rejected signaling from socket ${socket.id}: Sender is not in any active room.`);
        return;
    }

    const { roomCode } = participantCheck;

    // Verify recipient belongs to the exact same room
    if (!isParticipant(roomCode, toId)) {
        logger.warn(`Security violation: Socket ${socket.id} attempted to signal ${toId} outside room [${roomCode}].`);
        return;
    }

    // Forward signaling message directly to target peer
    io.to(toId).emit("signal", socket.id, message);
};
