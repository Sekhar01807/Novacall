import { test, describe } from "node:test";
import assert from "node:assert/strict";
import { signJWT, verifyJWT } from "../src/utils/jwt.js";
import { openapiSpecification } from "../src/docs/swaggerSpec.js";

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
        // Sign with 0 seconds expiration
        const token = signJWT(testUser, testSecret, -1);
        const decoded = verifyJWT(token, testSecret);
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

    test("should preserve normal text messages without alterations", () => {
        const normal = "Hello team, let's start the standup!";
        assert.strictEqual(sanitizeHTML(normal), normal);
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
    const sanitize = (data) => {
        if (!data || typeof data !== "object") return data;
        const clean = Array.isArray(data) ? [...data] : { ...data };
        const sensitiveKeys = ["password", "token", "newPassword", "oldPassword", "currentPassword", "secret"];
        for (const key of Object.keys(clean)) {
            if (sensitiveKeys.includes(key.toLowerCase())) {
                clean[key] = "***REDACTED***";
            } else if (typeof clean[key] === "object") {
                clean[key] = sanitize(clean[key]);
            }
        }
        return clean;
    };

    test("should automatically mask sensitive passwords and tokens in logs", () => {
        const payload = {
            username: "sekhar",
            password: "PlainSecretPassword123",
            token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9",
            details: {
                currentPassword: "OldPassword123"
            }
        };

        const sanitized = sanitize(payload);
        assert.strictEqual(sanitized.password, "***REDACTED***");
        assert.strictEqual(sanitized.token, "***REDACTED***");
        assert.strictEqual(sanitized.details.currentPassword, "***REDACTED***");
        assert.strictEqual(sanitized.username, "sekhar");
    });
});
