/**
 * Standard Error Codes Dictionary for NovaCall REST API & Socket.IO Events
 */
export const ERROR_CODES = {
    // Validation & Input Errors
    VALIDATION_ERROR: "VALIDATION_ERROR",
    INVALID_PARAMETERS: "INVALID_PARAMETERS",
    INVALID_PAYLOAD: "INVALID_PAYLOAD",

    // Authentication & Authorization Errors
    AUTH_TOKEN_REQUIRED: "AUTH_TOKEN_REQUIRED",
    AUTH_TOKEN_INVALID: "AUTH_TOKEN_INVALID",
    AUTH_SESSION_REVOKED: "AUTH_SESSION_REVOKED",
    AUTH_USER_NOT_FOUND: "AUTH_USER_NOT_FOUND",
    AUTH_INVALID_CREDENTIALS: "AUTH_INVALID_CREDENTIALS",
    USER_EXISTS: "USER_EXISTS",
    UNAUTHORIZED: "UNAUTHORIZED",
    FORBIDDEN: "FORBIDDEN",
    INVALID_CODE: "INVALID_CODE",
    TOO_MANY_ATTEMPTS: "TOO_MANY_ATTEMPTS",

    // Room & Call Management Errors
    INVALID_ROOM_CODE: "INVALID_ROOM_CODE",
    ROOM_JOIN_FAILED: "ROOM_JOIN_FAILED",
    ROOM_NOT_FOUND: "ROOM_NOT_FOUND",
    ROOM_CAPACITY_EXCEEDED: "ROOM_CAPACITY_EXCEEDED",
    UNAUTHORIZED_HOST_ACTION: "UNAUTHORIZED_HOST_ACTION",
    NOT_IN_ROOM: "NOT_IN_ROOM",

    // Rate Limiting Errors
    RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",

    // Resource & Generic Server Errors
    NOT_FOUND: "NOT_FOUND",
    INTERNAL_SERVER_ERROR: "INTERNAL_SERVER_ERROR",
    SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE"
};

/**
 * Format a standardized JSON error response object
 * @param {string} message - Human readable error message
 * @param {string} code - Structured error code
 * @param {string} [requestId] - Correlation request ID
 * @param {Object} [details] - Additional error details/metadata
 * @returns {Object}
 */
export const formatErrorResponse = (message, code = ERROR_CODES.INTERNAL_SERVER_ERROR, requestId = null, details = null) => {
    const payload = {
        success: false,
        message: message || "An unexpected error occurred",
        code: code
    };

    if (requestId) {
        payload.requestId = requestId;
    }

    if (details && typeof details === 'object') {
        payload.details = details;
    }

    return payload;
};

/**
 * Format a standardized JSON success response object
 * @param {any} data - Response payload or message
 * @param {string} [message] - Optional human readable message
 * @param {string} [requestId] - Correlation request ID
 * @param {Object} [meta] - Optional pagination or metadata
 * @returns {Object}
 */
export const formatSuccessResponse = (data, message = null, requestId = null, meta = null) => {
    const payload = {
        success: true
    };

    if (message) {
        payload.message = message;
    }

    if (requestId) {
        payload.requestId = requestId;
    }

    if (meta && typeof meta === 'object') {
        Object.assign(payload, meta);
    }

    if (data !== undefined && data !== null) {
        if (typeof data === 'object' && !Array.isArray(data) && !message) {
            Object.assign(payload, data);
        } else {
            payload.data = data;
        }
    }

    return payload;
};
