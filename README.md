# 🚀 NovaCall — Full-Stack Video Conferencing Platform

[![React](https://img.shields.io/badge/React-18.x-blue.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-18.x-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-black.svg)](https://expressjs.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Mongoose-brightgreen.svg)](https://www.mongodb.com/)
[![Socket.IO](https://img.shields.io/badge/Socket.IO-4.x-orange.svg)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-P2P-red.svg)](https://webrtc.org/)

**NovaCall** is a modern, responsive full-stack video conferencing application built with **React, Node.js, Express, MongoDB, Socket.IO, and WebRTC**. It enables peer-to-peer audio/video calling, real-time text chat, screen sharing, meeting scheduling, and host participant moderation in a clean, production-hardened architecture.

---

## 🏗️ System Architecture

```
                             ┌──────────────────────────────────────┐
                             │          CLIENT (React + Vite)       │
                             │  • WebRTC Media Streams              │
                             │  • Socket.IO Real-time Events        │
                             │  • Axios Bearer JWT Auth             │
                             └──────────────┬───────────────────────┘
                                            │
                    ┌───────────────────────┴───────────────────────┐
                    │                                               │
       REST APIs (JSON / Bearer Auth)               WebSocket Events (Signaling)
                    │                                               │
                    ▼                                               ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │      EXPRESS BACKEND        │                 │      SOCKET.IO SERVER       │
     │  • JWT Auth Middleware      │                 │  • WebRTC Signaling (SDP)   │
     │  • User Registration/Login  │                 │  • ICE Candidate Exchange   │
     │  • Meeting Scheduling CRUD  │                 │  • Real-time Chat Broadcast │
     │  • Meeting History Activity │                 │  • Host Control Validation  │
     └──────────────┬──────────────┘                 └──────────────┬──────────────┘
                    │                                               │
                    ▼                                               ▼
     ┌─────────────────────────────┐                 ┌─────────────────────────────┐
     │       MONGODB DATABASE      │                 │     PEER-TO-PEER WEBRTC     │
     │  • User Accounts & Profiles │                 │  • Audio/Video MediaStream  │
     │  • Scheduled Meetings       │                 │  • Screen Sharing Stream    │
     │  • User Meeting History     │                 │  • Direct Browser P2P Mesh  │
     └─────────────────────────────┘                 └─────────────────────────────┘
```

---

## ✨ Core Features

### 1. 🎥 Real-Time Video Conferencing (WebRTC + Socket.IO)
- **Peer-to-Peer Video/Audio**: Low-latency video calling powered by WebRTC `RTCPeerConnection` with STUN server NAT traversal.
- **Screen Sharing**: Live presentation mode utilizing `getDisplayMedia` with automatic track replacement.
- **Media Controls**: Instant local camera and microphone toggle with synchronized remote peer status indicators.
- **Auto-Reconnection**: Built-in ICE restart logic that recovers dropped connections seamlessly.

### 2. 💬 Real-Time In-Meeting Chat
- Broadcasted instant messaging across room participants.
- Server-side and client-side **XSS sanitization** to prevent script injection.
- Automatic link parsing and formatted 12-hour timestamps (`hh:mm a`).

### 3. 🛡️ Host Participant Moderation
- The first user entering a meeting room is designated as the **Host**.
- Hosts can **Mute** noisy participants, **Remove/Kick** participants, or **End Meeting for All**.
- Host authority is validated server-side to prevent unauthorized socket emissions.
- Automatic host promotion if the active host disconnects.

### 4. 🔐 JWT Authentication & Security
- User registration and login protected with **bcrypt password hashing** (salt rounds: 10).
- Stateless **JWT authentication** via `Authorization: Bearer <token>` headers validated by Express middleware.
- Input validation for email format and password complexity (8+ characters, uppercase, number).
- Session expiration detection with graceful redirection.

### 5. 📅 Meeting Scheduling & Activity History
- Create and persist scheduled meetings in MongoDB with title, date, time, and unique room code.
- Dashboard view displaying **Upcoming Scheduled Meetings** with countdowns and quick-start actions.
- Meeting history logging to track all attended and created sessions.

---

## 📂 Project Structure

```
NovaCall/
├── backend/
│   ├── src/
│   │   ├── controllers/
│   │   │   ├── user.controller.js      # Auth, profile, scheduling endpoints
│   │   │   └── socketManager.js        # WebRTC signaling, chat, host controls
│   │   ├── middleware/
│   │   │   └── auth.middleware.js      # JWT Bearer token authentication
│   │   ├── models/
│   │   │   ├── UserModel.js            # User accounts & preferences
│   │   │   ├── meetingModel.js         # User meeting history records
│   │   │   └── scheduledMeetingModel.js# Persistent scheduled meetings
│   │   ├── routes/
│   │   │   └── UsersRoutes.js          # REST route declarations
│   │   └── app.js                      # Express & HTTP server entry point
│   └── package.json
│
└── frontend/
    ├── src/
    │   ├── pages/
    │   │   ├── landingPage.jsx         # Marketing landing & feature showcase
    │   │   ├── authentication.jsx      # Login, registration, & guest join
    │   │   ├── home.jsx                # User dashboard & upcoming meetings
    │   │   ├── history.jsx             # Meeting activity history
    │   │   ├── profile.jsx             # User profile & account settings
    │   │   └── videoMeet/
    │   │       ├── VideoMeet.jsx       # Orchestrator meeting component
    │   │       ├── components/
    │   │       │   ├── VideoGrid.jsx   # Responsive video container & stage
    │   │       │   ├── VideoTile.jsx   # Individual peer stream & avatar
    │   │       │   ├── MeetingHeader.jsx # Room code & connection status
    │   │       │   ├── MeetingControls.jsx # Bottom control bar
    │   │       │   ├── ParticipantList.jsx # Participant drawer & host controls
    │   │       │   └── ChatPanel.jsx   # Side drawer real-time chat
    │   │       ├── hooks/
    │   │       │   └── useMediaDevices.js # getUserMedia & device hook
    │   │       └── services/
    │   │           ├── meetingService.js # REST API client
    │   │           └── socketService.js  # Socket.IO dispatch service
    │   ├── contexts/
    │   │   └── AuthContext.jsx         # Global user & auth context provider
    │   ├── App.jsx                     # Router & application shell
    │   └── main.jsx                    # Vite React mount
    └── package.json
```

---

## ⚡ Quickstart Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v16 or higher)
- [MongoDB](https://www.mongodb.com/) (Local instance or MongoDB Atlas URI)

### 1. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file inside `backend/`:
```env
PORT=8000
MONGO_URI=mongodb://localhost:27017/novacall
JWT_SECRET=your_super_secret_jwt_key_here
```

Start the backend server:
```bash
npm run dev
# Server running on http://localhost:8000
```

### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
# App running on http://localhost:5173
```

---

## 💡 Key Engineering Concepts for Technical Interviews

### 1. WebRTC Signaling Flow
1. **Offer Generation**: User A creates an SDP offer (`peerConnection.createOffer()`) and emits it to Socket.IO.
2. **Offer Dispatch**: Socket.IO forwards the offer payload to User B.
3. **Answer Generation**: User B sets remote description (`setRemoteDescription`), generates an SDP answer (`createAnswer`), and sends it back to User A.
4. **ICE Candidate Exchange**: As network routes are discovered via STUN servers, ICE candidates are exchanged over Socket.IO to establish a direct P2P media stream.

### 2. Authentication & Authorization
- **JWT Authentication**: Upon login, a signed JSON Web Token is returned to the client and stored in `localStorage`.
- **Axios Interceptor**: Client automatically attaches `Authorization: Bearer <token>` to all outbound REST requests.
- **Express Middleware**: `auth.middleware.js` extracts the bearer token, verifies signature and expiration, retrieves the user from MongoDB, and attaches `req.user`.

### 3. Real-Time Chat & State Synchronization
- **Rooms & Namespaces**: Socket.IO groups participants by meeting URL/code (`path`).
- **XSS Mitigation**: Messages are sanitized server-side and client-side before render.
- **Host Validation**: Socket events (`host-mute-user`, `host-kick-user`, `end-meeting-all`) check `roomHosts[path] === socket.id` on the server before execution.

---

## 📜 License
MIT License © 2026 NovaCall
