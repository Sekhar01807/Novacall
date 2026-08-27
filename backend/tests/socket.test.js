import { test, describe, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
let Client;
try {
    const mod = await import("socket.io-client");
    Client = mod.io || mod.default?.io || mod.default;
} catch {
    const mod = await import("../../frontend/node_modules/socket.io-client/build/esm/index.js");
    Client = mod.io || mod.default?.io || mod.default;
}
import { initializeSocketIO } from "../src/sockets/index.js";
import { resetAllRooms, getRoom, getActiveRoomCount } from "../src/sockets/roomState.js";
import { signJWT } from "../src/utils/jwt.js";

describe("Socket.IO", () => {
    let httpServer;
    let ioServer;
    let serverPort;
    const testSecret = "test_super_secret_jwt_key_123456";

    const userAlice = {
        id: "60d0fe4f5311236168a109aa",
        username: "alice_w",
        name: "Alice Williams",
        email: "alice@novacall.io"
    };

    const userBob = {
        id: "60d0fe4f5311236168a109bb",
        username: "bob_m",
        name: "Bob Martin",
        email: "bob@novacall.io"
    };

    let aliceToken;
    let bobToken;

    before(async () => {
        process.env.JWT_SECRET = testSecret;
        aliceToken = signJWT(userAlice, testSecret, "1h");
        bobToken = signJWT(userBob, testSecret, "1h");

        httpServer = createServer();
        ioServer = initializeSocketIO(httpServer);

        await new Promise((resolve) => {
            httpServer.listen(0, () => {
                serverPort = httpServer.address().port;
                resolve();
            });
        });
    });

    after(async () => {
        ioServer.close();
        await new Promise((resolve) => httpServer.close(resolve));
    });

    beforeEach(() => {
        resetAllRooms();
    });

    const connectClient = (auth = {}) => {
        return new Promise((resolve, reject) => {
            const socket = Client(`http://localhost:${serverPort}`, {
                auth,
                transports: ["websocket"],
                forceNew: true
            });
            socket.on("connect", () => resolve(socket));
            socket.on("connect_error", (err) => reject(err));
        });
    };

    test("connect", async () => {
        const client = await connectClient({ guestName: "Guest User" });
        assert.ok(client.id, "Client socket must receive connection ID");
        client.disconnect();
    });

    test("authenticate", async () => {
        const client = await connectClient({ token: aliceToken });
        
        await new Promise((resolve) => {
            client.emit("join-call", "auth-test-room");
            client.once("host-status", () => {
                const room = getRoom("auth-test-room");
                assert.ok(room);
                const participant = room.participants.get(client.id);
                assert.strictEqual(participant.displayName, "Alice Williams");
                assert.strictEqual(participant.isGuest, false);
                resolve();
            });
        });

        client.disconnect();
    });

    test("join", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "join-test-room");
            client1.once("host-status", () => resolve());
        });

        const userJoinedPromise = new Promise((resolve) => {
            client1.once("user-joined", (joinedSocketId, participantList, namesMap) => {
                resolve({ joinedSocketId, participantList, namesMap });
            });
        });

        client2.emit("join-call", "join-test-room");

        const { joinedSocketId, participantList, namesMap } = await userJoinedPromise;
        assert.strictEqual(joinedSocketId, client2.id);
        assert.ok(participantList.includes(client1.id));
        assert.ok(participantList.includes(client2.id));
        assert.strictEqual(namesMap[client2.id], "Bob Martin");

        client1.disconnect();
        client2.disconnect();
    });

    test("leave", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "leave-test-room");
            client1.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            client2.emit("join-call", "leave-test-room");
            client2.once("host-status", () => resolve());
        });

        const leavePromise = new Promise((resolve) => {
            client2.once("user-left", (leftSocketId) => {
                resolve(leftSocketId);
            });
        });

        const client1Id = client1.id;
        client1.emit("leave-call");
        const leftId = await leavePromise;

        assert.strictEqual(leftId, client1Id);
        const room = getRoom("leave-test-room");
        assert.strictEqual(room.participants.has(client1Id), false);

        client1.disconnect();
        client2.disconnect();
    });

    test("disconnect", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "disconnect-test-room");
            client1.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            client2.emit("join-call", "disconnect-test-room");
            client2.once("host-status", () => resolve());
        });

        const disconnectPromise = new Promise((resolve) => {
            client2.once("user-left", (leftSocketId) => {
                resolve(leftSocketId);
            });
        });

        const client1Id = client1.id;
        client1.disconnect();
        const leftId = await disconnectPromise;
        assert.strictEqual(leftId, client1Id);

        client2.disconnect();
    });

    test("duplicate join", async () => {
        const client = await connectClient({ token: aliceToken });

        await new Promise((resolve) => {
            client.emit("join-call", "first-room");
            client.once("host-status", () => resolve());
        });

        assert.ok(getRoom("first-room"));

        // Same client socket joins a second room
        await new Promise((resolve) => {
            client.emit("join-call", "second-room");
            client.once("host-status", () => resolve());
        });

        assert.strictEqual(getRoom("first-room"), null, "Empty old room must be cleaned up");
        assert.ok(getRoom("second-room"));

        client.disconnect();
    });

    test("host assignment", async () => {
        const hostClient = await connectClient({ token: aliceToken });
        const guestClient = await connectClient({ token: bobToken });

        const hostStatusPromise = new Promise((resolve) => {
            hostClient.once("host-status", (status) => resolve(status));
        });
        hostClient.emit("join-call", "host-assign-room");
        const hostStatus = await hostStatusPromise;
        assert.strictEqual(hostStatus.isHost, true, "First participant must be Host");

        const guestStatusPromise = new Promise((resolve) => {
            guestClient.once("host-status", (status) => resolve(status));
        });
        guestClient.emit("join-call", "host-assign-room");
        const guestStatus = await guestStatusPromise;
        assert.strictEqual(guestStatus.isHost, false, "Second participant must not be Host");

        hostClient.disconnect();
        guestClient.disconnect();
    });

    test("host disconnect", async () => {
        const host = await connectClient({ token: aliceToken });
        const peer = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            host.emit("join-call", "host-disconnect-room");
            host.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            peer.emit("join-call", "host-disconnect-room");
            peer.once("host-status", () => resolve());
        });

        const promotionPromise = new Promise((resolve) => {
            peer.once("host-status", (status) => resolve(status));
        });

        host.disconnect();
        const promoStatus = await promotionPromise;
        assert.strictEqual(promoStatus.isHost, true, "Peer must be promoted to host");

        peer.disconnect();
    });

    test("moderation", async () => {
        const host = await connectClient({ token: aliceToken });
        const participant = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            host.emit("join-call", "mod-room");
            host.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            participant.emit("join-call", "mod-room");
            participant.once("host-status", () => resolve());
        });

        // 1. Participant unauthorized mute attempt
        const unauthorizedPromise = new Promise((resolve) => {
            participant.once("error-message", (err) => resolve(err));
        });
        participant.emit("host-mute-user", host.id);
        const err = await unauthorizedPromise;
        assert.strictEqual(err.code, "UNAUTHORIZED_HOST_ACTION");

        // 2. Host authorized mute
        const mutePromise = new Promise((resolve) => {
            participant.once("force-mute-audio", () => resolve());
        });
        host.emit("host-mute-user", participant.id);
        await mutePromise;

        host.disconnect();
        participant.disconnect();
    });

    test("room cleanup", async () => {
        const client = await connectClient({ token: aliceToken });

        await new Promise((resolve) => {
            client.emit("join-call", "cleanup-room");
            client.once("host-status", () => resolve());
        });

        assert.ok(getRoom("cleanup-room"));
        assert.strictEqual(getActiveRoomCount(), 1);

        client.disconnect();
        // Give short grace period for disconnect handler
        await new Promise((r) => setTimeout(r, 50));

        assert.strictEqual(getRoom("cleanup-room"), null, "Room must be purged after last participant exits");
        assert.strictEqual(getActiveRoomCount(), 0);
    });

    test("mesh capacity limit enforcement", async () => {
        const { addParticipant, getRoom, DEFAULT_MAX_ROOM_CAPACITY } = await import("../src/sockets/roomState.js");
        assert.strictEqual(DEFAULT_MAX_ROOM_CAPACITY, 6, "Default P2P mesh capacity must be set to 6");

        const roomCode = "mesh-cap-test";
        // Add 6 participants
        for (let i = 1; i <= 6; i++) {
            const res = addParticipant(roomCode, `socket_${i}`, { name: `User ${i}` });
            assert.ok(res.participant);
        }

        const room = getRoom(roomCode);
        assert.strictEqual(room.participants.size, 6);

        // 7th participant must be rejected
        const overflowRes = addParticipant(roomCode, "socket_7", { name: "User 7" });
        assert.ok(overflowRes.error);
        assert.strictEqual(overflowRes.error, "ROOM_CAPACITY_EXCEEDED");
        assert.strictEqual(overflowRes.maxCapacity, 6);
    });

    test("centralized requireRoomHost helper", async () => {
        const { addParticipant, requireRoomHost } = await import("../src/sockets/roomState.js");
        const roomCode = "host-guard-test";

        addParticipant(roomCode, "socket_host", { name: "Host User" });
        addParticipant(roomCode, "socket_guest", { name: "Guest User" });

        const hostCheck = requireRoomHost("socket_host");
        assert.strictEqual(hostCheck.ok, true);
        assert.strictEqual(hostCheck.roomCode, "host-guard-test");

        const guestCheck = requireRoomHost("socket_guest");
        assert.strictEqual(guestCheck.ok, false);
        assert.strictEqual(guestCheck.error, "UNAUTHORIZED_HOST_ACTION");

        const nonParticipantCheck = requireRoomHost("socket_outsider");
        assert.strictEqual(nonParticipantCheck.ok, false);
        assert.strictEqual(nonParticipantCheck.error, "NOT_IN_ROOM");
    });

    test("rate limit cleanup on socket disconnect", async () => {
        const { resetSocketRateLimits } = await import("../src/sockets/middleware/socketValidator.js");
        const { resetChatRateLimits } = await import("../src/sockets/handlers/chat.handler.js");

        // Verify functions accept socketId and clear without errors
        assert.doesNotThrow(() => resetSocketRateLimits("socket_temp_123"));
        assert.doesNotThrow(() => resetChatRateLimits("socket_temp_123"));
        assert.doesNotThrow(() => resetSocketRateLimits());
        assert.doesNotThrow(() => resetChatRateLimits());
    });

    test("query-parameter token rejection (prevents token leakage in URLs)", async () => {
        // Attempt to pass token purely via query string without auth/cookie
        const client = await new Promise((resolve, reject) => {
            const socket = Client(`http://localhost:${serverPort}`, {
                query: { token: aliceToken },
                transports: ["websocket"],
                forceNew: true
            });
            socket.on("connect", () => resolve(socket));
            socket.on("connect_error", (err) => reject(err));
        });

        await new Promise((resolve) => {
            client.emit("join-call", "query-token-room");
            client.once("host-status", () => {
                const room = getRoom("query-token-room");
                assert.ok(room);
                const participant = room.participants.get(client.id);
                // Token passed via query must be ignored; user must not be authenticated
                assert.strictEqual(participant.isGuest, true, "Query-param token must not authenticate user");
                assert.notStrictEqual(participant.displayName, "Alice Williams");
                resolve();
            });
        });

        client.disconnect();
    });

    test("socket tokenVersion session revocation parity", async () => {
        const { setMockUserResolver } = await import("../src/sockets/middleware/socketAuth.middleware.js");

        // Simulate DB state where Alice's tokenVersion was incremented to 2 (e.g. password change / signout all)
        setMockUserResolver(async (idOrUsername) => {
            return {
                id: "60d0fe4f5311236168a109aa",
                username: "alice_w",
                tokenVersion: 2
            };
        });

        try {
            // 1. Old token signed with tokenVersion 1 (revoked)
            const oldToken = signJWT({ ...userAlice, tokenVersion: 1 }, testSecret, "1h");
            const connectOldPromise = new Promise((resolve) => {
                const socket = Client(`http://localhost:${serverPort}`, {
                    auth: { token: oldToken },
                    transports: ["websocket"],
                    forceNew: true
                });
                socket.on("connect_error", (err) => {
                    socket.disconnect();
                    resolve(err);
                });
                socket.on("connect", () => {
                    socket.disconnect();
                    resolve(null);
                });
            });

            const error = await connectOldPromise;
            assert.ok(error, "Revoked token must trigger connect_error");
            assert.strictEqual(error.message, "AUTH_SESSION_REVOKED");

            // 2. New token signed with current tokenVersion 2 (valid)
            const newToken = signJWT({ ...userAlice, tokenVersion: 2 }, testSecret, "1h");
            const connectNewPromise = new Promise((resolve, reject) => {
                const socket = Client(`http://localhost:${serverPort}`, {
                    auth: { token: newToken },
                    transports: ["websocket"],
                    forceNew: true
                });
                socket.on("connect", () => resolve(socket));
                socket.on("connect_error", (err) => reject(err));
            });

            const validSocket = await connectNewPromise;
            assert.ok(validSocket.id);
            validSocket.disconnect();
        } finally {
            setMockUserResolver(null);
        }
    });
});

