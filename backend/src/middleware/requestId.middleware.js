import crypto from "node:crypto";

/**
 * Request ID & Correlation ID Middleware
 * Assigns a unique correlation ID to every incoming HTTP request and sets the response headers.
 */
export const requestIdMiddleware = (req, res, next) => {
    // Check if client supplied a request ID or correlation ID
    const incomingId = req.headers["x-request-id"] || req.headers["x-correlation-id"];
    const requestId = typeof incomingId === "string" && incomingId.trim() ? incomingId.trim() : crypto.randomUUID();

    req.id = requestId;
    req.correlationId = requestId;

    res.setHeader("X-Request-Id", requestId);
    res.setHeader("X-Correlation-Id", requestId);

    next();
};
