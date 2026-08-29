/**
 * In-Memory Room State Manager
 * 
 * Architecture & Deployment Trade-offs:
 * - Current Implementation: Process-local in-memory Map structure for active meeting rooms,
 *   participants, host delegation, media states, and ephemeral in-meeting chat replay.
 * - Performance Benefit: Sub-millisecond synchronous room lookups and state mutations without database I/O.
 * - Single-Instance Limitation: State is bound to the running Node.js process. Restarting the server
 *   mid-meeting drops active room presence (requiring WebRTC reconnect), and horizontal multi-instance
 *   scaling requires migrating this layer to a distributed Redis store (e.g., using @socket.io/redis-adapter
 *   and Redis JSON / Hashes for cluster-wide room sync).
 */

// Key: roomCode => Room Object
// Room Object: {
//   roomCode: string,
//   hostSocketId: string,
//   participants: Map<socketId, { socketId, userId, username, displayName, isGuest, joinedAt, audioMuted, videoMuted }>,
//   messages: Array<{ sender: string, data: string, socketIdSender: string, timestamp: string }>,
//   createdAt: Date
// }
const rooms = new Map();

// Helper to sanitize HTML strings
export const sanitizeHTML = (str) => {
    if (typeof str !== 'string') return '';
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;');
};

/**
 * Normalize and sanitize a room code / path
 * @param {string} roomCodeOrUrl - Raw URL or room code string
 * @returns {string} - Cleaned room code
 */
export const normalizeRoomCode = (roomCodeOrUrl) => {
    if (!roomCodeOrUrl || typeof roomCodeOrUrl !== 'string') return '';
    let cleaned = roomCodeOrUrl.trim();
    // If a full URL was provided, extract the pathname
    if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
        try {
            const url = new URL(cleaned);
            cleaned = url.pathname;
        } catch (e) {
            // fallback
        }
    }
    // Remove leading and trailing slashes and query params
    cleaned = cleaned.replace(/^\/+|\/+$/g, '').split('?')[0].split('#')[0];
    // Allow only alphanumeric, dashes, and underscores (max 64 chars)
    cleaned = cleaned.replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 64);
    return cleaned;
};

/**
 * Get or create a room instance
 * @param {string} roomCode
 * @returns {Object}
 */
export const getOrCreateRoom = (roomCode) => {
    const code = normalizeRoomCode(roomCode);
    if (!code) return null;

    if (!rooms.has(code)) {
        rooms.set(code, {
            roomCode: code,
            hostSocketId: null,
            participants: new Map(),
            messages: [],
            createdAt: new Date()
        });
    }
    return rooms.get(code);
};

/**
 * Get an existing room
 * @param {string} roomCode
 * @returns {Object|null}
 */
export const getRoom = (roomCode) => {
    const code = normalizeRoomCode(roomCode);
    return rooms.get(code) || null;
};

// Default maximum participant capacity per video meeting room (Optimized for full-mesh P2P WebRTC)
export const DEFAULT_MAX_ROOM_CAPACITY = parseInt(process.env.MAX_ROOM_CAPACITY, 10) || 6;

/**
 * Check if a room has reached its maximum participant limit
 * @param {string} roomCode
 * @param {number} [maxCapacity]
 * @returns {boolean}
 */
export const isRoomFull = (roomCode, maxCapacity = DEFAULT_MAX_ROOM_CAPACITY) => {
    const room = getRoom(roomCode);
    if (!room) return false;
    return room.participants.size >= maxCapacity;
};

/**
 * Add a participant to a room (with room capacity validation)
 * @param {string} roomCode
 * @param {string} socketId
 * @param {Object} user - Authenticated user or guest metadata
 * @param {number} [maxCapacity] - Optional custom max room capacity
 * @returns {{ room: Object, isHost: boolean, participant: Object } | { error: string, maxCapacity: number }}
 */
export const addParticipant = (roomCode, socketId, user = {}, maxCapacity = DEFAULT_MAX_ROOM_CAPACITY) => {
    const room = getOrCreateRoom(roomCode);
    if (!room) return null;

    // Check if user is already a participant (e.g. reconnect or state sync)
    const isExistingParticipant = room.participants.has(socketId);

    // Enforce room capacity limit for new joiners
    if (!isExistingParticipant && room.participants.size >= maxCapacity) {
        return {
            error: "ROOM_CAPACITY_EXCEEDED",
            maxCapacity
        };
    }

    // First user in room becomes the host
    const isFirstParticipant = room.participants.size === 0 || !room.hostSocketId;
    if (isFirstParticipant) {
        room.hostSocketId = socketId;
    }

    // Determine clean username and display name (never expose email domain in chat/participants)
    let rawDisplayName = user.username || user.name || (user.isGuest ? 'Guest' : 'Participant');
    if (typeof rawDisplayName === 'string' && rawDisplayName.includes('@')) {
        rawDisplayName = (user.username && !user.username.includes('@')) ? user.username : rawDisplayName.split('@')[0];
    }
    const displayName = sanitizeHTML(rawDisplayName);

    let rawUsername = user.username || displayName;
    if (typeof rawUsername === 'string' && rawUsername.includes('@')) {
        rawUsername = rawUsername.split('@')[0];
    }
    const username = sanitizeHTML(rawUsername || displayName);

    const participant = {
        socketId,
        userId: user.id || socketId,
        username,
        displayName,
        isGuest: Boolean(user.isGuest),
        joinedAt: new Date(),
        audioMuted: false,
        videoMuted: false
    };

    room.participants.set(socketId, participant);

    return {
        room,
        isHost: room.hostSocketId === socketId,
        participant
    };
};

/**
 * Remove a participant from a room and handle host succession or room deletion
 * @param {string} roomCode
 * @param {string} socketId
 * @returns {{ room: Object|null, removedParticipant: Object|null, newHostSocketId: string|null, roomDeleted: boolean }}
 */
export const removeParticipant = (roomCode, socketId) => {
    const room = getRoom(roomCode);
    if (!room) return { room: null, removedParticipant: null, newHostSocketId: null, roomDeleted: false };

    const removedParticipant = room.participants.get(socketId) || null;
    room.participants.delete(socketId);

    let newHostSocketId = null;
    let roomDeleted = false;

    if (room.participants.size === 0) {
        // Room is empty, destroy it
        rooms.delete(room.roomCode);
        roomDeleted = true;
    } else if (room.hostSocketId === socketId) {
        // Host left -> Promote the next participant in the room
        const nextHostSocketId = room.participants.keys().next().value;
        room.hostSocketId = nextHostSocketId;
        newHostSocketId = nextHostSocketId;
    }

    return {
        room: roomDeleted ? null : room,
        removedParticipant,
        newHostSocketId,
        roomDeleted
    };
};

/**
 * Find which room a socket currently belongs to
 * @param {string} socketId
 * @returns {{ roomCode: string, room: Object } | { roomCode: '', room: null }}
 */
export const findRoomBySocketId = (socketId) => {
    for (const [roomCode, room] of rooms.entries()) {
        if (room.participants.has(socketId)) {
            return { roomCode, room };
        }
    }
    return { roomCode: '', room: null };
};

/**
 * Centralized Participant Verification Helper
 * Ensures the socket belongs to an active room and returns authoritative metadata
 * @param {import('socket.io').Socket|string} socketOrId
 * @param {string} [expectedRoomCode]
 * @returns {{ ok: boolean, error?: string, roomCode?: string, room?: Object, participant?: Object }}
 */
export const requireRoomParticipant = (socketOrId, expectedRoomCode = null) => {
    const socketId = typeof socketOrId === 'string' ? socketOrId : socketOrId?.id;
    if (!socketId) return { ok: false, error: "INVALID_SOCKET" };

    const { roomCode, room } = findRoomBySocketId(socketId);
    if (!roomCode || !room) {
        return { ok: false, error: "NOT_IN_ROOM" };
    }

    if (expectedRoomCode && normalizeRoomCode(expectedRoomCode) !== roomCode) {
        return { ok: false, error: "ROOM_MISMATCH" };
    }

    const participant = room.participants.get(socketId);
    return { ok: true, roomCode, room, participant };
};

/**
 * Centralized Host Authorization Helper
 * Validates server-side that the socket is the designated host of their current room
 * @param {import('socket.io').Socket|string} socketOrId
 * @param {string} [expectedRoomCode]
 * @returns {{ ok: boolean, error?: string, roomCode?: string, room?: Object }}
 */
export const requireRoomHost = (socketOrId, expectedRoomCode = null) => {
    const participantCheck = requireRoomParticipant(socketOrId, expectedRoomCode);
    if (!participantCheck.ok) {
        return { ok: false, error: participantCheck.error };
    }

    const { roomCode, room } = participantCheck;
    const socketId = typeof socketOrId === 'string' ? socketOrId : socketOrId?.id;

    if (room.hostSocketId !== socketId) {
        return { ok: false, error: "UNAUTHORIZED_HOST_ACTION", roomCode, room };
    }

    return { ok: true, roomCode, room };
};

/**
 * Check if a socket is the host of a room
 * @param {string} roomCode
 * @param {string} socketId
 * @returns {boolean}
 */
export const isHost = (roomCode, socketId) => {
    const room = getRoom(roomCode);
    if (!room) return false;
    return room.hostSocketId === socketId;
};

/**
 * Check if a socket is a member of a room
 * @param {string} roomCode
 * @param {string} socketId
 * @returns {boolean}
 */
export const isParticipant = (roomCode, socketId) => {
    const room = getRoom(roomCode);
    if (!room) return false;
    return room.participants.has(socketId);
};

/**
 * Get all participant socket IDs in a room
 * @param {string} roomCode
 * @returns {string[]}
 */
export const getParticipantSocketIds = (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return [];
    return Array.from(room.participants.keys());
};

/**
 * Get map of socketId => displayName for all participants in a room
 * @param {string} roomCode
 * @returns {Object.<string, string>}
 */
export const getParticipantNamesMap = (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return {};
    const map = {};
    for (const [sId, p] of room.participants.entries()) {
        map[sId] = p.displayName;
    }
    return map;
};

/**
 * Add a chat message to a room
 * @param {string} roomCode
 * @param {string} socketIdSender
 * @param {string} senderName
 * @param {string} messageText
 * @returns {Object|null}
 */
export const addChatMessage = (roomCode, socketIdSender, senderName, messageText) => {
    const room = getRoom(roomCode);
    if (!room) return null;

    const sanitizedData = sanitizeHTML(messageText);
    const sanitizedSender = sanitizeHTML(senderName);
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messageObj = {
        data: sanitizedData,
        sender: sanitizedSender,
        'socket-id-sender': socketIdSender,
        timestamp
    };

    // Store up to last 200 messages per room to prevent unbounded memory growth
    if (room.messages.length >= 200) {
        room.messages.shift();
    }
    room.messages.push(messageObj);

    return messageObj;
};

/**
 * Get message history for a room
 * @param {string} roomCode
 * @returns {Array}
 */
export const getChatMessages = (roomCode) => {
    const room = getRoom(roomCode);
    if (!room) return [];
    return [...room.messages];
};

/**
 * Update media state (audio / video) for a participant
 * @param {string} roomCode
 * @param {string} socketId
 * @param {'audio'|'video'} mediaType
 * @param {boolean} isEnabled
 */
export const updateMediaState = (roomCode, socketId, mediaType, isEnabled) => {
    const room = getRoom(roomCode);
    if (!room) return;
    const participant = room.participants.get(socketId);
    if (participant) {
        if (mediaType === 'audio') participant.audioMuted = !isEnabled;
        if (mediaType === 'video') participant.videoMuted = !isEnabled;
    }
};

/**
 * Delete a room and clean up all resources
 * @param {string} roomCode
 */
export const deleteRoom = (roomCode) => {
    const code = normalizeRoomCode(roomCode);
    rooms.delete(code);
};

/**
 * Clear all rooms (primarily for test tear-down)
 */
export const resetAllRooms = () => {
    rooms.clear();
};

/**
 * Get total number of active rooms (for health / monitoring)
 */
export const getActiveRoomCount = () => rooms.size;
