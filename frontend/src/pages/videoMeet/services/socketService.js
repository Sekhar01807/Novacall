import io from "socket.io-client";
import server from "../../../environment";

class SocketService {
    socket = null;
    lastPingTimestamp = null;
    currentLatency = 20;

    /**
     * Connect to the Socket.IO server with JWT token authentication, guest fallback, and robust reconnection
     * @param {string} [customToken]
     * @param {string} [guestDisplayName]
     * @returns {import('socket.io-client').Socket}
     */
    connect(customToken, guestDisplayName) {
        if (!this.socket) {
            const guestName = guestDisplayName || localStorage.getItem("guestDisplayName") || "Guest";

            this.socket = io(server, {
                withCredentials: true,
                auth: {
                    ...(customToken ? { token: customToken } : {}),
                    guestName: guestName
                },
                reconnection: true,
                reconnectionAttempts: 10,
                reconnectionDelay: 1000,
                reconnectionDelayMax: 5000,
                randomizationFactor: 0.5,
                timeout: 15000,
                transports: ["websocket", "polling"]
            });

            // Periodically measure socket heartbeat roundtrip latency
            this.socket.on("ping", () => {
                this.lastPingTimestamp = Date.now();
            });

            this.socket.on("pong", (latency) => {
                if (typeof latency === "number") {
                    this.currentLatency = latency;
                } else if (this.lastPingTimestamp) {
                    this.currentLatency = Date.now() - this.lastPingTimestamp;
                }
            });
        }
        return this.socket;
    }

    /**
     * Get current measured socket ping latency in ms
     * @returns {number}
     */
    getSocketLatency() {
        return this.currentLatency;
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
