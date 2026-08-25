import httpStatus from "http-status";
import { ERROR_CODES, formatErrorResponse } from "../utils/errorCodes.js";
import { logger } from "../utils/logger.js";
import { ApiError } from "../utils/apiError.js";

/**
 * 404 Not Found Middleware Handler
 * Catches requests that do not match any defined application routes.
 */
export const notFoundHandler = (req, res, next) => {
    const error = ApiError.notFound(
        `Cannot ${req.method} ${req.originalUrl}`,
        ERROR_CODES.NOT_FOUND
    );
    next(error);
};

/**
 * Centralized Global Error-Handling Middleware
 * Standardizes error responses across all Express routes, handling custom ApiErrors,
 * Mongoose schema/cast errors, JSON syntax errors, and unexpected server failures.
 */
export const errorHandler = (err, req, res, next) => {
    let statusCode = err.statusCode || err.status || httpStatus.INTERNAL_SERVER_ERROR;
    let errorCode = err.code || ERROR_CODES.INTERNAL_SERVER_ERROR;
    let message = err.message || "Internal Server Error";
    let details = err.details || null;

    // Handle Mongoose Validation Errors
    if (err.name === "ValidationError") {
        statusCode = httpStatus.BAD_REQUEST;
        errorCode = ERROR_CODES.VALIDATION_ERROR;
        const messages = Object.values(err.errors || {}).map((e) => e.message);
        message = messages.length > 0 ? messages.join(", ") : "Database validation failed";
        details = err.errors;
    }

    // Handle Mongoose Cast Errors (e.g. invalid MongoDB ObjectId format)
    else if (err.name === "CastError") {
        statusCode = httpStatus.BAD_REQUEST;
        errorCode = ERROR_CODES.INVALID_PARAMETERS;
        message = `Invalid parameter value for '${err.path}': ${err.value}`;
    }

    // Handle MongoDB Duplicate Key (E11000)
    else if (err.code === 11000) {
        statusCode = httpStatus.CONFLICT;
        errorCode = ERROR_CODES.USER_EXISTS;
        const field = Object.keys(err.keyValue || {})[0] || "field";
        message = `An account or record with that ${field} already exists`;
    }

    // Handle JSON Payload Syntax Errors (Malformed Body)
    else if (err instanceof SyntaxError && err.status === 400 && "body" in err) {
        statusCode = httpStatus.BAD_REQUEST;
        errorCode = ERROR_CODES.INVALID_PAYLOAD;
        message = "Malformed JSON payload in request body";
    }

    // Handle JWT Verification Errors
    else if (err.name === "JsonWebTokenError") {
        statusCode = httpStatus.UNAUTHORIZED;
        errorCode = ERROR_CODES.AUTH_TOKEN_INVALID;
        message = "Invalid authentication token signature";
    }

    // Handle JWT Expiration Errors
    else if (err.name === "TokenExpiredError") {
        statusCode = httpStatus.UNAUTHORIZED;
        errorCode = ERROR_CODES.AUTH_TOKEN_INVALID;
        message = "Authentication session has expired. Please log in again.";
    }

    // Log the error details with request correlation metadata
    if (statusCode >= 500) {
        logger.error("Unhandled Application Error", {
            error: err.message,
            stack: err.stack,
            requestId: req?.id,
            path: req?.originalUrl || req?.url,
            method: req?.method
        });
    } else {
        logger.warn("Operational Client Error", {
            statusCode,
            errorCode,
            message,
            requestId: req?.id,
            path: req?.originalUrl || req?.url,
            method: req?.method
        });
    }

    // Production Data Sanitization: Never leak internal error traces on 500 errors
    const isProduction = process.env.NODE_ENV === "production";
    const clientMessage = (isProduction && statusCode === httpStatus.INTERNAL_SERVER_ERROR)
        ? "Internal Server Error"
        : message;

    // Send formatted JSON error response
    res.status(statusCode).json(
        formatErrorResponse(clientMessage, errorCode, req?.id, details)
    );
};
