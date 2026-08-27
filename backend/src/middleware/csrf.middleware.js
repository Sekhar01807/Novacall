import httpStatus from "http-status";
import { isOriginAllowed } from "../utils/allowedOrigins.js";
import { ERROR_CODES, formatErrorResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * Origin & CSRF Defense Middleware
 * 
 * Protects state-changing endpoints (POST, PUT, PATCH, DELETE) against Cross-Site Request Forgery (CSRF).
 * Because session cookies are configured with SameSite=None in production to support decoupled frontend
 * hosting, this middleware strictly verifies the request's Origin and Referer headers against the
 * authorized frontend origins list.
 */
export const csrfProtectionMiddleware = (req, res, next) => {
    // 1. Safe HTTP methods (GET, HEAD, OPTIONS) are idempotent and read-only
    if (SAFE_METHODS.has(req.method)) {
        return next();
    }

    const origin = req.headers.origin;
    const referer = req.headers.referer;
    const secFetchSite = req.headers["sec-fetch-site"];

    // 2. Explicit Cross-Site Fetch Check
    if (secFetchSite === "cross-site") {
        if (!origin || !isOriginAllowed(origin)) {
            logger.warn(`CSRF Defense: Blocked cross-site request from unapproved origin: ${origin || 'none'}`);
            return res.status(httpStatus.FORBIDDEN).json(
                formatErrorResponse(
                    "Cross-site request blocked: Unauthorized request origin.",
                    ERROR_CODES.FORBIDDEN,
                    req.id
                )
            );
        }
    }

    // 3. Direct Origin Header Validation
    if (origin) {
        if (!isOriginAllowed(origin)) {
            logger.warn(`CSRF Defense: Blocked state-changing request from unauthorized Origin: ${origin}`);
            return res.status(httpStatus.FORBIDDEN).json(
                formatErrorResponse(
                    "Cross-site request blocked: Unauthorized origin.",
                    ERROR_CODES.FORBIDDEN,
                    req.id
                )
            );
        }
        return next();
    }

    // 4. Fallback Referer Header Validation (if Origin header is omitted by browser)
    if (referer) {
        try {
            const refererOrigin = new URL(referer).origin;
            if (!isOriginAllowed(refererOrigin)) {
                logger.warn(`CSRF Defense: Blocked state-changing request from unauthorized Referer: ${referer}`);
                return res.status(httpStatus.FORBIDDEN).json(
                    formatErrorResponse(
                        "Cross-site request blocked: Unauthorized referer.",
                        ERROR_CODES.FORBIDDEN,
                        req.id
                    )
                );
            }
            return next();
        } catch (e) {
            logger.warn(`CSRF Defense: Blocked malformed Referer header: ${referer}`);
            return res.status(httpStatus.FORBIDDEN).json(
                formatErrorResponse(
                    "Cross-site request blocked: Malformed referer header.",
                    ERROR_CODES.FORBIDDEN,
                    req.id
                )
            );
        }
    }

    // 5. If both Origin and Referer are absent:
    // If request carries cookie authentication, browser requests MUST provide Origin or Referer.
    const hasAuthCookie = req.cookies && (req.cookies.token || req.cookies.jwt);
    if (hasAuthCookie && process.env.NODE_ENV === "production") {
        logger.warn("CSRF Defense: Blocked cookie-authenticated state-changing request missing Origin/Referer.");
        return res.status(httpStatus.FORBIDDEN).json(
            formatErrorResponse(
                "Cross-site request blocked: State-changing requests must include a valid Origin header.",
                ERROR_CODES.FORBIDDEN,
                req.id
            )
        );
    }

    // Non-browser / CLI / server-to-server requests without cookies proceed
    next();
};
