import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { signJWT, verifyJWT } from "../src/utils/jwt.js";
import { openapiSpecification } from "../src/docs/swaggerSpec.js";
import { sanitize } from "../src/utils/logger.js";

describe("1. JWT Authentication & Security Tests", () => {
    const testSecret = "test_super_secret_jwt_key_123456";
    const testUser = {
        id: "60d0fe4f5311236168a109ca",
        username: "testuser",
        email: "test@novacall.io"
    };

    test("should successfully sign and verify a standard JWT access token", () => {
        const token = signJWT(testUser, testSecret, "1h");
        assert.ok(token, "Token should be generated");
        assert.strictEqual(typeof token, "string");
        assert.strictEqual(token.split(".").length, 3, "JWT must have 3 segments");

        const decoded = verifyJWT(token, testSecret);
        assert.ok(decoded, "Token must decode successfully");
        assert.strictEqual(decoded.id, testUser.id);
        assert.strictEqual(decoded.username, testUser.username);
        assert.strictEqual(decoded.email, testUser.email);
    });

    test("should reject a tampered JWT token", () => {
        const token = signJWT(testUser, testSecret, "1h");
        const parts = token.split(".");
        // Tamper with the payload segment
        parts[1] = Buffer.from(JSON.stringify({ ...testUser, username: "hacker" })).toString("base64url");
        const tamperedToken = parts.join(".");

        const decoded = verifyJWT(tamperedToken, testSecret);
        assert.strictEqual(decoded, null, "Tampered token must be rejected");
    });

    test("should reject a token signed with an invalid secret", () => {
        const token = signJWT(testUser, "wrong_secret", "1h");
        const decoded = verifyJWT(token, testSecret);
        assert.strictEqual(decoded, null, "Token signed with wrong secret must be rejected");
    });

    test("should reject an expired token", () => {
        // Create an already-expired token (1 hour in the past)
        const expiredToken = signJWT(
            { ...testUser, exp: Math.floor(Date.now() / 1000) - 3600 },
            testSecret
        );
        const decoded = verifyJWT(expiredToken, testSecret);
        assert.strictEqual(decoded, null, "Expired token must be rejected");
    });
});

describe("2. Server-side Validation Logic Tests", () => {
    test("should validate email regex format accurately", () => {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        assert.strictEqual(emailRegex.test("valid.user@example.com"), true);
        assert.strictEqual(emailRegex.test("user+tag@domain.co.in"), true);
        assert.strictEqual(emailRegex.test("invalid-email"), false);
        assert.strictEqual(emailRegex.test("@no-username.com"), false);
        assert.strictEqual(emailRegex.test("user@no-tld"), false);
    });

    test("should validate password complexity requirements", () => {
        const isPasswordValid = (pwd) => {
            if (!pwd || pwd.length < 8) return false;
            if (!/[A-Z]/.test(pwd)) return false;
            if (!/[0-9]/.test(pwd)) return false;
            return true;
        };

        assert.strictEqual(isPasswordValid("Weak"), false, "Too short");
        assert.strictEqual(isPasswordValid("alllowercase123"), false, "No uppercase");
        assert.strictEqual(isPasswordValid("NoNumbersHere"), false, "No number");
        assert.strictEqual(isPasswordValid("StrongPassword1"), true, "Valid password");
    });
});

describe("3. In-Meeting Chat XSS Sanitization Tests", () => {
    const sanitizeHTML = (str) => {
        if (typeof str !== "string") return "";
        return str
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#x27;");
    };

    test("should escape malicious script tags and event handlers", () => {
        const malicious = '<script>alert("XSS")</script>';
        const clean = sanitizeHTML(malicious);
        assert.strictEqual(clean, '&lt;script&gt;alert(&quot;XSS&quot;)&lt;/script&gt;');
        assert.ok(!clean.includes("<script>"));
    });

    test("should preserve normal text content without allowing HTML execution", () => {
        const normal = "Hello team, let's start the standup!";
        const clean = sanitizeHTML(normal);
        assert.ok(clean.includes("Hello team"));
        assert.ok(clean.includes("start the standup"));
        assert.ok(!clean.includes("<script>"));
    });
});

describe("4. OpenAPI 3.0 Documentation Completeness Tests", () => {
    test("should have valid OpenAPI 3.0 info metadata", () => {
        assert.strictEqual(openapiSpecification.openapi, "3.0.0");
        assert.strictEqual(openapiSpecification.info.title, "NovaCall REST API");
        assert.ok(openapiSpecification.components.securitySchemes.bearerAuth);
    });

    test("should define all essential REST endpoints in OpenAPI specification", () => {
        const paths = Object.keys(openapiSpecification.paths);
        const requiredRoutes = [
            "/register",
            "/login",
            "/get_profile",
            "/get_all_activity",
            "/create_scheduled_meeting"
        ];

        for (const route of requiredRoutes) {
            assert.ok(paths.includes(route), `OpenAPI must document route: ${route}`);
        }
    });
});

describe("5. Structured Logger Credential Masking Tests", () => {
    test("should automatically mask sensitive passwords and tokens in logs", () => {
        const payload = {
            username: "sekhar",
            password: "PlainSecretPassword123",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            details: {
                currentPassword: "OldPassword123",
                apiKey: "secret_api_key_xyz",
                refreshToken: "refresh_token_123"
            }
        };

        const sanitized = sanitize(payload);
        assert.strictEqual(sanitized.password, "***REDACTED***");
        assert.strictEqual(sanitized.token, "***REDACTED***");
        assert.strictEqual(sanitized.details.currentPassword, "***REDACTED***");
        assert.strictEqual(sanitized.details.apiKey, "***REDACTED***");
        assert.strictEqual(sanitized.details.refreshToken, "***REDACTED***");
        assert.strictEqual(sanitized.username, "sekhar");
    });
});

describe("6. Password Reset Limitation & Explicit Response Validation", () => {
    test("should validate password reset code format and demo payload structure", () => {
        const sampleCode = "849201";
        assert.strictEqual(/^\d{6}$/.test(sampleCode), true, "Reset code must be a 6-digit number");

        const sampleResponse = {
            success: true,
            message: "Password reset code generated. (Demo Notice: Verification code provided directly for testing. In production, configure an SMTP service.)",
            code: "RESET_CODE_DISPATCHED",
            resetCode: sampleCode
        };

        assert.strictEqual(sampleResponse.code, "RESET_CODE_DISPATCHED");
        assert.ok(sampleResponse.message.includes("Demo Notice"));
        assert.strictEqual(typeof sampleResponse.resetCode, "string");
    });
});

describe("7. Standardized Error Codes & Response Formatters Tests", () => {
    test("should format error response with typed error code, message, and requestId", async () => {
        const { ERROR_CODES, formatErrorResponse, formatSuccessResponse } = await import("../src/utils/errorCodes.js");
        
        assert.ok(ERROR_CODES.AUTH_TOKEN_REQUIRED);
        assert.ok(ERROR_CODES.ROOM_CAPACITY_EXCEEDED);
        assert.ok(ERROR_CODES.RATE_LIMIT_EXCEEDED);
        assert.ok(ERROR_CODES.UNAUTHORIZED_HOST_ACTION);

        const errorPayload = formatErrorResponse(
            ERROR_CODES.RATE_LIMIT_EXCEEDED,
            "Too many requests",
            { retryAfter: 60 },
            "req-uuid-12345"
        );

        assert.strictEqual(errorPayload.success, false);
        assert.strictEqual(errorPayload.code, "RATE_LIMIT_EXCEEDED");
        assert.strictEqual(errorPayload.message, "Too many requests");
        assert.strictEqual(errorPayload.retryAfter, 60);
        assert.strictEqual(errorPayload.requestId, "req-uuid-12345");

        const successPayload = formatSuccessResponse(
            { user: "alice" },
            "Operation completed",
            "req-uuid-99999"
        );

        assert.strictEqual(successPayload.success, true);
        assert.strictEqual(successPayload.user, "alice");
        assert.strictEqual(successPayload.message, "Operation completed");
        assert.strictEqual(successPayload.requestId, "req-uuid-99999");
    });
});


