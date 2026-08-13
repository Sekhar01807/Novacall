import io from "socket.io-client";
import server from "../../../environment";

class SocketService {
    socket = null;

    connect() {
        if (!this.socket) {
            this.socket = io.connect(server, { secure: false });
        }
        return this.socket;
    }

    joinCall(username) {
        if (this.socket) {
            this.socket.emit("join-call", window.location.href, username || "Participant");
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

    disconnect() {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }
}

export const socketService = new SocketService();
