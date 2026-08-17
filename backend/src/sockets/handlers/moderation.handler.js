import {
    findRoomBySocketId,
    isHost,
    isParticipant,
    removeParticipant,
    deleteRoom,
    getParticipantSocketIds
} from "../roomState.js";
import { logger } from "../../utils/logger.js";
import { ERROR_CODES } from "../../utils/errorCodes.js";

/**
 * Mute a specific participant's microphone (Server-side Host Validated)
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} targetSocketId
 */
export const handleHostMute = (io, socket, targetSocketId) => {
    if (!targetSocketId || typeof targetSocketId !== 'string') return;

    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) return;

    // Check host authority
    if (!isHost(roomCode, socket.id)) {
        logger.warn(`Security rejection: Non-host ${socket.id} attempted to mute participant ${targetSocketId} in room [${roomCode}]`);
        socket.emit("error-message", {
            code: ERROR_CODES.UNAUTHORIZED_HOST_ACTION,
            message: "Host authorization required to mute participants."
        });
        return;
    }

    // Verify target belongs to the same room
    if (!isParticipant(roomCode, targetSocketId)) {
        logger.warn(`Target ${targetSocketId} is not in room [${roomCode}]`);
        return;
    }

    io.to(targetSocketId).emit("force-mute-audio");
    logger.info(`Host (${socket.id}) muted participant (${targetSocketId}) in room [${roomCode}]`);
};

/**
 * Remove / kick a participant from the meeting room (Server-side Host Validated)
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} targetSocketId
 */
export const handleHostKick = (io, socket, targetSocketId) => {
    if (!targetSocketId || typeof targetSocketId !== 'string') return;

    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) return;

    // Check host authority
    if (!isHost(roomCode, socket.id)) {
        logger.warn(`Security rejection: Non-host ${socket.id} attempted to kick participant ${targetSocketId} in room [${roomCode}]`);
        socket.emit("error-message", {
            code: ERROR_CODES.UNAUTHORIZED_HOST_ACTION,
            message: "Host authorization required to remove participants."
        });
        return;
    }

    // Cannot kick self via kick handler
    if (targetSocketId === socket.id) {
        return;
    }

    // Verify target belongs to the same room
    if (!isParticipant(roomCode, targetSocketId)) {
        logger.warn(`Target ${targetSocketId} is not in room [${roomCode}]`);
        return;
    }

    // 1. Notify kicked target
    io.to(targetSocketId).emit("force-kicked-out");

    // 2. Remove from room state
    const { removedParticipant } = removeParticipant(roomCode, targetSocketId);

    // 3. Disconnect target's socket room channel
    const targetSocket = io.sockets.sockets.get(targetSocketId);
    if (targetSocket) {
        targetSocket.leave(roomCode);
    }

    // 4. Notify remaining participants
    const remainingSockets = getParticipantSocketIds(roomCode);
    remainingSockets.forEach((sId) => {
        io.to(sId).emit("user-left", targetSocketId);
    });

    logger.info(`Host (${socket.id}) kicked participant ${removedParticipant?.displayName || targetSocketId} from room [${roomCode}]`);
};

/**
 * End meeting for all participants (Server-side Host Validated)
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export const handleEndMeeting = (io, socket) => {
    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) return;

    // Check host authority
    if (!isHost(roomCode, socket.id)) {
        logger.warn(`Security rejection: Non-host ${socket.id} attempted to end meeting for room [${roomCode}]`);
        socket.emit("error-message", {
            code: ERROR_CODES.UNAUTHORIZED_HOST_ACTION,
            message: "Host authorization required to end meeting for all."
        });
        return;
    }

    const participantSocketIds = getParticipantSocketIds(roomCode);

    // Broadcast meeting termination to all participants
    participantSocketIds.forEach((sId) => {
        io.to(sId).emit("meeting-ended-by-host");
        const peerSocket = io.sockets.sockets.get(sId);
        if (peerSocket) {
            peerSocket.leave(roomCode);
        }
    });

    // Destroy room from state
    deleteRoom(roomCode);
    logger.info(`Host (${socket.id}) ended meeting for all participants in room [${roomCode}]`);
};
