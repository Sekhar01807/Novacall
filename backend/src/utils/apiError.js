import httpStatus from "http-status";
import { ERROR_CODES } from "./errorCodes.js";

/**
 * Custom Operational API Error Class
 * Extends the native JavaScript Error with HTTP status codes, structured error codes,
 * and operational flags for centralized error handling middleware.
 */
export class ApiError extends Error {
    /**
     * @param {number} statusCode - HTTP status code (e.g., 400, 401, 403, 404, 409, 429, 500)
     * @param {string} message - Human-readable error description
     * @param {string} [code=ERROR_CODES.INTERNAL_SERVER_ERROR] - Structured error code string
     * @param {Object|Array|null} [details=null] - Additional validation or contextual error metadata
     * @param {boolean} [isOperational=true] - Distinguishes operational errors from programmer bugs
     */
    constructor(
        statusCode = httpStatus.INTERNAL_SERVER_ERROR,
        message = "An unexpected error occurred",
        code = ERROR_CODES.INTERNAL_SERVER_ERROR,
        details = null,
        isOperational = true
    ) {
        super(message);
        this.name = this.constructor.name;
        this.statusCode = statusCode;
        this.code = code;
        this.details = details;
        this.isOperational = isOperational;

        if (Error.captureStackTrace) {
            Error.captureStackTrace(this, this.constructor);
        }
    }

    /**
     * Convenience factory for 400 Bad Request
     */
    static badRequest(message = "Bad Request", code = ERROR_CODES.VALIDATION_ERROR, details = null) {
        return new ApiError(httpStatus.BAD_REQUEST, message, code, details);
    }

    /**
     * Convenience factory for 401 Unauthorized
     */
    static unauthorized(message = "Unauthorized", code = ERROR_CODES.UNAUTHORIZED, details = null) {
        return new ApiError(httpStatus.UNAUTHORIZED, message, code, details);
    }

    /**
     * Convenience factory for 403 Forbidden
     */
    static forbidden(message = "Forbidden", code = ERROR_CODES.FORBIDDEN, details = null) {
        return new ApiError(httpStatus.FORBIDDEN, message, code, details);
    }

    /**
     * Convenience factory for 404 Not Found
     */
    static notFound(message = "Resource not found", code = ERROR_CODES.NOT_FOUND, details = null) {
        return new ApiError(httpStatus.NOT_FOUND, message, code, details);
    }

    /**
     * Convenience factory for 409 Conflict
     */
    static conflict(message = "Resource conflict", code = ERROR_CODES.USER_EXISTS, details = null) {
        return new ApiError(httpStatus.CONFLICT, message, code, details);
    }

    /**
     * Convenience factory for 429 Too Many Requests
     */
    static tooManyRequests(message = "Too many requests", code = ERROR_CODES.RATE_LIMIT_EXCEEDED, details = null) {
        return new ApiError(httpStatus.TOO_MANY_REQUESTS, message, code, details);
    }

    /**
     * Convenience factory for 500 Internal Server Error
     */
    static internal(message = "Internal Server Error", code = ERROR_CODES.INTERNAL_SERVER_ERROR, details = null) {
        return new ApiError(httpStatus.INTERNAL_SERVER_ERROR, message, code, details, false);
    }
}

/**
 * Higher-order utility to wrap asynchronous Express route handlers and middleware.
 * Automatically catches rejected promises and forwards them to the centralized error middleware.
 * 
 * @param {Function} fn - Async express route handler (req, res, next) => Promise<any>
 * @returns {Function} Express middleware handler
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};
