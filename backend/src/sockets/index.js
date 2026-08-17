import { Server } from "socket.io";
import { socketAuthMiddleware } from "./middleware/socketAuth.middleware.js";
import { handleJoinCall, handleDisconnect, handleLeaveCall } from "./handlers/room.handler.js";
import { handleSignal } from "./handlers/signaling.handler.js";
import { handleChatMessage } from "./handlers/chat.handler.js";
import { handleToggleMediaState } from "./handlers/media.handler.js";
import { handleHostMute, handleHostKick, handleEndMeeting } from "./handlers/moderation.handler.js";
import { logger } from "../utils/logger.js";

/**
 * Initialize Socket.IO Server with JWT authentication & modular event routing
 * @param {import('node:http').Server} server
 * @param {Object} [options]
 * @returns {import('socket.io').Server}
 */
export const initializeSocketIO = (server, options = {}) => {
    const rawOrigins = process.env.FRONTEND_URL || "*";
    const allowedOrigins = rawOrigins.includes(",") ? rawOrigins.split(",").map(o => o.trim()) : rawOrigins;

    const io = new Server(server, {
        cors: {
            origin: allowedOrigins,
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        },
        ...options
    });

    // 1. Socket Authentication Middleware (Verifies JWT or assigns guest)
    io.use(socketAuthMiddleware);

    // 2. Connection and Event Dispatching
    io.on("connection", (socket) => {
        logger.info(`Client connected: ${socket.id} (User: ${socket.user?.name || 'Guest'})`);

        // Room Membership & Lifecycle
        socket.on("join-call", (path, username) => {
            handleJoinCall(io, socket, path, username);
        });

        socket.on("leave-call", () => {
            handleLeaveCall(io, socket);
        });

        // WebRTC Signaling
        socket.on("signal", (toId, message) => {
            handleSignal(io, socket, toId, message);
        });

        // In-Meeting Real-Time Chat
        socket.on("chat-message", (data, sender) => {
            handleChatMessage(io, socket, data, sender);
        });

        // Media State Sync (Mic & Camera Toggling)
        socket.on("toggle-media-state", (mediaType, isEnabled) => {
            handleToggleMediaState(io, socket, mediaType, isEnabled);
        });

        // Host Moderation Actions (Server-Side Authorized)
        socket.on("host-mute-user", (targetSocketId) => {
            handleHostMute(io, socket, targetSocketId);
        });

        socket.on("host-kick-user", (targetSocketId) => {
            handleHostKick(io, socket, targetSocketId);
        });

        socket.on("end-meeting-all", () => {
            handleEndMeeting(io, socket);
        });

        // Disconnection & Room Cleanup
        socket.on("disconnect", () => {
            handleDisconnect(io, socket);
        });
    });

    return io;
};
