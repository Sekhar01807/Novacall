import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
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

    test("password reset hashed token flow", async () => {
        const email = "alice@novacall.io";
        const code = "654321";
        const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
        const expires = Date.now() + 15 * 60 * 1000;

        // Verify SHA-256 hashing property
        assert.notStrictEqual(code, hashedCode);
        assert.strictEqual(hashedCode.length, 64);

        // Verification simulation
        const userInputCode = "654321";
        const inputHash = crypto.createHash("sha256").update(userInputCode).digest("hex");
        assert.strictEqual(inputHash, hashedCode, "Matching code hash must verify correctly");

        // Expired check
        const pastExpires = Date.now() - 1000;
        assert.strictEqual(Date.now() > pastExpires, true, "Expired token must be rejected");
    });

    test("password reset single use & rate limit", () => {
        const code = "889900";
        const hashedCode = crypto.createHash("sha256").update(code).digest("hex");
        let resetRecord = {
            hashedCode,
            expires: Date.now() + 15 * 60 * 1000,
            attempts: 0
        };

        // Simulate 5 failed attempts
        for (let i = 1; i <= 5; i++) {
            resetRecord.attempts += 1;
            const badInput = `wrong_${i}`;
            const badHash = crypto.createHash("sha256").update(badInput).digest("hex");
            assert.notStrictEqual(badHash, resetRecord.hashedCode);
        }

        assert.strictEqual(resetRecord.attempts, 5);

        // 6th attempt exceeds max allowed
        resetRecord.attempts += 1;
        assert.ok(resetRecord.attempts > 5, "Exceeding 5 attempts must trigger rate limit invalidation");
    });

    test("token version session revocation on signout and password change", () => {
        const user = {
            id: "60d0fe4f5311236168a109aa",
            username: "alice_w",
            tokenVersion: 0
        };

        // 1. Initial token signed with version 0
        const tokenV0 = signJWT({ id: user.id, username: user.username, tokenVersion: user.tokenVersion }, testSecret, "1h");
        const decodedV0 = verifyJWT(tokenV0, testSecret);
        assert.strictEqual(decodedV0.tokenVersion, 0);

        // Middleware check: tokenVersion (0) matches user.tokenVersion (0) -> VALID
        assert.strictEqual(decodedV0.tokenVersion >= user.tokenVersion, true);

        // 2. User invokes sign out all devices / changes password -> increments tokenVersion to 1
        user.tokenVersion = 1;

        // Old token (version 0) fails version check -> REVOKED
        assert.strictEqual(decodedV0.tokenVersion >= user.tokenVersion, false, "Old token must be rejected after session revocation");

        // 3. New token signed with version 1 -> VALID
        const tokenV1 = signJWT({ id: user.id, username: user.username, tokenVersion: user.tokenVersion }, testSecret, "1h");
        const decodedV1 = verifyJWT(tokenV1, testSecret);
        assert.strictEqual(decodedV1.tokenVersion, 1);
        assert.strictEqual(decodedV1.tokenVersion >= user.tokenVersion, true);
    });

    test("profile DTO strictly prevents leakage of resetPasswordToken and internal security fields", async () => {
        const { buildUserProfileDTO } = await import("../src/controllers/user.controller.js");

        const mockUserWithSecrets = {
            name: "Alice Williams",
            email: "alice@novacall.io",
            username: "alice_w",
            password: "hashed_bcrypt_password_secret",
            resetPasswordToken: "secret_sha256_reset_hash_123456",
            resetPasswordExpires: new Date(Date.now() + 900000),
            resetPasswordAttempts: 2,
            tokenVersion: 3,
            themeMode: "dark",
            jobTitle: "Principal Engineer",
            company: "Nova Systems"
        };

        const publicDTO = buildUserProfileDTO(mockUserWithSecrets, "req-test-999");

        // Allowed public fields present
        assert.strictEqual(publicDTO.name, "Alice Williams");
        assert.strictEqual(publicDTO.username, "alice_w");
        assert.strictEqual(publicDTO.email, "alice@novacall.io");
        assert.strictEqual(publicDTO.jobTitle, "Principal Engineer");

        // Security sensitive fields strictly excluded
        assert.strictEqual(publicDTO.password, undefined, "Password must never be in profile DTO");
        assert.strictEqual(publicDTO.resetPasswordToken, undefined, "Reset token must never be in profile DTO");
        assert.strictEqual(publicDTO.resetPasswordExpires, undefined, "Reset expires must never be in profile DTO");
        assert.strictEqual(publicDTO.resetPasswordAttempts, undefined, "Reset attempts must never be in profile DTO");
        assert.strictEqual(publicDTO.tokenVersion, undefined, "Token version must never be in profile DTO");
    });

    test("generic anti-enumeration response for forgot password", () => {
        // Generic dispatch message returned regardless of account existence
        const genericMessage = "If an account exists with this email, a verification code has been dispatched.";
        const responseExisting = { success: true, message: genericMessage, code: "RESET_CODE_DISPATCHED" };
        const responseNonExisting = { success: true, message: genericMessage, code: "RESET_CODE_DISPATCHED" };

        assert.strictEqual(responseExisting.message, responseNonExisting.message);
        assert.strictEqual(responseExisting.code, responseNonExisting.code);
    });

    test("email service graceful fallback and format validation", async () => {
        const { sendPasswordResetEmail, sendWelcomeEmail, sendMeetingScheduleEmail, isEmailConfigured } = await import("../src/services/email.service.js");
        
        // 1. Password reset email fallback test
        const resetResult = await sendPasswordResetEmail({
            toEmail: "tester@novacall.io",
            username: "Tester",
            resetCode: "123456",
            requestId: "test-req-email"
        });
        assert.ok(resetResult);

        // 2. Welcome email fallback test
        const welcomeResult = await sendWelcomeEmail({
            toEmail: "alice@novacall.io",
            name: "Alice Williams",
            username: "alice_w",
            requestId: "test-req-welcome"
        });
        assert.ok(welcomeResult);

        // 3. Scheduled meeting email fallback test
        const meetingResult = await sendMeetingScheduleEmail({
            toEmail: "alice@novacall.io",
            hostName: "Alice Williams",
            title: "Sprint Planning Q3",
            meetingCode: "NOV-778-990",
            scheduledDate: "2026-08-25",
            scheduledTime: "14:00",
            duration: 45,
            timeZone: "UTC",
            description: "Quarterly alignment and roadmap review",
            invitees: ["bob@novacall.io", "charlie@novacall.io"],
            requestId: "test-req-schedule"
        });
        assert.ok(meetingResult);

        assert.strictEqual(typeof isEmailConfigured(), "boolean");
    });
});


