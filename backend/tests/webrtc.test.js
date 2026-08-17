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
import { resetAllRooms, getRoom } from "../src/sockets/roomState.js";
import { signJWT } from "../src/utils/jwt.js";

describe("WebRTC", () => {
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

    test("offer", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "webrtc-offer-room");
            client1.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            client2.emit("join-call", "webrtc-offer-room");
            client2.once("host-status", () => resolve());
        });

        const signalPromise = new Promise((resolve) => {
            client2.once("signal", (fromId, message) => {
                resolve({ fromId, parsed: JSON.parse(message) });
            });
        });

        const offerPayload = {
            sdp: {
                type: "offer",
                sdp: "v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\n"
            }
        };
        client1.emit("signal", client2.id, JSON.stringify(offerPayload));

        const { fromId, parsed } = await signalPromise;
        assert.strictEqual(fromId, client1.id);
        assert.strictEqual(parsed.sdp.type, "offer");
        assert.strictEqual(parsed.sdp.sdp, "v=0\r\no=- 12345 2 IN IP4 127.0.0.1\r\n");

        client1.disconnect();
        client2.disconnect();
    });

    test("answer", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "webrtc-answer-room");
            client1.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            client2.emit("join-call", "webrtc-answer-room");
            client2.once("host-status", () => resolve());
        });

        const signalPromise = new Promise((resolve) => {
            client1.once("signal", (fromId, message) => {
                resolve({ fromId, parsed: JSON.parse(message) });
            });
        });

        const answerPayload = {
            sdp: {
                type: "answer",
                sdp: "v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\n"
            }
        };
        client2.emit("signal", client1.id, JSON.stringify(answerPayload));

        const { fromId, parsed } = await signalPromise;
        assert.strictEqual(fromId, client2.id);
        assert.strictEqual(parsed.sdp.type, "answer");
        assert.strictEqual(parsed.sdp.sdp, "v=0\r\no=- 67890 2 IN IP4 127.0.0.1\r\n");

        client1.disconnect();
        client2.disconnect();
    });

    test("ICE candidates", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "webrtc-ice-room");
            client1.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            client2.emit("join-call", "webrtc-ice-room");
            client2.once("host-status", () => resolve());
        });

        const signalPromise = new Promise((resolve) => {
            client2.once("signal", (fromId, message) => {
                resolve({ fromId, parsed: JSON.parse(message) });
            });
        });

        const icePayload = {
            ice: {
                candidate: "candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host",
                sdpMid: "0",
                sdpMLineIndex: 0
            }
        };
        client1.emit("signal", client2.id, JSON.stringify(icePayload));

        const { fromId, parsed } = await signalPromise;
        assert.strictEqual(fromId, client1.id);
        assert.ok(parsed.ice);
        assert.strictEqual(parsed.ice.candidate, "candidate:1 1 UDP 2122260223 192.168.1.100 54321 typ host");

        client1.disconnect();
        client2.disconnect();
    });

    test("peer disconnect", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        await new Promise((resolve) => {
            client1.emit("join-call", "webrtc-drop-room");
            client1.once("host-status", () => resolve());
        });

        await new Promise((resolve) => {
            client2.emit("join-call", "webrtc-drop-room");
            client2.once("host-status", () => resolve());
        });

        const leftPromise = new Promise((resolve) => {
            client2.once("user-left", (leftId) => resolve(leftId));
        });

        const client1Id = client1.id;
        client1.disconnect();
        const leftId = await leftPromise;

        assert.strictEqual(leftId, client1Id);
        const room = getRoom("webrtc-drop-room");
        assert.strictEqual(room.participants.has(client1Id), false);

        client2.disconnect();
    });

    test("reconnection", async () => {
        const client = await connectClient({ token: aliceToken });

        await new Promise((resolve) => {
            client.emit("join-call", "webrtc-reconnect-room");
            client.once("host-status", () => resolve());
        });

        const room = getRoom("webrtc-reconnect-room");
        assert.ok(room);
        assert.strictEqual(room.participants.has(client.id), true);

        client.disconnect();
        await new Promise((r) => setTimeout(r, 50));

        // Reconnect new socket
        const reconnectedClient = await connectClient({ token: aliceToken });
        const statusPromise = new Promise((resolve) => {
            reconnectedClient.once("host-status", (status) => resolve(status));
        });

        reconnectedClient.emit("join-call", "webrtc-reconnect-room");
        const status = await statusPromise;

        assert.strictEqual(status.roomCode, "webrtc-reconnect-room");
        reconnectedClient.disconnect();
    });

    test("cross-room signaling rejection", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        // Client 1 joins room A
        await new Promise((resolve) => {
            client1.emit("join-call", "room-a");
            client1.once("host-status", () => resolve());
        });

        // Client 2 joins room B
        await new Promise((resolve) => {
            client2.emit("join-call", "room-b");
            client2.once("host-status", () => resolve());
        });

        let signalReceived = false;
        client2.on("signal", () => {
            signalReceived = true;
        });

        // Client 1 attempts to signal Client 2 across rooms
        client1.emit("signal", client2.id, JSON.stringify({ sdp: { type: "offer" } }));

        await new Promise((r) => setTimeout(r, 100));
        assert.strictEqual(signalReceived, false, "Cross-room signaling must be rejected server-side");

        client1.disconnect();
        client2.disconnect();
    });
});
