import { Server } from "socket.io"

let connections = {}
let messages = {}
let timeOnline = {}
let polls = {}
let roomLocks = {}
let qnaList = {}
let roomHosts = {}

// XSS Sanitization helper (Item 5)
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

        socket.on("join-call", (path) => {
            if (roomLocks[path] === true) {
                socket.emit("room-locked-error", "This meeting has been locked by the host.");
                return;
            }

            if (connections[path] === undefined) {
                connections[path] = []
            }
            connections[path].push(socket.id)
            timeOnline[socket.id] = new Date();

            // Item 1: Server-side host tracking — first user in room is host
            if (!roomHosts[path]) {
                roomHosts[path] = socket.id;
            }

            // Emit host status to joining socket
            io.to(socket.id).emit("host-status", { isHost: socket.id === roomHosts[path] });

            for (let a = 0; a < connections[path].length; a++) {
                io.to(connections[path][a]).emit("user-joined", socket.id, connections[path])
            }

            if (messages[path] !== undefined) {
                for (let a = 0; a < messages[path].length; ++a) {
                    io.to(socket.id).emit("chat-message", messages[path][a]['data'],
                        messages[path][a]['sender'], messages[path][a]['socket-id-sender'])
                }
            }

            if (polls[path] !== undefined) {
                io.to(socket.id).emit("poll-list", polls[path]);
            }

            if (qnaList[path] !== undefined) {
                io.to(socket.id).emit("qna-list", qnaList[path]);
            }
        })

        socket.on("signal", (toId, message) => {
            io.to(toId).emit("signal", socket.id, message);
        })

        socket.on("chat-message", (data, sender) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);

            if (found === true) {
                if (messages[matchingRoom] === undefined) {
                    messages[matchingRoom] = []
                }

                // Item 5: Sanitize chat messages for XSS protection
                const sanitizedData = sanitizeHTML(data);
                const sanitizedSender = sanitizeHTML(sender);

                messages[matchingRoom].push({ 'sender': sanitizedSender, "data": sanitizedData, "socket-id-sender": socket.id })
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-message", sanitizedData, sanitizedSender, socket.id)
                })
            }
        })

        // Shared Meeting Notes
        socket.on("sync-notes", (notes) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    if (elem !== socket.id) {
                        io.to(elem).emit("receive-notes", notes);
                    }
                });
            }
        });

        // Live Reactions
        socket.on("send-reaction", (emoji, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("receive-reaction", emoji, sender, socket.id);
                });
            }
        });

        // Hand Raising
        socket.on("raise-hand", (raised, sender) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found) {
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("user-raised-hand", socket.id, sender, raised);
                });
            }
        });

        // Live Polls
        socket.on("create-poll", (pollData) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found) {
                if (!polls[matchingRoom]) polls[matchingRoom] = [];
                polls[matchingRoom].push(pollData);
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("poll-list", polls[matchingRoom]);
                });
            }
        });

        socket.on("vote-poll", (pollId, optionIndex) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && polls[matchingRoom]) {
                polls[matchingRoom] = polls[matchingRoom].map(p => {
                    if (p.id === pollId) {
                        const updatedOpts = p.options.map((opt, idx) =>
                            idx === optionIndex ? { ...opt, votes: opt.votes + 1 } : opt
                        );
                        return { ...p, options: updatedOpts, totalVotes: p.totalVotes + 1 };
                    }
                    return p;
                });
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("poll-list", polls[matchingRoom]);
                });
            }
        });

        socket.on("end-poll", (pollId) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && polls[matchingRoom]) {
                polls[matchingRoom] = polls[matchingRoom].map(p => 
                    p.id === pollId ? { ...p, status: 'closed' } : p
                );
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("poll-list", polls[matchingRoom]);
                });
            }
        });

        socket.on("delete-poll", (pollId) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && polls[matchingRoom]) {
                polls[matchingRoom] = polls[matchingRoom].filter(p => p.id !== pollId);
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("poll-list", polls[matchingRoom]);
                });
            }
        });

        // Real-Time Q&A Handlers
        socket.on("ask-question", (questionData) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found) {
                if (!qnaList[matchingRoom]) qnaList[matchingRoom] = [];
                qnaList[matchingRoom].push(questionData);
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("qna-list", qnaList[matchingRoom]);
                });
            }
        });

        socket.on("upvote-question", (questionId) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && qnaList[matchingRoom]) {
                qnaList[matchingRoom] = qnaList[matchingRoom].map(q => 
                    q.id === questionId ? { ...q, upvotes: (q.upvotes || 0) + 1 } : q
                );
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("qna-list", qnaList[matchingRoom]);
                });
            }
        });

        socket.on("answer-question", (questionId) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && qnaList[matchingRoom]) {
                qnaList[matchingRoom] = qnaList[matchingRoom].map(q => 
                    q.id === questionId ? { ...q, answered: true } : q
                );
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("qna-list", qnaList[matchingRoom]);
                });
            }
        });

        socket.on("delete-question", (questionId) => {
            const [matchingRoom, found] = Object.entries(connections)
                .reduce(([room, isFound], [roomKey, roomValue]) => {
                    if (!isFound && roomValue.includes(socket.id)) {
                        return [roomKey, true];
                    }
                    return [room, isFound];
                }, ['', false]);

            if (found && qnaList[matchingRoom]) {
                qnaList[matchingRoom] = qnaList[matchingRoom].filter(q => q.id !== questionId);
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("qna-list", qnaList[matchingRoom]);
                });
            }
        });

        // Host Controls — Item 1: Server-side host validation
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

        socket.on("toggle-chat-permission", (allowChat) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);
            if (found && roomHosts[matchingRoom] === socket.id) {
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("chat-permission-updated", allowChat);
                });
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

        socket.on("toggle-room-lock", (isLocked) => {
            const [matchingRoom, found] = findRoomForSocket(socket.id);
            if (found && roomHosts[matchingRoom] === socket.id) {
                roomLocks[matchingRoom] = isLocked;
                connections[matchingRoom].forEach((elem) => {
                    io.to(elem).emit("room-lock-updated", isLocked);
                });
            }
        });

        socket.on("disconnect", () => {
            var diffTime = Math.abs(timeOnline[socket.id] - new Date())
            var key

            for (const [k, v] of JSON.parse(JSON.stringify(Object.entries(connections)))) {
                for (let a = 0; a < v.length; ++a) {
                    if (v[a] === socket.id) {
                        key = k
                        for (let a = 0; a < connections[key].length; ++a) {
                            io.to(connections[key][a]).emit('user-left', socket.id)
                        }
                        var index = connections[key].indexOf(socket.id)
                        connections[key].splice(index, 1)

                        // Item 1: Host promotion on disconnect
                        if (roomHosts[key] === socket.id) {
                            if (connections[key] && connections[key].length > 0) {
                                // Promote next participant to host
                                roomHosts[key] = connections[key][0];
                                io.to(connections[key][0]).emit("host-status", { isHost: true });
                            } else {
                                delete roomHosts[key];
                            }
                        }

                        if (connections[key].length === 0) {
                            delete connections[key]
                            delete polls[key]
                            delete roomLocks[key]
                            delete roomHosts[key]
                        }
                    }
                }
            }
        })
    })

    return io;
}