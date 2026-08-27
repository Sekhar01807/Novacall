import { verifyJWT } from "../../utils/jwt.js";
import { sanitizeHTML } from "../roomState.js";
import { logger } from "../../utils/logger.js";

/**
 * Socket.IO Authentication Middleware
 * Validates JWT access token on handshake.
 * Authoritative user identity is attached to socket.user and CANNOT be spoofed by client-emitted payloads.
 */
export const socketAuthMiddleware = (socket, next) => {
    try {
        // 1. Check token in auth object
        let token = socket.handshake.auth?.token;

        // 2. Check token in session cookies (HttpOnly cookie sent during handshake)
        if (!token && socket.handshake.headers?.cookie) {
            const rawCookie = socket.handshake.headers.cookie;
            const match = rawCookie.match(/(?:^|;\s*)(?:token|jwt)=([^;]+)/);
            if (match) {
                token = decodeURIComponent(match[1]);
            }
        }

        // 3. Also check authorization header if not in auth or cookie
        if (!token && socket.handshake.headers?.authorization) {
            const authHeader = socket.handshake.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                token = authHeader;
            }
        }

        // 4. Check query param as last resort fallback
        if (!token && socket.handshake.query?.token) {
            token = socket.handshake.query.token;
        }

        const guestName = socket.handshake.auth?.guestName || socket.handshake.query?.guestName;

        if (token) {
            const decoded = verifyJWT(token);
            if (!decoded) {
                logger.warn(`Socket authentication failed for client ${socket.id}: Invalid/expired token`);
                return next(new Error("AUTH_INVALID_TOKEN"));
            }

            // Authenticated user with server-verified credentials
            socket.user = {
                id: decoded.id || decoded._id,
                username: sanitizeHTML(decoded.username || "User"),
                name: sanitizeHTML(decoded.name || decoded.username || "User"),
                email: decoded.email || "",
                isGuest: false
            };
            logger.info(`Socket authenticated: ${socket.user.username} (${socket.id})`);
            return next();
        }

        // Guest user fallback (explicitly marked as guest)
        const cleanGuestName = guestName ? sanitizeHTML(String(guestName).trim()) : "Guest";
        socket.user = {
            id: `guest_${socket.id}`,
            username: cleanGuestName || "Guest",
            name: cleanGuestName || "Guest",
            email: "",
            isGuest: true
        };
        logger.info(`Socket connected as Guest: ${socket.user.name} (${socket.id})`);
        return next();

    } catch (error) {
        logger.error(`Socket auth error for ${socket.id}:`, error);
        return next(new Error("AUTH_ERROR"));
    }
};
