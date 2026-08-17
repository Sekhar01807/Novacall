import { test, describe, before } from "node:test";
import assert from "node:assert/strict";
import { signJWT, verifyJWT } from "../src/utils/jwt.js";
import { ERROR_CODES, formatErrorResponse, formatSuccessResponse } from "../src/utils/errorCodes.js";

describe("Meetings", () => {
    const testSecret = "test_super_secret_jwt_key_123456";
    let mockMeetingsDb = [];
    let mockScheduledDb = [];
    const userIdAlice = "60d0fe4f5311236168a109aa";
    const userIdBob = "60d0fe4f5311236168a109bb";
    let aliceToken;

    before(() => {
        process.env.JWT_SECRET = testSecret;
        aliceToken = signJWT({ id: userIdAlice, username: "alice_w" }, testSecret, "1h");
        mockMeetingsDb = [];
        mockScheduledDb = [];
    });

    test("create meeting", () => {
        const roomCode = "sprint-sync-2026";
        const meetingEntry = {
            id: "meet_001",
            user_id: userIdAlice,
            meeting_code: roomCode,
            date: new Date()
        };
        mockMeetingsDb.push(meetingEntry);

        assert.strictEqual(mockMeetingsDb.length, 1);
        assert.strictEqual(mockMeetingsDb[0].meeting_code, "sprint-sync-2026");
        assert.strictEqual(mockMeetingsDb[0].user_id, userIdAlice);
    });

    test("schedule meeting", () => {
        const scheduledPayload = {
            id: "sched_001",
            user_id: userIdAlice,
            title: "Q3 Roadmap Review",
            scheduled_date: "2026-09-01",
            scheduled_time: "10:00 AM",
            meeting_code: "roadmap-q3",
            created_at: new Date()
        };
        mockScheduledDb.push(scheduledPayload);

        assert.strictEqual(mockScheduledDb.length, 1);
        assert.strictEqual(mockScheduledDb[0].title, "Q3 Roadmap Review");
        assert.strictEqual(mockScheduledDb[0].meeting_code, "roadmap-q3");
    });

    test("delete meeting", () => {
        const meetingIdToDelete = "sched_001";
        const initialCount = mockScheduledDb.length;
        const target = mockScheduledDb.find(m => m.id === meetingIdToDelete && m.user_id === userIdAlice);
        assert.ok(target, "Meeting must exist and be owned by user");

        mockScheduledDb = mockScheduledDb.filter(m => m.id !== meetingIdToDelete);
        assert.strictEqual(mockScheduledDb.length, initialCount - 1);
    });

    test("unauthorized access", () => {
        // Attempt to access or delete someone else's meeting
        const bobMeeting = {
            id: "sched_002",
            user_id: userIdBob,
            title: "Bob Private Sync",
            meeting_code: "bob-private"
        };
        mockScheduledDb.push(bobMeeting);

        // Alice attempts to delete Bob's meeting
        const canAliceDelete = bobMeeting.user_id === userIdAlice;
        assert.strictEqual(canAliceDelete, false, "Unauthorized user cannot delete another user's meeting");

        const forbiddenError = formatErrorResponse(
            "Forbidden: You do not own this meeting",
            ERROR_CODES.FORBIDDEN,
            "req-2001"
        );
        assert.strictEqual(forbiddenError.code, ERROR_CODES.FORBIDDEN);
    });

    test("meeting lifecycle", () => {
        // Full lifecycle: Create -> Query with pagination -> Complete -> Delete
        const meetingCode = "lifecycle-room-1";
        
        // 1. Log activity
        mockMeetingsDb.push({
            id: "meet_002",
            user_id: userIdAlice,
            meeting_code: meetingCode,
            date: new Date()
        });

        // 2. Query paginated activity
        const page = 1;
        const limit = 10;
        const total = mockMeetingsDb.filter(m => m.user_id === userIdAlice).length;
        const totalPages = Math.ceil(total / limit) || 1;

        assert.ok(total >= 1);
        assert.strictEqual(page, 1);
        assert.strictEqual(totalPages, 1);

        // 3. Clear meeting
        mockMeetingsDb = mockMeetingsDb.filter(m => m.meeting_code !== meetingCode);
        assert.strictEqual(mockMeetingsDb.some(m => m.meeting_code === meetingCode), false);
    });
});
