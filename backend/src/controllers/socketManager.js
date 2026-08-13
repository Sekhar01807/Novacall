import { Server } from "socket.io"

let connections = {}
let messages = {}
let timeOnline = {}
let roomHosts = {}
let userNames = {}

// XSS Sanitization helper
const sanitizeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

// Helper to find which room a socket belongs to
const findRoomForSocket = (socketId) => {
    for (const [roomKey, roomValue] of Object.entries(connections)) {
        if (roomValue.includes(socketId)) {
            return [roomKey, true];
        }
    }
    return ['', false];
};

export const initializeSocketIO = (server) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
            allowedHeaders: ["*"],
            credentials: true
        }
    });

    io.on("connection", (socket) => {
        console.log("CLIENT CONNECTED:", socket.id);

        socket.on("join-call", (path, username) => {
            if (username) {
                userNames[socket.id] = sanitizeHTML(username);
            }

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)
            timeOnline[socket.id] = new Date();

            // First user in room is designated as Host
            if (!roomHosts[path]) {
                roomHosts[path] = socket.id;
            }

            // Emit host status to joining socket
            const isSocketHost = socket.id === roomHosts[path];
            io.to(socket.id).emit("host-status", { isHost: isSocketHost });

            // Broadcast room participant names map
            const roomNamesMap = {};
            connections[path].forEach(sId => {
                roomNamesMap[sId] = userNames[sId] || "Participant";
            });

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path], roomNamesMap)
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'], messages[path][a]['timestamp'])
                }
            }
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        // Real-Time Chat Handler
        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                const sanitizedData = sanitizeHTML(data);
                const sanitizedSender = sanitizeHTML(sender);
                const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

                messages[matchingRoom].push({ 'sender': sanitizedSender, "data": sanitizedData, "socket-id-sender": socket.id, "timestamp": timestamp })
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", sanitizedData, sanitizedSender, socket.id, timestamp)
                })
            }
        })

        // Sync Mute / Camera State across participants
        socket.on("toggle-media-state", (mediaType, isEnabled) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);
            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("user-media-state-changed", socket.id, mediaType, isEnabled);
                    }
                });
            }
        });

        // Host Controls (Server-side Host Validated)
        socket.on("host-mute-user", (targetSocketId) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);
            if (found && roomHosts[matchingRoom] === socket.id) {
                io.to(targetSocketId).emit("force-mute-audio");
            }
        });

        socket.on("host-kick-user", (targetSocketId) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);
            if (found && roomHosts[matchingRoom] === socket.id) {
                io.to(targetSocketId).emit("force-kicked-out");
            }
        });

        socket.on("end-meeting-all", () => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);
            if (found && roomHosts[matchingRoom] === socket.id) {
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("meeting-ended-by-host");
                });
            }
        });

        socket.on("disconnect", () => {
            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        let key = k;
                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id);
                        }
                        let index = connections[key].indexOf(socket.id);
                        connections[key].splice(index, 1);
                        delete userNames[socket.id];

                        // Host promotion on disconnect
                        if (roomHosts[key] === socket.id) {
                            if (connections[key] && connections[key].length > 0) {
                                roomHosts[key] = connections[key][0];
                                io.to(connections[key][0]).emit("host-status", { isHost: true });
                            } else {
                                delete roomHosts[key];
                            }
                        }

                        if (connections[key].length === 0) {
                            delete connections[key];
                            delete messages[key];
                            delete roomHosts[key];
                        }
                    }
                }
            }
        })
    })

    return io;
}