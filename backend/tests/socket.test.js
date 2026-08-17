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

describe("Socket.IO Modular Architecture & Security Tests", () => {
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

    before((_, done) => {
        process.env.JWT_SECRET = testSecret;
        aliceToken = signJWT(userAlice, testSecret, "1h");
        bobToken = signJWT(userBob, testSecret, "1h");

        httpServer = createServer();
        ioServer = initializeSocketIO(httpServer);

        httpServer.listen(0, () => {
            serverPort = httpServer.address().port;
            done();
        });
    });

    after((_, done) => {
        ioServer.close();
        httpServer.close(done);
    });

    beforeEach(() => {
        resetAllRooms();
    });

    // Helper to create a client socket
    const createClientSocket = (auth = {}) => {
        return Client(`http://localhost:${serverPort}`, {
            auth,
            transports: ["websocket"],
            forceNew: true
        });
    };

    describe("1. Socket Authentication & Identity Enforcement", () => {
        test("should successfully authenticate socket with valid JWT and enforce identity", (t, done) => {
            const client = createClientSocket({ token: aliceToken });

            client.on("connect", () => {
                client.emit("join-call", "team-standup", "MaliciousSpoofedName");

                client.on("host-status", (status) => {
                    assert.strictEqual(status.isHost, true);
                    assert.strictEqual(status.roomCode, "team-standup");

                    // Check server state: display name must be Alice Williams, NOT MaliciousSpoofedName
                    const room = getRoom("team-standup");
                    assert.ok(room, "Room should exist in server state");
                    const participant = room.participants.get(client.id);
                    assert.strictEqual(participant.displayName, "Alice Williams");
                    assert.strictEqual(participant.username, "alice_w");
                    assert.strictEqual(participant.isGuest, false);

                    client.disconnect();
                    done();
                });
            });
        });

        test("should allow guest connection with sanitized guest display name", (t, done) => {
            const client = createClientSocket({ guestName: "Guest Charlie<script>" });

            client.on("connect", () => {
                client.emit("join-call", "public-demo", "Guest Charlie<script>");

                client.on("host-status", (status) => {
                    assert.strictEqual(status.isHost, true);
                    const room = getRoom("public-demo");
                    const participant = room.participants.get(client.id);
                    assert.strictEqual(participant.isGuest, true);
                    // Sanitized against script tag
                    assert.ok(!participant.displayName.includes("<script>"));

                    client.disconnect();
                    done();
                });
            });
        });

        test("should reject connection when an invalid JWT token is supplied", (t, done) => {
            const client = createClientSocket({ token: "invalid.tampered.jwt_token" });

            client.on("connect_error", (err) => {
                assert.ok(err.message.includes("AUTH_INVALID_TOKEN"));
                client.disconnect();
                done();
            });
        });
    });

    describe("2. Room Lifecycle & Membership Validation", () => {
        test("should designate first participant as Host and second participant as non-host", (t, done) => {
            const hostClient = createClientSocket({ token: aliceToken });
            const guestClient = createClientSocket({ token: bobToken });

            hostClient.on("connect", () => {
                hostClient.emit("join-call", "sprint-planning");

                hostClient.once("host-status", (hostStatus) => {
                    assert.strictEqual(hostStatus.isHost, true, "First participant must be Host");

                    guestClient.on("connect", () => {
                        guestClient.emit("join-call", "sprint-planning");

                        guestClient.once("host-status", (guestStatus) => {
                            assert.strictEqual(guestStatus.isHost, false, "Second participant must NOT be Host");

                            const room = getRoom("sprint-planning");
                            assert.strictEqual(room.participants.size, 2);
                            assert.strictEqual(room.hostSocketId, hostClient.id);

                            hostClient.disconnect();
                            guestClient.disconnect();
                            done();
                        });
                    });
                });
            });
        });

        test("should broadcast user-joined with accurate participant list to room members", (t, done) => {
            const client1 = createClientSocket({ token: aliceToken });
            const client2 = createClientSocket({ token: bobToken });

            client1.on("connect", () => {
                client1.emit("join-call", "retro-room");

                client2.on("connect", () => {
                    client1.on("user-joined", (joinedSocketId, participantList, namesMap) => {
                        if (joinedSocketId === client2.id) {
                            assert.ok(participantList.includes(client1.id));
                            assert.ok(participantList.includes(client2.id));
                            assert.strictEqual(namesMap[client1.id], "Alice Williams");
                            assert.strictEqual(namesMap[client2.id], "Bob Martin");

                            client1.disconnect();
                            client2.disconnect();
                            done();
                        }
                    });

                    client2.emit("join-call", "retro-room");
                });
            });
        });

        test("should reject join-call with empty or invalid room code format", (t, done) => {
            const client = createClientSocket({ token: aliceToken });

            client.on("connect", () => {
                client.on("error-message", (err) => {
                    assert.strictEqual(err.code, "INVALID_ROOM_CODE");
                    client.disconnect();
                    done();
                });

                client.emit("join-call", "   ///   ");
            });
        });

        test("should handle duplicate join cleanly by moving socket to the new room", (t, done) => {
            const client = createClientSocket({ token: aliceToken });

            client.on("connect", () => {
                client.emit("join-call", "room-one");

                setTimeout(() => {
                    assert.ok(getRoom("room-one"));

                    // Join a second room with the same socket
                    client.emit("join-call", "room-two");

                    setTimeout(() => {
                        assert.strictEqual(getRoom("room-one"), null, "Previous room should be purged when empty");
                        assert.ok(getRoom("room-two"), "New room should contain participant");
                        assert.strictEqual(getRoom("room-two").participants.has(client.id), true);

                        client.disconnect();
                        done();
                    }, 50);
                }, 50);
            });
        });

        test("should handle explicit leave-call and notify remaining room members", (t, done) => {
            const client1 = createClientSocket({ token: aliceToken });
            const client2 = createClientSocket({ token: bobToken });

            client1.on("connect", () => {
                client1.emit("join-call", "leave-test-room");

                client2.on("connect", () => {
                    client2.emit("join-call", "leave-test-room");

                    setTimeout(() => {
                        client2.on("user-left", (leftSocketId) => {
                            assert.strictEqual(leftSocketId, client1.id);
                            const room = getRoom("leave-test-room");
                            assert.strictEqual(room.participants.has(client1.id), false);
                            assert.strictEqual(room.participants.has(client2.id), true);

                            client1.disconnect();
                            client2.disconnect();
                            done();
                        });

                        client1.emit("leave-call");
                    }, 50);
                });
            });
        });
    });

    describe("3. WebRTC Signaling & Room Boundary Isolation", () => {
        test("should successfully route WebRTC signals between peers in the same room", (t, done) => {
            const client1 = createClientSocket({ token: aliceToken });
            const client2 = createClientSocket({ token: bobToken });

            client1.on("connect", () => {
                client1.emit("join-call", "sync-room");

                client2.on("connect", () => {
                    client2.emit("join-call", "sync-room");

                    client2.on("signal", (fromId, message) => {
                        assert.strictEqual(fromId, client1.id);
                        const parsed = JSON.parse(message);
                        assert.strictEqual(parsed.sdp.type, "offer");

                        client1.disconnect();
                        client2.disconnect();
                        done();
                    });

                    // Allow join processing
                    setTimeout(() => {
                        client1.emit("signal", client2.id, JSON.stringify({ sdp: { type: "offer", sdp: "dummy-sdp-data" } }));
                    }, 50);
                });
            });
        });

        test("should reject and drop WebRTC signals directed to sockets in different rooms", (t, done) => {
            const clientRoomA = createClientSocket({ token: aliceToken });
            const clientRoomB = createClientSocket({ token: bobToken });

            clientRoomA.on("connect", () => {
                clientRoomA.emit("join-call", "room-alpha");

                clientRoomB.on("connect", () => {
                    clientRoomB.emit("join-call", "room-beta");

                    let signalReceived = false;
                    clientRoomB.on("signal", () => {
                        signalReceived = true;
                    });

                    setTimeout(() => {
                        // Attempt cross-room signal
                        clientRoomA.emit("signal", clientRoomB.id, JSON.stringify({ sdp: { type: "offer" } }));

                        setTimeout(() => {
                            assert.strictEqual(signalReceived, false, "Cross-room signaling must be blocked");
                            clientRoomA.disconnect();
                            clientRoomB.disconnect();
                            done();
                        }, 100);
                    }, 50);
                });
            });
        });
    });

    describe("4. Chat Sanitization & Server-Enforced Identity", () => {
        test("should enforce genuine sender name from JWT and sanitize XSS payloads", (t, done) => {
            const client1 = createClientSocket({ token: aliceToken });
            const client2 = createClientSocket({ token: bobToken });

            client1.on("connect", () => {
                client1.emit("join-call", "chat-room");

                client2.on("connect", () => {
                    client2.emit("join-call", "chat-room");

                    client2.on("chat-message", (data, sender, senderSocketId, timestamp) => {
                        assert.strictEqual(senderSocketId, client1.id);
                        // Authoritative sender name must be Alice Williams, not spoofed
                        assert.strictEqual(sender, "Alice Williams");
                        // XSS content must be escaped
                        assert.strictEqual(data, "Hello &lt;b&gt;Team&lt;/b&gt; &amp; &lt;script&gt;alert(1)&lt;/script&gt;");
                        assert.ok(timestamp);

                        client1.disconnect();
                        client2.disconnect();
                        done();
                    });

                    setTimeout(() => {
                        client1.emit("chat-message", "Hello <b>Team</b> & <script>alert(1)</script>", "ImpersonatedHost");
                    }, 50);
                });
            });
        });
    });

    describe("5. Host Moderation Authorization", () => {
        test("should allow host to mute participant and reject non-host mute attempts", (t, done) => {
            const host = createClientSocket({ token: aliceToken });
            const participant = createClientSocket({ token: bobToken });

            host.on("connect", () => {
                host.emit("join-call", "moderation-room");

                participant.on("connect", () => {
                    participant.emit("join-call", "moderation-room");

                    setTimeout(() => {
                        // 1. Participant attempts to mute Host (Unauthorized)
                        let hostMuted = false;
                        host.on("force-mute-audio", () => {
                            hostMuted = true;
                        });

                        participant.once("error-message", (err) => {
                            assert.strictEqual(err.code, "UNAUTHORIZED_HOST_ACTION");
                            assert.strictEqual(hostMuted, false, "Host must NOT be muted by non-host");

                            // 2. Host mutes participant (Authorized)
                            participant.once("force-mute-audio", () => {
                                host.disconnect();
                                participant.disconnect();
                                done();
                            });

                            host.emit("host-mute-user", participant.id);
                        });

                        participant.emit("host-mute-user", host.id);
                    }, 50);
                });
            });
        });

        test("should allow host to kick participant and notify room peers", (t, done) => {
            const host = createClientSocket({ token: aliceToken });
            const participant = createClientSocket({ token: bobToken });

            host.on("connect", () => {
                host.emit("join-call", "kick-room");

                participant.on("connect", () => {
                    participant.emit("join-call", "kick-room");

                    setTimeout(() => {
                        let kicked = false;

                        participant.on("force-kicked-out", () => {
                            kicked = true;
                        });

                        host.on("user-left", (leftSocketId) => {
                            assert.strictEqual(leftSocketId, participant.id);
                            assert.strictEqual(kicked, true);

                            const room = getRoom("kick-room");
                            assert.strictEqual(room.participants.size, 1);
                            assert.strictEqual(room.participants.has(participant.id), false);

                            host.disconnect();
                            participant.disconnect();
                            done();
                        });

                        host.emit("host-kick-user", participant.id);
                    }, 50);
                });
            });
        });

        test("should broadcast meeting-ended-by-host and clean up room state when host ends meeting", (t, done) => {
            const host = createClientSocket({ token: aliceToken });
            const participant = createClientSocket({ token: bobToken });

            host.on("connect", () => {
                host.emit("join-call", "end-meeting-room");

                participant.on("connect", () => {
                    participant.emit("join-call", "end-meeting-room");

                    setTimeout(() => {
                        participant.on("meeting-ended-by-host", () => {
                            const room = getRoom("end-meeting-room");
                            assert.strictEqual(room, null, "Room should be deleted after meeting ended");

                            host.disconnect();
                            participant.disconnect();
                            done();
                        });

                        host.emit("end-meeting-all");
                    }, 50);
                });
            });
        });
    });

    describe("6. Disconnect, Host Succession & Room Teardown", () => {
        test("should promote next participant to Host when current host disconnects", (t, done) => {
            const host = createClientSocket({ token: aliceToken });
            const participant = createClientSocket({ token: bobToken });

            host.on("connect", () => {
                host.emit("join-call", "succession-room");

                participant.on("connect", () => {
                    participant.emit("join-call", "succession-room");

                    setTimeout(() => {
                        participant.on("host-status", (status) => {
                            assert.strictEqual(status.isHost, true, "Participant must be promoted to Host");
                            const room = getRoom("succession-room");
                            assert.strictEqual(room.hostSocketId, participant.id);

                            participant.disconnect();
                            done();
                        });

                        host.disconnect();
                    }, 50);
                });
            });
        });

        test("should completely remove room from memory when last user disconnects", (t, done) => {
            const client = createClientSocket({ token: aliceToken });

            client.on("connect", () => {
                client.emit("join-call", "ephemeral-room");

                setTimeout(() => {
                    assert.ok(getRoom("ephemeral-room"));
                    assert.strictEqual(getActiveRoomCount(), 1);

                    client.disconnect();

                    setTimeout(() => {
                        assert.strictEqual(getRoom("ephemeral-room"), null, "Room must be purged after last user disconnects");
                        assert.strictEqual(getActiveRoomCount(), 0);
                        done();
                    }, 100);
                }, 50);
            });
        });
    });
});
