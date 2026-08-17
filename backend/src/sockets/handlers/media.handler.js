import { requireRoomParticipant, updateMediaState, getParticipantSocketIds } from "../roomState.js";
import { validateMediaToggle } from "../middleware/socketValidator.js";
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
    if (!validateMediaToggle(socket, mediaType, isEnabled)) {
        return;
    }

    const participantCheck = requireRoomParticipant(socket);
    if (!participantCheck.ok) {
        return;
    }

    const { roomCode } = participantCheck;
    updateMediaState(roomCode, socket.id, mediaType, Boolean(isEnabled));

    const participantSocketIds = getParticipantSocketIds(roomCode);
    participantSocketIds.forEach((sId) => {
        if (sId !== socket.id) {
            io.to(sId).emit("user-media-state-changed", socket.id, mediaType, Boolean(isEnabled));
        }
    });
};
