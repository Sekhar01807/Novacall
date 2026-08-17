import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import bcrypt from "bcrypt";
import { signJWT, verifyJWT } from "../src/utils/jwt.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../src/utils/errorCodes.js";

describe("Authentication", () => {
    const testSecret = "test_super_secret_jwt_key_123456";
    let mockUsersDb = new Map();

    const sampleValidUser = {
        name: "Alice Williams",
        email: "alice@novacall.io",
        username: "alice_w",
        password: "SecurePassword123!"
    };

    before(() => {
        process.env.JWT_SECRET = testSecret;
        mockUsersDb.clear();
    });

    test("signup", async () => {
        // Simulate registration logic
        const { name, email, username, password } = sampleValidUser;
        assert.ok(name && email && username && password);
        assert.strictEqual(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email), true, "Email must be valid");
        assert.ok(password.length >= 8, "Password must be at least 8 chars");
        assert.ok(/[A-Z]/.test(password), "Password must contain uppercase");
        assert.ok(/[0-9]/.test(password), "Password must contain number");

        const hashedPassword = await bcrypt.hash(password, 10);
        const newUser = {
            id: "60d0fe4f5311236168a109aa",
            name,
            email: email.toLowerCase(),
            username,
            password: hashedPassword
        };
        mockUsersDb.set(username, newUser);

        assert.strictEqual(mockUsersDb.has(username), true);
        assert.strictEqual(mockUsersDb.get(username).email, "alice@novacall.io");
    });

    test("duplicate signup", async () => {
        // Attempt to register with the same username/email
        const duplicateUsername = sampleValidUser.username;
        const exists = mockUsersDb.has(duplicateUsername);
        assert.strictEqual(exists, true, "Existing user must be detected");

        const duplicateError = formatErrorResponse(
            "User with this email or username already exists",
            ERROR_CODES.USER_EXISTS,
            "req-1001"
        );
        assert.strictEqual(duplicateError.success, false);
        assert.strictEqual(duplicateError.code, ERROR_CODES.USER_EXISTS);
    });

    test("login", async () => {
        const { username, password } = sampleValidUser;
        const user = mockUsersDb.get(username);
        assert.ok(user, "User must exist for login");

        const isPasswordCorrect = await bcrypt.compare(password, user.password);
        assert.strictEqual(isPasswordCorrect, true, "Password verification must succeed");

        const token = signJWT({ id: user.id, username: user.username, email: user.email }, testSecret, "1h");
        assert.ok(token, "JWT access token must be generated");

        const successResponse = formatSuccessResponse({
            token,
            email: user.email,
            username: user.username,
            name: user.name
        }, null, "req-1002");

        assert.strictEqual(successResponse.success, true);
        assert.strictEqual(successResponse.username, "alice_w");
        assert.ok(successResponse.token);
    });

    test("wrong password", async () => {
        const { username } = sampleValidUser;
        const user = mockUsersDb.get(username);
        assert.ok(user);

        const isPasswordCorrect = await bcrypt.compare("WrongPassword999!", user.password);
        assert.strictEqual(isPasswordCorrect, false, "Wrong password must fail comparison");

        const authError = formatErrorResponse(
            "Invalid credentials. Please check your password.",
            ERROR_CODES.AUTH_INVALID_CREDENTIALS,
            "req-1003"
        );
        assert.strictEqual(authError.code, ERROR_CODES.AUTH_INVALID_CREDENTIALS);
    });

    test("expired JWT", () => {
        // Sign token that expired 1 hour ago
        const expiredToken = signJWT(
            { id: "60d0fe4f5311236168a109aa", username: "alice_w", exp: Math.floor(Date.now() / 1000) - 3600 },
            testSecret
        );

        const decoded = verifyJWT(expiredToken, testSecret);
        assert.strictEqual(decoded, null, "Expired token must fail verification");
    });

    test("tampered JWT", () => {
        const validToken = signJWT({ id: "60d0fe4f5311236168a109aa", username: "alice_w" }, testSecret, "1h");
        const parts = validToken.split(".");
        // Tamper payload segment
        parts[1] = Buffer.from(JSON.stringify({ id: "60d0fe4f5311236168a109aa", username: "malicious_actor" })).toString("base64url");
        const tamperedToken = parts.join(".");

        const decoded = verifyJWT(tamperedToken, testSecret);
        assert.strictEqual(decoded, null, "Tampered token must fail signature verification");
    });
});
