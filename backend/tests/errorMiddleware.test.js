import { test, describe } from "node:test";
import assert from "node:assert/strict";
import httpStatus from "http-status";
import { ApiError, asyncHandler } from "../src/utils/apiError.js";
import { errorHandler, notFoundHandler } from "../src/middleware/error.middleware.js";
import { ERROR_CODES } from "../src/utils/errorCodes.js";

/**
 * Mock Express Response helper for unit testing middleware
 */
const createMockRes = () => {
    const res = {
        statusCode: 200,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.body = payload;
            return this;
        }
    };
    return res;
};

describe("Centralized Error Handling Architecture", () => {
    describe("ApiError Class & Helper Factories", () => {
        test("creates default ApiError instance", () => {
            const err = new ApiError(400, "Bad input", ERROR_CODES.VALIDATION_ERROR, { field: "email" });
            assert.strictEqual(err.statusCode, 400);
            assert.strictEqual(err.message, "Bad input");
            assert.strictEqual(err.code, ERROR_CODES.VALIDATION_ERROR);
            assert.deepStrictEqual(err.details, { field: "email" });
            assert.strictEqual(err.isOperational, true);
            assert.ok(err.stack);
        });

        test("badRequest() static factory", () => {
            const err = ApiError.badRequest("Invalid query parameter", ERROR_CODES.INVALID_PARAMETERS);
            assert.strictEqual(err.statusCode, httpStatus.BAD_REQUEST);
            assert.strictEqual(err.message, "Invalid query parameter");
            assert.strictEqual(err.code, ERROR_CODES.INVALID_PARAMETERS);
        });

        test("unauthorized() static factory", () => {
            const err = ApiError.unauthorized("Authentication required", ERROR_CODES.AUTH_TOKEN_REQUIRED);
            assert.strictEqual(err.statusCode, httpStatus.UNAUTHORIZED);
            assert.strictEqual(err.code, ERROR_CODES.AUTH_TOKEN_REQUIRED);
        });

        test("forbidden() static factory", () => {
            const err = ApiError.forbidden("Access denied", ERROR_CODES.FORBIDDEN);
            assert.strictEqual(err.statusCode, httpStatus.FORBIDDEN);
            assert.strictEqual(err.code, ERROR_CODES.FORBIDDEN);
        });

        test("notFound() static factory", () => {
            const err = ApiError.notFound("User not found", ERROR_CODES.NOT_FOUND);
            assert.strictEqual(err.statusCode, httpStatus.NOT_FOUND);
            assert.strictEqual(err.code, ERROR_CODES.NOT_FOUND);
        });

        test("conflict() static factory", () => {
            const err = ApiError.conflict("Email taken", ERROR_CODES.USER_EXISTS);
            assert.strictEqual(err.statusCode, httpStatus.CONFLICT);
            assert.strictEqual(err.code, ERROR_CODES.USER_EXISTS);
        });

        test("tooManyRequests() static factory", () => {
            const err = ApiError.tooManyRequests("Rate limit reached", ERROR_CODES.RATE_LIMIT_EXCEEDED);
            assert.strictEqual(err.statusCode, httpStatus.TOO_MANY_REQUESTS);
            assert.strictEqual(err.code, ERROR_CODES.RATE_LIMIT_EXCEEDED);
        });

        test("internal() static factory sets isOperational to false", () => {
            const err = ApiError.internal("Database crashed");
            assert.strictEqual(err.statusCode, httpStatus.INTERNAL_SERVER_ERROR);
            assert.strictEqual(err.isOperational, false);
        });
    });

    describe("asyncHandler Wrapper", () => {
        test("executes successful async route handler normally", async () => {
            let executed = false;
            const handler = asyncHandler(async (req, res) => {
                executed = true;
                res.status(200).json({ ok: true });
            });

            const req = {};
            const res = createMockRes();
            let nextCalled = false;

            handler(req, res, () => { nextCalled = true; });
            await new Promise(r => setTimeout(r, 10));

            assert.strictEqual(executed, true);
            assert.strictEqual(res.statusCode, 200);
            assert.strictEqual(nextCalled, false);
        });

        test("catches thrown async error and forwards to next(err)", async () => {
            const testError = new Error("Async database failure");
            const handler = asyncHandler(async () => {
                throw testError;
            });

            const req = {};
            const res = createMockRes();
            let caughtError = null;

            handler(req, res, (err) => {
                caughtError = err;
            });
            await new Promise(r => setTimeout(r, 10));

            assert.strictEqual(caughtError, testError);
        });
    });

    describe("Centralized errorHandler Middleware", () => {
        test("handles custom ApiError correctly", () => {
            const err = ApiError.badRequest("Invalid email format", ERROR_CODES.VALIDATION_ERROR, { field: "email" });
            const req = { id: "req-test-123", url: "/api/test", method: "POST" };
            const res = createMockRes();

            errorHandler(err, req, res, () => {});

            assert.strictEqual(res.statusCode, httpStatus.BAD_REQUEST);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.message, "Invalid email format");
            assert.strictEqual(res.body.code, ERROR_CODES.VALIDATION_ERROR);
            assert.strictEqual(res.body.requestId, "req-test-123");
            assert.deepStrictEqual(res.body.details, { field: "email" });
        });

        test("handles Mongoose ValidationError", () => {
            const err = new Error("Validation failed");
            err.name = "ValidationError";
            err.errors = {
                username: { message: "Username is required" },
                email: { message: "Email is required" }
            };
            const req = { id: "req-val-1" };
            const res = createMockRes();

            errorHandler(err, req, res, () => {});

            assert.strictEqual(res.statusCode, httpStatus.BAD_REQUEST);
            assert.strictEqual(res.body.success, false);
            assert.strictEqual(res.body.code, ERROR_CODES.VALIDATION_ERROR);
            assert.ok(res.body.message.includes("Username is required"));
            assert.ok(res.body.message.includes("Email is required"));
        });

        test("handles Mongoose CastError (invalid ObjectId)", () => {
            const err = new Error("Cast to ObjectId failed");
            err.name = "CastError";
            err.path = "meetingId";
            err.value = "invalid_hex_id";
            const req = { id: "req-cast-1" };
            const res = createMockRes();

            errorHandler(err, req, res, () => {});

            assert.strictEqual(res.statusCode, httpStatus.BAD_REQUEST);
            assert.strictEqual(res.body.code, ERROR_CODES.INVALID_PARAMETERS);
            assert.ok(res.body.message.includes("meetingId"));
        });

        test("handles MongoDB duplicate key error (code 11000)", () => {
            const err = new Error("E11000 duplicate key error");
            err.code = 11000;
            err.keyValue = { email: "alice@example.com" };
            const req = { id: "req-dup-1" };
            const res = createMockRes();

            errorHandler(err, req, res, () => {});

            assert.strictEqual(res.statusCode, httpStatus.CONFLICT);
            assert.strictEqual(res.body.code, ERROR_CODES.USER_EXISTS);
            assert.ok(res.body.message.includes("email"));
        });

        test("handles malformed JSON body SyntaxError", () => {
            const err = new SyntaxError("Unexpected token in JSON");
            err.status = 400;
            err.body = "{ invalid json";
            const req = { id: "req-json-1" };
            const res = createMockRes();

            errorHandler(err, req, res, () => {});

            assert.strictEqual(res.statusCode, httpStatus.BAD_REQUEST);
            assert.strictEqual(res.body.code, ERROR_CODES.INVALID_PAYLOAD);
            assert.strictEqual(res.body.message, "Malformed JSON payload in request body");
        });

        test("handles JsonWebTokenError and TokenExpiredError", () => {
            const jwtErr = new Error("invalid token");
            jwtErr.name = "JsonWebTokenError";
            const req1 = { id: "req-jwt-1" };
            const res1 = createMockRes();

            errorHandler(jwtErr, req1, res1, () => {});
            assert.strictEqual(res1.statusCode, httpStatus.UNAUTHORIZED);
            assert.strictEqual(res1.body.code, ERROR_CODES.AUTH_TOKEN_INVALID);

            const expErr = new Error("jwt expired");
            expErr.name = "TokenExpiredError";
            const res2 = createMockRes();

            errorHandler(expErr, req1, res2, () => {});
            assert.strictEqual(res2.statusCode, httpStatus.UNAUTHORIZED);
            assert.strictEqual(res2.body.code, ERROR_CODES.AUTH_TOKEN_INVALID);
            assert.ok(res2.body.message.includes("expired"));
        });

        test("sanitizes 500 error messages in production mode", () => {
            const originalEnv = process.env.NODE_ENV;
            try {
                process.env.NODE_ENV = "production";
                const err = new Error("Database connection pool timeout on replica shard 3");
                const req = { id: "req-500-prod" };
                const res = createMockRes();

                errorHandler(err, req, res, () => {});

                assert.strictEqual(res.statusCode, httpStatus.INTERNAL_SERVER_ERROR);
                assert.strictEqual(res.body.message, "Internal Server Error");
                assert.strictEqual(res.body.code, ERROR_CODES.INTERNAL_SERVER_ERROR);
                assert.strictEqual(res.body.requestId, "req-500-prod");
            } finally {
                process.env.NODE_ENV = originalEnv;
            }
        });
    });

    describe("notFoundHandler Middleware", () => {
        test("forwards 404 ApiError with NOT_FOUND code to next()", () => {
            const req = { method: "GET", originalUrl: "/api/v1/nonexistent" };
            const res = createMockRes();
            let forwardedError = null;

            notFoundHandler(req, res, (err) => {
                forwardedError = err;
            });

            assert.ok(forwardedError instanceof ApiError);
            assert.strictEqual(forwardedError.statusCode, httpStatus.NOT_FOUND);
            assert.strictEqual(forwardedError.code, ERROR_CODES.NOT_FOUND);
            assert.ok(forwardedError.message.includes("GET /api/v1/nonexistent"));
        });
    });
});
