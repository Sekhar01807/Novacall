<div align="center">

# NovaCall

**Enterprise-Grade Real-Time Multi-Party Video Conferencing & Signaling Platform**

[![Live Demo](https://img.shields.io/badge/Demo-Live_Deployment-007acc?style=flat&logo=vercel&logoColor=white)](https://novacall-two.vercel.app/)
[![React 19](https://img.shields.io/badge/React_19-20232A?style=flat&logo=react&logoColor=61DAFB)](https://react.dev/)
[![Node.js 22](https://img.shields.io/badge/Node.js_22_LTS-339933?style=flat&logo=nodedotjs&logoColor=white)](https://nodejs.org/)
[![Express.js 5](https://img.shields.io/badge/Express.js_5-000000?style=flat&logo=express&logoColor=white)](https://expressjs.com/)
[![Socket.IO 4.8](https://img.shields.io/badge/Socket.IO_4.8-010101?style=flat&logo=socketdotio&logoColor=white)](https://socket.io/)
[![WebRTC](https://img.shields.io/badge/WebRTC-333333?style=flat&logo=webrtc&logoColor=white)](https://webrtc.org/)
[![MongoDB Atlas](https://img.shields.io/badge/MongoDB_Atlas-47A248?style=flat&logo=mongodb&logoColor=white)](https://www.mongodb.com/)
[![Nodemailer](https://img.shields.io/badge/Nodemailer-SMTP_Dispatch-22c55e?style=flat&logo=gmail&logoColor=white)](backend/src/services/email.service.js)
[![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=flat&logo=docker&logoColor=white)](docker-compose.yml)
[![Playwright](https://img.shields.io/badge/Tests-Playwright_E2E-2EAD33?style=flat&logo=playwright&logoColor=white)](e2e/)
[![API Docs](https://img.shields.io/badge/Docs-OpenAPI_3.0-85EA2D?style=flat&logo=swagger&logoColor=black)](http://localhost:8000/api/docs)

<br />

[Live Demo](https://novacall-two.vercel.app/) • [API Documentation](http://localhost:8000/api/docs) • [Socket Protocol Spec](backend/docs/SOCKET_EVENTS.md) • [Report Issue](https://github.com/Sekhar01807/Novacall/issues)

<br />

![NovaCall Video Meeting Room](./screenshots/meeting_room.png)

</div>

---

## Overview

NovaCall is an open-source real-time video conferencing platform built without commercial third-party WebRTC wrappers. It integrates a custom full-mesh WebRTC engine with a modular Socket.IO signaling layer, adaptive STUN/TURN NAT traversal, server-authoritative room moderation, dual `HttpOnly` cookie and stateless JWT authentication with instant revocation (`tokenVersion`), atomic IDOR-protected REST APIs, transactional SMTP email dispatches (Nodemailer), and request correlation tracking (`X-Request-Id`).

The platform includes a containerized Docker Compose environment, comprehensive unit and security test suites, and end-to-end browser testing with Playwright.

---

## Core Capabilities

### Video Conferencing & Adaptive NAT Traversal
- **Custom WebRTC Mesh Engine**: Multi-party audio/video streaming with dynamic peer connection pooling, track lifecycle management, and bandwidth optimization.
- **Adaptive NAT Traversal**: Dual Google STUN servers for direct P2P connections with automatic OpenRelay TURN fallback for restrictive symmetric NATs and enterprise firewalls.
- **In-Call Controls**: Camera and microphone toggles, native screen sharing via `getDisplayMedia`, and dynamic responsive video grids.
- **Connection Health Diagnostics**: Real-time round-trip time (RTT) tracking, jitter estimation, and live signal quality indicators.

### Server-Authoritative Room Moderation
- **Automatic Host Designation**: The initial participant entering a room is automatically assigned Host privileges.
- **Host Moderation Controls**: Remote participant microphone muting (`host-mute-user`), participant expulsion (`host-kick-user`), and global meeting termination (`end-meeting-all`).
- **Dynamic Host Succession**: Seamless promotion of the next longest-standing participant when the active host disconnects.
- **Mesh Capacity Enforcement**: Hard cap of 6 concurrent participants per room optimized for full-mesh P2P bandwidth.

### Real-Time Chat & Anti-Abuse
- **Low-Latency Message Delivery**: Broadcast via dedicated Socket.IO room channels with client-side optimistic UI updates.
- **Dual-Layer XSS Protection**: Server-side HTML entity sanitization (`sanitizeHTML`), 1000-character payload truncation, and contextual React JSX string encoding on the client.
- **Sliding-Window Rate Limiting**: Anti-flood protection (maximum 5 messages per 3-second window) per socket connection with automatic memory cleanup upon disconnection.
- **Chat History Synchronization**: Automatic synchronization of in-meeting chat history to newly joined participants.

### Transactional Email Dispatching & Modern Card Templates
- **Welcome Onboarding Email**: Automatically dispatched to newly registered users introducing platform capabilities with a direct link to the dashboard.
- **Scheduled Meeting Calendar Dispatches**: Rich HTML email card with dynamic calendar date tile, formatted date/time, timezone, room code badge, agenda, and direct one-click join link dispatched to both the host and invited guest email lists.
- **Cryptographic Password Reset**: Secure 6-digit verification code emails with single-use 15-minute TTL.
- **Modern Email Card System**: Built with cross-client bulletproof table markup, glowing header gradient accents (`#3B82F6` $\rightarrow$ `#EC4899`), midnight brand bar, monospace code pills, and responsive layout for Gmail, Apple Mail, Outlook, and mobile clients.

### Zero-Trust Authentication & IDOR Protection
- **Dual-Layer Session Authentication**: Issues secure `HttpOnly`, `SameSite`, `Secure` session cookies to neutralize XSS token exfiltration while retaining Bearer header authorization support for decoupled cross-origin frontend deployments.
- **Instant Session Revocation (`tokenVersion`)**: Atomic user `tokenVersion` increments immediately invalidate all active JWTs and cookies across devices upon password changes or global sign-out (`signOutAllDevices`).
- **Safe Profile DTO Protection**: Explicit public DTO whitelisting (`buildUserProfileDTO`), strictly preventing leakage of reset tokens, expiration timestamps, token versions, or credentials.
- **Cryptographic Password Reset**: Secure 6-digit verification codes stored exclusively as SHA-256 hashes with 15-minute TTL, 5-attempt rate limits, and constant-time generic responses preventing account enumeration.
- **Strict Multi-Tenant Resource Isolation**: Atomic queries prevent unauthorized access or deletion of third-party meetings, histories, or profile data.
- **Standardized API Responses**: Centralized response formatting with structured error codes, correlation IDs (`X-Request-Id`, `X-Correlation-Id`), and API versioning (`X-API-Version`).

---

## Tech Stack

| Layer | Technologies | Purpose |
| :--- | :--- | :--- |
| **Frontend** | React 19, Vite, Material UI (MUI v7), Axios, WebRTC API | Single-Page Application (SPA), Design System & Real-Time Media Pipeline |
| **Backend** | Node.js 22 LTS, Express.js 5, Socket.IO 4.8 | RESTful API & Real-Time WebSocket Signaling Server |
| **Database** | MongoDB Atlas, Mongoose 9 | Multi-tenant schema storage with compound indexes |
| **Email Service** | Nodemailer, SMTP (Gmail / Brevo / Custom) | Transactional email dispatches (welcome, meeting invites, password resets) |
| **Security** | jsonwebtoken, cookie-parser, bcrypt, crypto (SHA-256), Hardened CSP | Zero-trust auth, HttpOnly cookies, session revocation & sliding rate limiting |
| **Infrastructure** | Docker, Docker Compose, Nginx, Vercel | Containerized multi-service orchestration and cloud edge hosting |
| **Testing** | Node.js Test Runner (`node:test`), Playwright E2E | Unit, security, socket lifecycle, email fallback, and E2E browser test suites |

---

## System Architecture

```mermaid
graph TD
    Client["React 19 Client (Vite + MUI v7)"]
    Client -->|"REST API v1 (JWT / HttpOnly Cookie + Request ID)"| Express["Express.js 5 Backend"]
    Client -->|"WebSocket Signaling (JWT Handshake)"| Socket["Socket.IO Signaling Server"]
    Express -->|"Indexed Schemas"| Mongo[("MongoDB Atlas (Mongoose 9)")]
    Express -->|"SMTP Dispatches"| Mail["Nodemailer Email Service"]
    Socket -->|"SDP & ICE Signaling"| WebRTC["WebRTC Engine"]
    WebRTC -->|"Direct P2P Traversal"| STUN["STUN Servers (Google)"]
    WebRTC -.->|"Relay Fallback"| TURN["TURN Servers (OpenRelay)"]
```

> [!NOTE]
> For detailed Socket.IO event specifications, payload schemas, rate limit rules, and sequence diagrams, refer to the [Socket.IO Events Documentation](backend/docs/SOCKET_EVENTS.md).

### Communication Flow

```mermaid
flowchart LR
    User([User]) --> App[React Frontend]
    App -->|"HTTP / REST API v1"| Backend["Express + MongoDB"]
    Backend -->|"Transactional Mail"| Mail["SMTP / Inbox Dispatch"]
    App -->|"WebSocket Events"| Signaling["Socket.IO Signaling"]
    Signaling -->|"Peer Exchange"| Peers["Meeting Participants (WebRTC)"]
```

---

## WebRTC Signaling & Connection Sequence

NovaCall coordinates direct peer-to-peer media streaming using an interactive ICE exchange pipeline:

```mermaid
sequenceDiagram
    autonumber
    actor A as Participant A (Host)
    participant S as Socket.IO Signaling Server
    actor B as Participant B (Peer)

    A->>S: join-call (Room ID, Display Name)
    Note over S: Room State Init & Host Assignment
    S-->>A: host-status({ isHost: true })

    B->>S: join-call (Room ID, Display Name)
    S-->>B: host-status({ isHost: false })
    S->>A: user-joined (Participant B info)
    S->>B: user-joined (Participant list)

    Note over A,B: Full-Mesh WebRTC Signaling Phase
    A->>S: signal: SDP Offer (target: B)
    S->>B: signal: SDP Offer (from: A)
    B->>S: signal: SDP Answer (target: A)
    S->>A: signal: SDP Answer (from: B)

    A->>S: signal: ICE Candidates (target: B)
    S->>B: signal: ICE Candidates (from: A)
    B->>S: signal: ICE Candidates (target: A)
    S->>A: signal: ICE Candidates (from: B)

    Note over A,B: Peer Connection Established (Direct P2P or TURN Relay)
    A<<-->>B: Real-Time Audio / Video / Screen Share Streaming
```

---

## Project Structure

```
Novacall/
├── .github/
│   └── workflows/
│       └── ci.yml                 # Node 22 CI pipeline (npm ci, tests, build)
├── backend/
│   ├── docs/
│   │   └── SOCKET_EVENTS.md      # Socket.IO protocol specification & sequence flows
│   ├── src/
│   │   ├── controllers/          # REST route controllers
│   │   │   ├── user.controller.js          # Auth (login, register + welcome email dispatch)
│   │   │   ├── profile.controller.js       # Profile CRUD, cookie clearance & session revocation
│   │   │   ├── passwordReset.controller.js # SHA-256 token generation & reset code dispatch
│   │   │   ├── meetingHistory.controller.js# Activity pagination, schedule CRUD & invite dispatches
│   │   │   └── socketManager.js            # Socket initialization wrapper
│   │   ├── docs/                 # OpenAPI 3.0 specification & Swagger UI
│   │   ├── middleware/           # auth.middleware.js, error.middleware.js, requestId.middleware.js
│   │   ├── models/               # UserModel.js, meetingModel.js, scheduledMeetingModel.js
│   │   ├── routes/               # UsersRoutes.js
│   │   ├── services/             # email.service.js (Nodemailer SMTP & card templates)
│   │   ├── sockets/              # Modular Socket.IO architecture
│   │   │   ├── handlers/         # room, signaling, chat, media, moderation handlers
│   │   │   ├── middleware/       # Handshake JWT authentication & validator
│   │   │   ├── roomState.js      # In-memory room and message store
│   │   │   └── index.js          # Socket server initialization & routing
│   │   ├── utils/                # apiError.js, errorCodes.js, jwt.js, logger.js, roomCodeGenerator.js, validators.js
│   │   └── app.js                # Express app, CSP, cookieParser, rate limiting & CORS
│   ├── tests/
│   │   ├── auth.test.js          # Auth, cookies, email service fallback & revocation tests
│   │   ├── meetings.test.js      # Scheduled meetings & IDOR tests
│   │   ├── socket.test.js        # Socket lifecycle, room capacity & moderation tests
│   │   ├── chat.test.js          # Rate limiting, XSS sanitization & room isolation tests
│   │   ├── webrtc.test.js        # WebRTC signaling boundary isolation tests
│   │   └── errorMiddleware.test.js# Centralized error handler & API exception tests
│   ├── Dockerfile                # Multi-stage Alpine container
│   ├── package.json
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── contexts/             # AuthContext.jsx (withCredentials: true)
│   │   ├── pages/                # Landing, Auth, Home, History, Profile, VideoMeet
│   │   │   ├── home.jsx          # Dashboard with duration, timezone & guest invite scheduling
│   │   │   └── videoMeet/        # Meeting orchestrator and components
│   │   │       ├── components/   # VideoGrid, VideoTile, ChatPanel, ParticipantList, etc.
│   │   │       ├── hooks/        # useWebRTCConnection.js, useMediaDevices.js
│   │   │       ├── services/     # socketService.js, meetingService.js
│   │   │       └── VideoMeet.jsx # Meeting view orchestrator
│   │   ├── styles/               # CSS modules & styling
│   │   ├── utils/                # textUtils.js, withAuth.jsx
│   │   ├── App.jsx               # Application routing & providers
│   │   ├── index.css             # Design tokens & CSS variables
│   │   └── index.jsx
│   ├── Dockerfile                # Multi-stage Node 22 + Nginx SPA container
│   ├── nginx.conf                # Nginx SPA rewrite routing
│   ├── package.json
│   └── vite.config.js
├── e2e/
│   ├── flagship-flow.spec.js     # Full journey: Register → Login → Meet → Moderate → Leave
│   ├── auth.spec.js              # Authentication & onboarding tests
│   ├── lobby.spec.js             # Device readiness & lobby preview tests
│   ├── meeting.spec.js           # In-meeting controls and chat drawer tests
│   ├── webrtc-mesh.spec.js       # Multi-browser WebRTC peer discovery tests
│   ├── history.spec.js           # Meeting history & pagination tests
│   └── navigation.spec.js        # Route navigation & theme tests
├── screenshots/                  # Application interface captures
├── docker-compose.yml            # Multi-service stack (Frontend + Backend + MongoDB)
├── playwright.config.js          # Playwright E2E configuration
└── README.md                     # Project documentation
```

---

## Security Architecture & Authorization Invariants

NovaCall implements defense-in-depth security across HTTP REST and WebSocket signaling layers:

### 1. Pure HttpOnly Cookie Session Architecture & Strict CORS
- **Pure HttpOnly Cookie Protection**: Login and registration issue secure `HttpOnly`, `SameSite=Lax/None`, `Secure` session cookies with 7-day expiration. The JWT access token is **never exposed in JSON response bodies** and **never stored in `localStorage`**, eliminating credential exfiltration risks from Cross-Site Scripting (XSS).
- **Strict Origin Whitelisting**: CORS explicitly permits only configured and trusted origins (`https://novacall-two.vercel.app`, local dev servers). Wildcard `.vercel.app` allowances are strictly eliminated.
- **Origin & CSRF Defense**: State-changing endpoints (`POST`, `PUT`, `PATCH`, `DELETE`) are protected by `csrfProtectionMiddleware`, enforcing strict `Origin` and `Referer` validation against the trusted origin whitelist.
- **Session Cleanup**: `logout`, `signOutAllDevices`, `changePassword`, and `deleteAccount` explicitly clear session cookies (`res.clearCookie('token')`) and increment the user's `tokenVersion`.

### 2. Invariable IDOR (Insecure Direct Object Reference) Protection
- **Scheduled Meetings**: Creation, retrieval, and deletion queries are strictly scoped to `req.user.username`. `DELETE /delete_scheduled_meeting/:id` executes an atomic `findOneAndDelete({ _id: id, user_id: req.user.username })` query. If the target resource belongs to another account, the server rejects the operation with `403 FORBIDDEN` (differentiated from `404 NOT_FOUND`).
- **Meeting Activity History**: History records and paginated query results are strictly bound to the authenticated `req.user.username`.
- **User Profile DTO Protection**: `GET /get_profile` and `POST /update_profile` return an explicit public DTO (`buildUserProfileDTO`), strictly preventing leakage of `resetPasswordToken`, `resetPasswordExpires`, `resetPasswordAttempts`, `tokenVersion`, or credentials.
- **Atomic Account Deletion**: Executes within a MongoDB transaction session to ensure clean cascading deletion of user history, scheduled meetings, and credentials.
- **Anti-Enumeration Generic Responses**: Generic responses on `/login` (`AUTH_INVALID_CREDENTIALS`) and `/forgot_password` ensure malicious actors cannot enumerate registered usernames or emails.

### 3. Five-Stage Socket.IO Event Authorization Pipeline
Every real-time event passes through an authoritative 5-stage validation pipeline:

```
Handshake Authentication ──▶ Room Membership ──▶ Payload Validation ──▶ Authorization ──▶ State Transition
```

1. **Authentication**: Handshake JWT verification via `HttpOnly` cookie or authorization claims attaches verified user identity (`socket.user`). Client-supplied display names cannot spoof authenticated accounts.
2. **Room Membership**: Sockets must be active participants in the target room. Cross-room signaling and chat emissions are rejected.
3. **Payload Validation**: Input sizes, strings, and types are validated; signaling messages are capped at 64KB; chat messages are capped at 1000 characters.
4. **Authorization**: Host-exclusive actions (`host-mute-user`, `host-kick-user`, `end-meeting-all`) are verified server-side via `room.hostSocketId === socket.id`.
5. **State Transition**: State updates (media muting, participant eviction, room destruction) update `roomState` and notify room peers. Rate-limit tracking maps are automatically purged upon socket disconnect.

### 4. Password-Reset Production Boundary & Durable Rate Limiting
- **Cryptographic Token Hashing**: Verification codes are generated via `crypto.randomInt(100000, 1000000)` and stored exclusively as a **SHA-256 hash** (`crypto.createHash("sha256")`).
- **Durable Attempt Persistence**: Invalid verification attempts are immediately persisted to MongoDB (`user.resetPasswordAttempts`), ensuring the strict **max 5 failed attempts** rate limit cannot be reset by server process restarts.
- **TTL & Invalidation**: Reset codes expire strictly after **15 minutes**. When 5 attempts are exceeded or a password reset succeeds, tokens are permanently deleted from database and memory.
- **Nodemailer Dispatch**: In production mode with configured SMTP credentials, reset codes are delivered out-of-band to the user's verified inbox; in local development without SMTP, the code is previewed in logs for automated test runners.

---

## REST API Reference

| Endpoint | Method | Auth Required | Description |
| :--- | :---: | :---: | :--- |
| **Authentication & Password Recovery** | | | |
| `/api/v1/users/register` | `POST` | No | Register new user account; sets HttpOnly cookie; sends Welcome Email |
| `/api/v1/users/login` | `POST` | No | Authenticate credentials; sets secure HttpOnly session cookie |
| `/api/v1/users/logout` | `POST` | No | Clear active HttpOnly session cookie |
| `/api/v1/users/forgot_password` | `POST` | No | Request 6-digit SHA-256 reset verification code; dispatches email card |
| `/api/v1/users/reset_password` | `POST` | No | Verify reset code and update user password |
| **User Profile & Security** | | | |
| `/api/v1/users/get_profile` | `GET` | Yes | Retrieve authenticated user profile (safe DTO) |
| `/api/v1/users/update_profile` | `POST` | Yes | Update user preferences, status, and theme settings |
| `/api/v1/users/change_password` | `POST` | Yes | Change user password, clear cookies, and invalidate sessions |
| `/api/v1/users/signout_all` | `POST` | Yes | Clear cookies and invalidate all active JWTs by incrementing `tokenVersion` |
| `/api/v1/users/delete_account` | `POST` | Yes | Permanently delete account and all associated meetings/history |
| **Meeting Management & History** | | | |
| `/api/v1/users/add_to_activity` | `POST` | Yes | Record a joined meeting code into user's activity log |
| `/api/v1/users/get_all_activity` | `GET` | Yes | Paginated meeting history with optional regex search query |
| `/api/v1/users/create_scheduled_meeting` | `POST` | Yes | Schedule conference; dispatches calendar emails to host & invitees |
| `/api/v1/users/get_upcoming_meetings` | `GET` | Yes | Fetch all scheduled meetings for the authenticated user |
| `/api/v1/users/delete_scheduled_meeting/:id` | `DELETE` | Yes | Atomic IDOR-protected cancellation of a scheduled meeting |
| **System & Monitoring** | | | |
| `/health` | `GET` | No | System health check (database connection status, uptime, timestamp) |
| `/api/docs` | `GET` | No | Interactive Swagger UI API explorer |
| `/api/openapi.json` | `GET` | No | OpenAPI 3.0 JSON specification |

---

## Automated Testing

NovaCall maintains a complete automated test matrix covering unit, security, socket lifecycle, email fallback, and end-to-end browser flows:

```bash
# Run all backend unit, security, socket, and email tests
npm run test:backend

# Run complete Playwright end-to-end test suite
npm run test:e2e

# Run Playwright E2E tests with interactive UI mode
npm run test:e2e:ui
```

### Backend Test Matrix (`backend/tests/`)
- **Authentication & Security (`auth.test.js`)**: Registration, duplicate rejection, login verification, expired JWT handling, tampered JWT detection, password reset SHA-256 hashing, rate limiting, `tokenVersion` revocation, safe profile DTO verification, anti-enumeration generic responses, and **Nodemailer email service fallback tests (welcome, reset, schedule)**.
- **Meetings & IDOR Invariants (`meetings.test.js`)**: Room code generation, scheduled meeting creation (`scheduled_date`, `scheduled_time`, `duration`, `time_zone`), pagination, atomic deletion, IDOR isolation across history, profile updates, and credential changes.
- **Socket.IO Lifecycle (`socket.test.js`)**: JWT handshake authentication, identity spoofing prevention, room join/leave lifecycle, host assignment, host succession upon disconnect, host mute/kick/end-meeting authorization, mesh capacity (6 users), and rate-limit map cleanup on disconnect.
- **Chat Anti-Abuse (`chat.test.js`)**: Sliding-window rate limiting (5 msg / 3s), XSS sanitization, 1000-character payload limits, and cross-room isolation.
- **WebRTC Signaling Boundary (`webrtc.test.js`)**: Intra-room SDP/ICE candidate relaying and cross-room signaling rejection.
- **Centralized Error & Global Middleware (`errorMiddleware.test.js`)**: Custom ApiError handling, async exception bubbling, 404 route handling, and standard error code payload formatting.


### Playwright E2E Test Suite (`e2e/`)
- **Flagship Flow (`flagship-flow.spec.js`)**: End-to-end user journey: Register → Login → Create Room → Join Stage → Moderate Participants → Toggle Controls → Send Chat → Leave Cleanly.
- **Authentication Flow (`auth.spec.js`)**: User registration, login verification, validation states, and auth redirection.
- **Lobby & Pre-Call Preview (`lobby.spec.js`)**: Camera/mic device readiness, permission checks, and stage initialization.
- **In-Meeting Controls (`meeting.spec.js`)**: Device state toggling, participant drawer, chat interface, and exit confirmation dialogs.
- **WebRTC Mesh Discovery (`webrtc-mesh.spec.js`)**: Multi-browser peer discovery, stream attachment, and media state propagation.
- **Meeting History (`history.spec.js`)**: Activity log persistence, search filtering, and pagination.
- **Navigation & Layout (`navigation.spec.js`)**: Route navigation, guest access rules, and responsive interface layout.

---

## Getting Started

### Option 1: Docker Compose (Recommended)

Spin up the entire stack (Frontend, Backend, and MongoDB) with a single command:

```bash
docker compose up --build
```

- **Frontend SPA**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/api/docs`
- **Health Check Endpoint**: `http://localhost:8000/health`

---

### Option 2: Local Manual Setup

#### 1. Clone Repository
```bash
git clone https://github.com/Sekhar01807/Novacall.git
cd Novacall
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in the `backend/` directory:
```env
PORT=8000
ATLASDB_URL=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=http://localhost:5173

# Optional: Gmail / SMTP Email Dispatch Configuration
SMTP_SERVICE=gmail
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
EMAIL_FROM="NovaCall Security" <your_email@gmail.com>
```

Start the backend service:
```bash
npm run dev
```

#### 3. Frontend Setup
In a new terminal window:
```bash
cd frontend
npm install
```

Create a `.env` file in the `frontend/` directory:
```env
VITE_API_URL=http://localhost:8000
```

Start the frontend development server:
```bash
npm run dev
```

The application will be accessible at `http://localhost:5173`.

---

## API Documentation & Monitoring

NovaCall includes interactive Swagger UI documentation and health monitoring:

- **Interactive API Explorer**: [`http://localhost:8000/api/docs`](http://localhost:8000/api/docs)
- **OpenAPI 3.0 Specification**: [`http://localhost:8000/api/openapi.json`](http://localhost:8000/api/openapi.json)

### Health Check Endpoint

**`GET /health`**
```json
{
  "status": "ok",
  "uptime": 342,
  "database": "connected",
  "timestamp": "2026-08-24T08:00:00.000Z"
}
```

---

## Environment Variables

### Backend Configuration (`backend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `PORT` | No | `8000` | HTTP and WebSocket server port |
| `ATLASDB_URL` | Yes | — | MongoDB Atlas connection string |
| `JWT_SECRET` | Yes | — | Secret key for HMAC-SHA256 JWT signing and verification |
| `FRONTEND_URL` | No | `http://localhost:5173` | Allowed CORS origins (comma-separated for multiple origins) |
| `MAX_ROOM_CAPACITY` | No | `6` | Maximum concurrent participants allowed per meeting room |
| `NODE_ENV` | No | `development` | Runtime environment (`development`, `production`, `test`) |
| `SMTP_SERVICE` | No | `gmail` | Preconfigured email service provider (e.g. `gmail`) |
| `SMTP_HOST` | No | `smtp.gmail.com` | Custom SMTP email server host |
| `SMTP_PORT` | No | `587` | SMTP server port (`587` for STARTTLS, `465` for SSL/TLS) |
| `SMTP_USER` | No | — | SMTP username / sender email address |
| `SMTP_PASS` | No | — | SMTP app password or secret key |
| `EMAIL_FROM` | No | `"NovaCall Security" <...>` | Sender display name and email address header |

### Frontend Configuration (`frontend/.env`)

| Variable | Required | Default | Description |
| :--- | :---: | :---: | :--- |
| `VITE_API_URL` | Yes | `http://localhost:8000` | Base URL for backend REST API and WebSocket connection |
| `VITE_TURN_URL` | No | — | Optional custom TURN relay server URL |
| `VITE_TURN_USERNAME` | No | — | Optional TURN server authentication username |
| `VITE_TURN_CREDENTIAL` | No | — | Optional TURN server authentication password/credential |

---

## Screenshots

| Landing Page | User Dashboard |
| :---: | :---: |
| ![Landing Page](./screenshots/landing.png) | ![Dashboard](./screenshots/dashboard.png) |
| **Video Meeting Stage** | **Chat & Participant Drawer** |
| ![Meeting Room](./screenshots/meeting_room.png) | ![Chat Panel](./screenshots/chat_panel.png) |
| **Meeting Activity History** | **User Profile & Settings** |
| ![Meeting History](./screenshots/history.png) | ![Profile Settings](./screenshots/profile.png) |

---

## Architecture Trade-offs & Deployment Scope

1. **Full-Mesh P2P Topology (6-Participant Capacity)**: Video and audio streams are exchanged directly peer-to-peer ($N-1$ streams per participant). The server enforces a hard limit of 6 participants per room to preserve client bandwidth and CPU usage. For larger rooms (20+ participants), transitioning to a Selective Forwarding Unit (SFU) architecture is recommended.
2. **Single-Instance In-Memory State**: Active meeting rooms, participant presence, and sliding-window rate limit counters are maintained in Node process memory for ultra-low latency signaling without database overhead. This single-node model is optimized for single-instance container deployments. For clustered horizontal scaling, state must be migrated to a shared Redis cluster (`@socket.io/redis-adapter` and Redis hash stores).
3. **Dual Authentication Boundary (HttpOnly Cookies + Bearer Tokens)**: The backend sets secure `HttpOnly` session cookies on authentication to mitigate XSS vector token theft while retaining Bearer header compatibility for decoupled cross-origin frontend hosting (e.g. Vercel + Render).
4. **Email Dispatching**: Password reset verification codes, welcome onboarding cards, and meeting invitations are dispatched via Nodemailer SMTP in production, with automatic development logger fallback during local testing.

---

## Roadmap

- [x] Modular Socket.IO architecture (signaling, room state, chat, media, and moderation handlers)
- [x] Modular REST controllers (`profile`, `passwordReset`, `meetingHistory`, `user`)
- [x] Hardened CSP headers, fail-closed CORS, and HttpOnly session cookies
- [x] IDOR protection and atomic resource ownership across all endpoints
- [x] Nodemailer SMTP email dispatch service with premium responsive HTML cards
- [x] Automated welcome onboarding emails and multi-invitee calendar dispatches
- [x] Playwright E2E flagship workflow test suite
- [x] Centralized API error codes and request correlation IDs (`X-Request-Id`)
- [ ] SFU Media Gateway integration (mediasoup / Pion) for high-capacity rooms
- [ ] Distributed Redis Pub/Sub adapter for multi-instance horizontal scaling

---

## Author

**Sekhar Reddy**
- GitHub: [@Sekhar01807](https://github.com/Sekhar01807)
- LinkedIn: [Sekhar Reddy](https://www.linkedin.com/in/sekhar-reddy-408560281)

