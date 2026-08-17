import io from "socket.io-client";
import server from "../../../environment";

class SocketService {
    socket = null;

    /**
     * Connect to the Socket.IO server with JWT token authentication and guest fallback
     * @param {string} [customToken]
     * @param {string} [guestDisplayName]
     * @returns {import('socket.io-client').Socket}
     */
    connect(customToken, guestDisplayName) {
        if (!this.socket) {
            const token = customToken || localStorage.getItem("token") || null;
            const guestName = guestDisplayName || localStorage.getItem("guestDisplayName") || "Guest";

            this.socket = io(server, {
                auth: {
                    token: token,
                    guestName: guestName
                },
                reconnection: true,
                reconnectionAttempts: 5,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                timeout: 10000,
                transports: ["websocket", "polling"]
            });
        }
        return this.socket;
    }

    /**
     * Join a call room
     * @param {string} roomCodeOrUrl
     * @param {string} displayName
     */
    joinCall(roomCodeOrUrl, displayName) {
        if (this.socket) {
            const target = roomCodeOrUrl || window.location.pathname.replace(/^\/+/, '');
            this.socket.emit("join-call", target, displayName || "Participant");
        }
    }

    sendSignal(toId, message) {
        if (this.socket) {
            this.socket.emit("signal", toId, message);
        }
    }

    sendChatMessage(data, sender) {
        if (this.socket) {
            this.socket.emit("chat-message", data, sender);
        }
    }

    toggleMediaState(mediaType, isEnabled) {
        if (this.socket) {
            this.socket.emit("toggle-media-state", mediaType, isEnabled);
        }
    }

    hostMuteUser(targetSocketId) {
        if (this.socket) {
            this.socket.emit("host-mute-user", targetSocketId);
        }
    }

    hostKickUser(targetSocketId) {
        if (this.socket) {
            this.socket.emit("host-kick-user", targetSocketId);
        }
    }

    endMeetingAll() {
        if (this.socket) {
            this.socket.emit("end-meeting-all");
        }
    }

    leaveCall() {
        if (this.socket) {
            this.socket.emit("leave-call");
        }
    }

    removeAllListeners() {
        if (this.socket) {
            this.socket.removeAllListeners();
        }
    }

    disconnect() {
        if (this.socket) {
            this.socket.removeAllListeners();
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
