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
import { resetAllRooms } from "../src/sockets/roomState.js";
import { signJWT } from "../src/utils/jwt.js";
import { resetChatRateLimits } from "../src/sockets/handlers/chat.handler.js";

describe("Chat", () => {
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
        resetChatRateLimits();
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

    test("valid message", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        try {
            await new Promise((resolve) => {
                client1.emit("join-call", "chat-valid-room");
                client1.once("host-status", () => resolve());
            });

            await new Promise((resolve) => {
                client2.emit("join-call", "chat-valid-room");
                client2.once("host-status", () => resolve());
            });

            const chatPromise = new Promise((resolve) => {
                client2.once("chat-message", (data, sender, senderSocketId, timestamp) => {
                    resolve({ data, sender, senderSocketId, timestamp });
                });
            });

            client1.emit("chat-message", "Hello team!");
            const { data, sender, senderSocketId, timestamp } = await chatPromise;

            assert.strictEqual(data, "Hello team!");
            assert.strictEqual(sender, "Alice Williams");
            assert.strictEqual(senderSocketId, client1.id);
            assert.ok(timestamp);
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });

    test("XSS", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        try {
            await new Promise((resolve) => {
                client1.emit("join-call", "chat-xss-room");
                client1.once("host-status", () => resolve());
            });

            await new Promise((resolve) => {
                client2.emit("join-call", "chat-xss-room");
                client2.once("host-status", () => resolve());
            });

            const chatPromise = new Promise((resolve) => {
                client2.once("chat-message", (data) => resolve(data));
            });

            client1.emit("chat-message", '<script>alert("xss")</script>');
            const data = await chatPromise;

            assert.strictEqual(data, '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
            assert.ok(!data.includes("<script>"));
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });

    test("oversized message", async () => {
        const client1 = await connectClient({ token: aliceToken });
        const client2 = await connectClient({ token: bobToken });

        try {
            await new Promise((resolve) => {
                client1.emit("join-call", "chat-size-room");
                client1.once("host-status", () => resolve());
            });

            await new Promise((resolve) => {
                client2.emit("join-call", "chat-size-room");
                client2.once("host-status", () => resolve());
            });

            const chatPromise = new Promise((resolve) => {
                client2.once("chat-message", (data) => resolve(data));
            });

            const hugeMessage = "A".repeat(3000);
            client1.emit("chat-message", hugeMessage);
            const data = await chatPromise;

            // Message should be truncated to max limit of 1000 chars
            assert.ok(data.length <= 1000);
            assert.strictEqual(data.length, 1000);
        } finally {
            client1.disconnect();
            client2.disconnect();
        }
    });

    test("spam", async () => {
        const client = await connectClient({ token: aliceToken });

        try {
            await new Promise((resolve) => {
                client.emit("join-call", "chat-spam-room");
                client.once("host-status", () => resolve());
            });

            const rateLimitPromise = new Promise((resolve) => {
                client.on("error-message", (err) => {
                    if (err.code === "RATE_LIMIT_EXCEEDED") {
                        resolve(err);
                    }
                });
            });

            // Send 7 messages rapidly (limit is 5 per 3s window)
            for (let i = 1; i <= 7; i++) {
                client.emit("chat-message", `Spam message #${i}`);
            }

            const err = await rateLimitPromise;
            assert.strictEqual(err.code, "RATE_LIMIT_EXCEEDED");
            assert.ok(err.retryAfterMs);
        } finally {
            client.disconnect();
        }
    });

    test("unauthorized sender", async () => {
        // Socket attempts to send chat message before joining any room
        const client = await connectClient({ token: aliceToken });

        try {
            const errorPromise = new Promise((resolve) => {
                client.once("error-message", (err) => resolve(err));
            });

            client.emit("chat-message", "Orphaned message");
            const err = await errorPromise;
            assert.strictEqual(err.code, "NOT_IN_ROOM");
        } finally {
            client.disconnect();
        }
    });
});
