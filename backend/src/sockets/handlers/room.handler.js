import {
    normalizeRoomCode,
    addParticipant,
    removeParticipant,
    findRoomBySocketId,
    getParticipantSocketIds,
    getParticipantNamesMap,
    getChatMessages,
    sanitizeHTML
} from "../roomState.js";
import { logger } from "../../utils/logger.js";
import { ERROR_CODES } from "../../utils/errorCodes.js";

/**
 * Handle user joining a video call room
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {string} roomCodeOrUrl
 * @param {string} [clientSuppliedName]
 */
export const handleJoinCall = (io, socket, roomCodeOrUrl, clientSuppliedName) => {
    const roomCode = normalizeRoomCode(roomCodeOrUrl);

    if (!roomCode) {
        logger.warn(`Rejected join-call from ${socket.id}: Invalid room code format.`);
        socket.emit("error-message", {
            code: ERROR_CODES.INVALID_ROOM_CODE,
            message: "Invalid meeting room code."
        });
        return;
    }

    // Leave any existing room this socket might have been in
    const existing = findRoomBySocketId(socket.id);
    if (existing.roomCode && existing.roomCode !== roomCode) {
        handleLeaveCall(io, socket);
    }

    // Determine authoritative display name
    // Authenticated users retain their server-verified name
    // Guests can provide a display name, which is sanitized
    const userToRegister = { ...socket.user };
    if (userToRegister.isGuest && clientSuppliedName && typeof clientSuppliedName === 'string') {
        const cleaned = sanitizeHTML(clientSuppliedName.trim());
        if (cleaned) {
            userToRegister.name = cleaned;
            userToRegister.username = cleaned;
        }
    }

    const joinResult = addParticipant(roomCode, socket.id, userToRegister);

    // Check if room capacity was exceeded
    if (joinResult && joinResult.error === "ROOM_CAPACITY_EXCEEDED") {
        logger.warn(`Rejected join-call from ${socket.id} to [${roomCode}]: Room capacity limit of ${joinResult.maxCapacity} reached.`);
        socket.emit("error-message", {
            code: ERROR_CODES.ROOM_CAPACITY_EXCEEDED,
            message: `This meeting room has reached its maximum capacity of ${joinResult.maxCapacity} participants.`,
            maxCapacity: joinResult.maxCapacity
        });
        return;
    }

    if (!joinResult || !joinResult.participant) {
        socket.emit("error-message", {
            code: ERROR_CODES.ROOM_JOIN_FAILED,
            message: "Unable to join the specified meeting room."
        });
        return;
    }

    const { isHost } = joinResult;

    // Join the Socket.IO room channel
    socket.join(roomCode);

    // 1. Emit host status to the joining user
    socket.emit("host-status", {
        isHost,
        roomCode,
        userId: userToRegister.id
    });

    // 2. Broadcast user-joined to all participants in this specific room
    const participantSocketIds = getParticipantSocketIds(roomCode);
    const roomNamesMap = getParticipantNamesMap(roomCode);

    participantSocketIds.forEach((sId) => {
        io.to(sId).emit("user-joined", socket.id, participantSocketIds, roomNamesMap);
    });

    // 3. Replay room chat history to the newly joined participant
    const messages = getChatMessages(roomCode);
    messages.forEach((msg) => {
        socket.emit(
            "chat-message",
            msg.data,
            msg.sender,
            msg['socket-id-sender'],
            msg.timestamp
        );
    });

    logger.info(`User ${userToRegister.name} (${socket.id}) joined room [${roomCode}] (Host: ${isHost})`);
};

/**
 * Handle socket disconnect
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export const handleDisconnect = (io, socket) => {
    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) {
        logger.info(`Socket disconnected without active room: ${socket.id}`);
        return;
    }

    const { removedParticipant, newHostSocketId, roomDeleted } = removeParticipant(roomCode, socket.id);
    socket.leave(roomCode);

    if (removedParticipant) {
        logger.info(`Participant ${removedParticipant.displayName} (${socket.id}) left room [${roomCode}]`);
    }

    if (roomDeleted) {
        logger.info(`Room [${roomCode}] is now empty and has been completely purged from memory.`);
        return;
    }

    // Broadcast user-left to remaining participants in the room
    const remainingSockets = getParticipantSocketIds(roomCode);
    remainingSockets.forEach((sId) => {
        io.to(sId).emit("user-left", socket.id);
    });

    // If host changed, notify the promoted participant and the room
    if (newHostSocketId) {
        io.to(newHostSocketId).emit("host-status", { isHost: true, roomCode });
        logger.info(`Promoted participant (${newHostSocketId}) to new host for room [${roomCode}]`);
    }
};

/**
 * Handle participant leaving a call explicitly
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
export const handleLeaveCall = (io, socket) => {
    handleDisconnect(io, socket);
};
