import { findRoomBySocketId, updateMediaState, getParticipantSocketIds } from "../roomState.js";
import { logger } from "../../utils/logger.js";

/**
 * Handle audio / video mute state toggling
 * Synchronizes media state with all other peers in the room.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 * @param {'audio'|'video'} mediaType
 * @param {boolean} isEnabled
 */
export const handleToggleMediaState = (io, socket, mediaType, isEnabled) => {
    if (mediaType !== 'audio' && mediaType !== 'video') {
        return;
    }

    const { roomCode, room } = findRoomBySocketId(socket.id);
    if (!roomCode || !room) {
        return;
    }

    updateMediaState(roomCode, socket.id, mediaType, Boolean(isEnabled));

    const participantSocketIds = getParticipantSocketIds(roomCode);
    participantSocketIds.forEach((sId) => {
        if (sId !== socket.id) {
            io.to(sId).emit("user-media-state-changed", socket.id, mediaType, Boolean(isEnabled));
        }
    });
};
