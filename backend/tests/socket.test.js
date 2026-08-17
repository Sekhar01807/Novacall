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

    const createClientSocket = (auth = {}) => {
        return Client(`http://localhost:${serverPort}`, {
            auth,
            transports: ["websocket"],
            forceNew: true
        });
    };

    test("connect", (t, done) => {
        const client = createClientSocket({ guestName: "Guest User" });
        client.on("connect", () => {
            assert.ok(client.id, "Client socket must receive connection ID");
            client.disconnect();
            done();
        });
    });

    test("authenticate", (t, done) => {
        const client = createClientSocket({ token: aliceToken });
        client.on("connect", () => {
            client.emit("join-call", "auth-test-room");
            client.on("host-status", () => {
                const room = getRoom("auth-test-room");
                assert.ok(room);
                const participant = room.participants.get(client.id);
                assert.strictEqual(participant.displayName, "Alice Williams");
                assert.strictEqual(participant.isGuest, false);
                client.disconnect();
                done();
            });
        });
    });

    test("join", (t, done) => {
        const client1 = createClientSocket({ token: aliceToken });
        const client2 = createClientSocket({ token: bobToken });

        client1.on("connect", () => {
            client1.emit("join-call", "join-test-room");

            client2.on("connect", () => {
                client1.on("user-joined", (joinedSocketId, participantList, namesMap) => {
                    if (joinedSocketId === client2.id) {
                        assert.ok(participantList.includes(client1.id));
                        assert.ok(participantList.includes(client2.id));
                        assert.strictEqual(namesMap[client2.id], "Bob Martin");
                        client1.disconnect();
                        client2.disconnect();
                        done();
                    }
                });

                client2.emit("join-call", "join-test-room");
            });
        });
    });

    test("leave", (t, done) => {
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
                        client1.disconnect();
                        client2.disconnect();
                        done();
                    });

                    client1.emit("leave-call");
                }, 50);
            });
        });
    });

    test("disconnect", (t, done) => {
        const client1 = createClientSocket({ token: aliceToken });
        const client2 = createClientSocket({ token: bobToken });

        client1.on("connect", () => {
            client1.emit("join-call", "disconnect-test-room");

            client2.on("connect", () => {
                client2.emit("join-call", "disconnect-test-room");

                setTimeout(() => {
                    client2.on("user-left", (leftSocketId) => {
                        assert.strictEqual(leftSocketId, client1.id);
                        client2.disconnect();
                        done();
                    });

                    client1.disconnect();
                }, 50);
            });
        });
    });

    test("duplicate join", (t, done) => {
        const client = createClientSocket({ token: aliceToken });

        client.on("connect", () => {
            client.emit("join-call", "first-room");

            setTimeout(() => {
                assert.ok(getRoom("first-room"));

                // Same socket joins second room
                client.emit("join-call", "second-room");

                setTimeout(() => {
                    assert.strictEqual(getRoom("first-room"), null, "Empty old room must be cleaned up");
                    assert.ok(getRoom("second-room"));
                    client.disconnect();
                    done();
                }, 50);
            }, 50);
        });
    });

    test("host assignment", (t, done) => {
        const hostClient = createClientSocket({ token: aliceToken });
        const guestClient = createClientSocket({ token: bobToken });

        hostClient.on("connect", () => {
            hostClient.emit("join-call", "host-assign-room");

            hostClient.once("host-status", (hostStatus) => {
                assert.strictEqual(hostStatus.isHost, true, "First participant must be Host");

                guestClient.on("connect", () => {
                    guestClient.emit("join-call", "host-assign-room");

                    guestClient.once("host-status", (guestStatus) => {
                        assert.strictEqual(guestStatus.isHost, false, "Second participant must not be Host");
                        hostClient.disconnect();
                        guestClient.disconnect();
                        done();
                    });
                });
            });
        });
    });

    test("host disconnect", (t, done) => {
        const host = createClientSocket({ token: aliceToken });
        const peer = createClientSocket({ token: bobToken });

        host.on("connect", () => {
            host.emit("join-call", "host-disconnect-room");

            peer.on("connect", () => {
                peer.emit("join-call", "host-disconnect-room");

                setTimeout(() => {
                    peer.on("host-status", (status) => {
                        assert.strictEqual(status.isHost, true, "Peer must be promoted to host");
                        peer.disconnect();
                        done();
                    });

                    host.disconnect();
                }, 50);
            });
        });
    });

    test("moderation", (t, done) => {
        const host = createClientSocket({ token: aliceToken });
        const participant = createClientSocket({ token: bobToken });

        host.on("connect", () => {
            host.emit("join-call", "mod-room");

            participant.on("connect", () => {
                participant.emit("join-call", "mod-room");

                setTimeout(() => {
                    // Participant unauthorized mute attempt
                    participant.once("error-message", (err) => {
                        assert.strictEqual(err.code, "UNAUTHORIZED_HOST_ACTION");

                        // Host authorized mute
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

    test("room cleanup", (t, done) => {
        const client = createClientSocket({ token: aliceToken });

        client.on("connect", () => {
            client.emit("join-call", "cleanup-room");

            setTimeout(() => {
                assert.ok(getRoom("cleanup-room"));
                assert.strictEqual(getActiveRoomCount(), 1);

                client.disconnect();

                setTimeout(() => {
                    assert.strictEqual(getRoom("cleanup-room"), null, "Room must be purged after last participant exits");
                    assert.strictEqual(getActiveRoomCount(), 0);
                    done();
                }, 100);
            }, 50);
        });
    });
});
