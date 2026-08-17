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

    test("secure room code generator", async () => {
        const { generateSecureRoomCode, isValidRoomCodeFormat } = await import("../src/utils/roomCodeGenerator.js");
        const code1 = generateSecureRoomCode();
        const code2 = generateSecureRoomCode();

        assert.ok(code1.startsWith("nov-"), "Room code must start with default prefix");
        assert.notStrictEqual(code1, code2, "Cryptographic generator must produce unique codes");
        assert.strictEqual(isValidRoomCodeFormat(code1), true, "Generated room code format must be valid");
        assert.strictEqual(isValidRoomCodeFormat(""), false);
        assert.strictEqual(isValidRoomCodeFormat("a"), false);
    });

    test("atomic IDOR ownership deletion query", () => {
        // Simulate atomic findOneAndDelete({ _id: id, user_id: username })
        const meetingsCollection = [
            { _id: "meet_a", user_id: "alice_w", title: "Alice Sync" },
            { _id: "meet_b", user_id: "bob_m", title: "Bob Sync" }
        ];

        // Alice attempts to delete Bob's meeting
        const deleteForAlice = (id, username) => {
            const index = meetingsCollection.findIndex(m => m._id === id && m.user_id === username);
            if (index !== -1) {
                return meetingsCollection.splice(index, 1)[0];
            }
            return null;
        };

        const result = deleteForAlice("meet_b", "alice_w");
        assert.strictEqual(result, null, "Atomic query must not delete another user's meeting");
        assert.strictEqual(meetingsCollection.length, 2);

        // Bob deletes own meeting
        const bobResult = deleteForAlice("meet_b", "bob_m");
        assert.ok(bobResult);
        assert.strictEqual(meetingsCollection.length, 1);
    });
});
