import mongoose from "mongoose";
import { User } from "../../models/UserModel.js";
import { verifyJWT } from "../../utils/jwt.js";
import { sanitizeHTML } from "../roomState.js";
import { logger } from "../../utils/logger.js";

/**
 * Optional in-memory mock resolver for testing environments
 */
let mockUserResolver = null;
export const setMockUserResolver = (resolver) => {
    mockUserResolver = resolver;
};

/**
 * Socket.IO Authentication Middleware
 * Validates JWT access token on handshake via session cookies, auth payload, or authorization header.
 * Query parameter tokens are strictly disallowed to prevent credential leakage in URLs/logs.
 * Enforces database-backed tokenVersion checking for instant session revocation parity with HTTP auth.
 */
export const socketAuthMiddleware = async (socket, next) => {
    try {
        // 1. Check token in auth object
        let token = socket.handshake.auth?.token;
        const isExplicitToken = Boolean(token);
        const allowGuestFallback = socket.handshake.auth?.allowGuestFallback !== false;

        // 2. Check token in session cookies (HttpOnly cookie sent during handshake)
        let isCookieToken = false;
        if (!token && socket.handshake.headers?.cookie) {
            const rawCookie = socket.handshake.headers.cookie;
            const match = rawCookie.match(/(?:^|;\s*)(?:token|jwt)=([^;]+)/);
            if (match) {
                token = decodeURIComponent(match[1]);
                isCookieToken = true;
            }
        }

        // 3. Check authorization header if not in auth or cookie
        if (!token && socket.handshake.headers?.authorization) {
            const authHeader = socket.handshake.headers.authorization;
            if (authHeader.startsWith("Bearer ")) {
                token = authHeader.substring(7);
            } else {
                token = authHeader;
            }
        }

        // NOTE: Handshake query parameter tokens (socket.handshake.query?.token) are explicitly
        // DISALLOWED and ignored to prevent sensitive credentials from leaking through URLs,
        // browser histories, reverse proxy logs, or debugging traces.

        const guestName = socket.handshake.auth?.guestName || socket.handshake.query?.guestName;

        // Helper to fallback to guest user session
        const proceedAsGuest = (reason) => {
            const cleanGuestName = guestName ? sanitizeHTML(String(guestName).trim()) : "Guest";
            socket.user = {
                id: `guest_${socket.id}`,
                username: cleanGuestName || "Guest",
                name: cleanGuestName || "Guest",
                email: "",
                isGuest: true,
                sessionExpired: Boolean(reason && reason !== "no_token")
            };
            logger.info(`Socket connected as Guest (${reason || "standard"}): ${socket.user.name} (${socket.id})`);
            return next();
        };

        if (token) {
            const decoded = verifyJWT(token);
            if (!decoded) {
                logger.warn(`Socket authentication failed for client ${socket.id}: Invalid/expired token`);
                if (isCookieToken || (allowGuestFallback && !isExplicitToken)) {
                    return proceedAsGuest("cookie_token_invalid");
                }
                return next(new Error("AUTH_INVALID_TOKEN"));
            }

            let resolvedUsername = decoded.username || "User";
            let resolvedName = decoded.name || decoded.username || "User";

            // Enforce tokenVersion revocation check against database (or test resolver)
            if (typeof mockUserResolver === "function") {
                const mockUser = await mockUserResolver(decoded.id || decoded._id || decoded.username);
                if (!mockUser) {
                    logger.warn(`Socket authentication failed for client ${socket.id}: User account not found`);
                    if (isCookieToken || (allowGuestFallback && !isExplicitToken)) {
                        return proceedAsGuest("user_not_found");
                    }
                    return next(new Error("AUTH_USER_NOT_FOUND"));
                }
                const expectedVersion = mockUser.tokenVersion || 0;
                const tokenVersion = decoded.tokenVersion ?? 0;
                if (tokenVersion < expectedVersion) {
                    logger.warn(`Socket authentication rejected for client ${socket.id}: Session revoked (tokenVersion ${tokenVersion} < expected ${expectedVersion})`);
                    if (isCookieToken || (allowGuestFallback && !isExplicitToken)) {
                        return proceedAsGuest("session_revoked");
                    }
                    return next(new Error("AUTH_SESSION_REVOKED"));
                }
                if (mockUser.username) resolvedUsername = mockUser.username;
                if (mockUser.name) resolvedName = mockUser.name;
            } else if (mongoose.connection.readyState === 1) {
                const user = await User.findById(decoded.id || decoded._id).select("tokenVersion username name email");
                if (!user) {
                    logger.warn(`Socket authentication failed for client ${socket.id}: User account not found`);
                    if (isCookieToken || (allowGuestFallback && !isExplicitToken)) {
                        return proceedAsGuest("user_not_found");
                    }
                    return next(new Error("AUTH_USER_NOT_FOUND"));
                }
                const expectedVersion = user.tokenVersion || 0;
                const tokenVersion = decoded.tokenVersion ?? 0;
                if (tokenVersion < expectedVersion) {
                    logger.warn(`Socket authentication rejected for client ${socket.id}: Session revoked (tokenVersion ${tokenVersion} < expected ${expectedVersion})`);
                    if (isCookieToken || (allowGuestFallback && !isExplicitToken)) {
                        return proceedAsGuest("session_revoked");
                    }
                    return next(new Error("AUTH_SESSION_REVOKED"));
                }
                if (user.username) resolvedUsername = user.username;
                if (user.name) resolvedName = user.name;
            }

            // Authenticated user with server-verified credentials
            socket.user = {
                id: decoded.id || decoded._id,
                username: sanitizeHTML(resolvedUsername || "User"),
                name: sanitizeHTML(resolvedName || resolvedUsername || "User"),
                email: decoded.email || "",
                tokenVersion: decoded.tokenVersion ?? 0,
                isGuest: false
            };
            logger.info(`Socket authenticated: ${socket.user.username} (${socket.id})`);
            return next();
        }

        // Guest user fallback (explicitly marked as guest or no credentials provided)
        return proceedAsGuest("no_token");

    } catch (error) {
        logger.error(`Socket auth error for ${socket.id}:`, error);
        return next(new Error("AUTH_ERROR"));
    }
};
