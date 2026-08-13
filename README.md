# NovaCall

A production-oriented full-stack real-time video conferencing application built with **Node.js 22 LTS, Express, React 19, WebSockets (Socket.IO), WebRTC (STUN + TURN Relay), MongoDB, and Vercel**.

[![License: MIT](https://img.shields.io/badge/License-MIT-007acc.svg)](LICENSE)
[![Frontend: React 19](https://img.shields.io/badge/Frontend-React%2019-007acc.svg)](https://reactjs.org/)
[![Backend: Node.js 22](https://img.shields.io/badge/Backend-Node.js%2022%20LTS-68a063.svg)](https://nodejs.org/)
[![Database: MongoDB Atlas](https://img.shields.io/badge/Database-MongoDB%20Atlas-47a248.svg)](https://www.mongodb.com/)
[![Realtime: Socket.IO](https://img.shields.io/badge/Realtime-Socket.IO%20%7C%20WebRTC-f05032.svg)](https://socket.io/)
[![Container: Docker](https://img.shields.io/badge/Docker-Compose%20Ready-2496ed.svg)](docker-compose.yml)
[![CI: GitHub Actions](https://img.shields.io/badge/CI-GitHub%20Actions-2088FF.svg)](.github/workflows/ci.yml)
[![Docs: OpenAPI 3.0](https://img.shields.io/badge/API%20Docs-Swagger-85EA2D.svg)](http://localhost:8000/api/docs)
[![Deployment: Vercel](https://img.shields.io/badge/Deployment-Vercel-007acc.svg)](https://novacall-two.vercel.app/)

NovaCall is a web-based video conferencing application that enables users to create and join meeting rooms, communicate through real-time audio/video, share their screen, exchange messages, and manage participants during a meeting.

The project was built to explore real-time communication, WebRTC-based media streaming, Socket.IO signaling, REST APIs, authentication, and persistent data management.

---

## 🚀 Live Demo

**Application:** [NovaCall (Live Deployment)](https://novacall-two.vercel.app/)

> *The application is deployed for demonstration purposes. Some functionality may depend on browser permissions and WebRTC network conditions.*

---

## ✨ Features

### 🔐 Authentication
- User registration and login
- JWT-based authentication
- Password hashing with bcrypt
- Protected user operations & route middleware
- User profile management
- Password change functionality

### 🎥 Video Conferencing
- Create and join meeting rooms
- Real-time audio and video communication
- Camera and microphone controls
- Screen sharing
- Participant video grid
- Join/leave meeting handling
- Meeting connection status

### 💬 Real-Time Communication
- Real-time meeting chat
- Room-based Socket.IO communication
- Instant message broadcasting
- Participant presence updates

### 👥 Meeting Management
- Host and participant roles
- Host participant controls (Mute participants, Remove participants, End meeting for all)
- Participant list drawer

### 📅 Meeting Scheduling
- Schedule future meetings
- View upcoming meetings
- Delete scheduled meetings
- Meeting information management

### 📊 Meeting History
- View previous meetings
- Store meeting activity
- Track meeting participation and history

### 👤 User Profile
- View profile information
- Update profile
- Manage account information

---

## 🛠️ Tech Stack

### Frontend
- **React** (v18)
- **Vite**
- **JavaScript (ES6+)**
- **Material UI (MUI)**
- **Axios**
- **WebRTC API**
- **Socket.IO Client**

### Backend
- **Node.js**
- **Express.js**
- **Socket.IO**
- **MongoDB** & **Mongoose**
- **JSON Web Tokens (JWT)**
- **bcrypt**

### Deployment
- **Vercel** — Frontend Client
- **Render / Node.js** — Backend Server
- **MongoDB Atlas** — Cloud Database

---

## 🏗️ Application Architecture

```
┌─────────────────────┐
│    React Client     │
│       (Vite)        │
└──────────┬──────────┘
           │
 ┌─────────┴─────────┐
 │                   │
REST API         Socket.IO
 │                   │
 ▼                   ▼
┌──────────────────┐ ┌──────────────────┐
│    Express.js    │ │ Realtime Server  │
│     Backend      │ │   (Socket.IO)    │
└────────┬─────────┘ └────────┬─────────┘
         │                    │
         ▼                    │
┌──────────────────┐          │
│     MongoDB      │          │
│   + Mongoose     │          │
└──────────────────┘          │
                              ▼
                     ┌───────────────────┐
                     │      WebRTC       │
                     │  Audio / Video /  │
                     │  Screen Sharing   │
                     └───────────────────┘
```

### Communication Flow
```
User
 │
 ▼
React Application
 │
 ├─── REST API ────────► Express ───► MongoDB
 │
 └─── Socket.IO ───────► Signaling Server ───► WebRTC ───► Meeting Participants
```

---

## 🔄 How a Meeting Works

### 1. User Authentication
The user registers or logs in through the React frontend:
```
React ──► POST /login ──► Express ──► MongoDB ──► JWT ──► Authenticated User
```

### 2. Meeting Creation
A user creates a meeting and receives a unique meeting room identifier:
```
Create Meeting ──► Generate Room ID ──► Store Meeting Info ──► Return Meeting Details
```

### 3. Joining a Meeting
When a participant joins a meeting:
```
Participant ──► React Meeting Room ──► Socket.IO Connection ──► Join Room ──► Exchange WebRTC Signaling ──► Establish Peer Connection
```

### 4. Real-Time Communication
Socket.IO is used for signaling and real-time application events (participant join/leave, chat messages, host controls, media states). WebRTC handles the actual audio/video media transmission directly peer-to-peer.

---

## 🌐 WebRTC Architecture

NovaCall uses WebRTC for peer-to-peer audio/video communication:

```
Participant A                        Signaling Server                        Participant B
     │                                      │                                      │
     │─────────── SDP Offer ───────────────►│─────────── SDP Offer ───────────────►│
     │                                      │                                      │
     │◄────────── SDP Answer ───────────────│◄────────── SDP Answer ───────────────│
     │                                      │                                      │
     │◄────────── ICE Candidates ──────────►│◄────────── ICE Candidates ──────────►│
     │                                                                             │
     │══════════════════ Direct WebRTC P2P Media Stream ═══════════════════════════│
```

### Technologies Involved:
- `RTCPeerConnection`
- `MediaStream` (`getUserMedia` & `getDisplayMedia`)
- ICE candidates
- STUN servers (`stun.l.google.com:19302`)
- Socket.IO signaling

---

## 📁 Project Structure

```
Novacall/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Route controllers (user, socket, meetings)
│   │   ├── models/           # Mongoose schemas (User, Meeting, ScheduledMeeting)
│   │   ├── routes/           # Express REST API routes
│   │   ├── middleware/       # JWT Bearer auth middleware
│   │   └── app.js            # Server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── pages/            # Page components (Landing, Auth, Home, History, Profile)
│   │   │   └── videoMeet/    # Modular meeting components, hooks & services
│   │   ├── components/       # Shared UI components
│   │   ├── contexts/         # React Context (AuthContext)
│   │   └── App.jsx           # Main router
│   └── package.json
│
├── screenshots/              # Application preview screenshots
├── .gitignore
└── README.md
```

---

## ⚙️ Getting Started

### Prerequisites
Make sure you have installed:
- **Node.js** (v20+ / Node 22 LTS recommended)
- **npm** (v9+)
- **MongoDB** (Local instance or MongoDB Atlas URI)
- **Git**

Check versions:
```bash
node --version
npm --version
git --version
```

### 🐳 Option 1: Run with Docker Compose (Recommended)
You can spin up the entire stack (Frontend, Backend, and MongoDB) with a single command:

```bash
docker compose up --build
```
- **Frontend App**: `http://localhost:3000`
- **Backend API**: `http://localhost:8000`
- **Interactive Swagger Docs**: `http://localhost:8000/api/docs`
- **Health Check Endpoint**: `http://localhost:8000/health`

---

### 💻 Option 2: Local Manual Setup

#### 1. Clone the Repository
```bash
git clone https://github.com/Sekhar01807/Novacall.git
cd Novacall
```

#### 2. Backend Setup
```bash
cd backend
npm install
```

Create a `.env` file in `backend/`:
```env
PORT=8000
ATLASDB_URL=your_mongodb_connection_string
JWT_SECRET=your_secure_jwt_secret
FRONTEND_URL=http://localhost:5173
```

Start the backend:
```bash
npm run dev
```

#### 3. Frontend Setup
Open another terminal:
```bash
cd frontend
npm install
```

Create a `.env` file in `frontend/`:
```env
VITE_API_URL=http://localhost:8000
```

Start the frontend:
```bash
npm run dev
```

Open `http://localhost:5173` in your browser.

---

## 📚 API Documentation (OpenAPI / Swagger)

NovaCall includes interactive Swagger UI documentation directly on the backend server:

- **Interactive API Explorer**: [`http://localhost:8000/api/docs`](http://localhost:8000/api/docs)
- **Raw OpenAPI 3.0 JSON**: [`http://localhost:8000/api/openapi.json`](http://localhost:8000/api/openapi.json)

---

## 🩺 Monitoring & Health Check

The backend exposes a health endpoint for automated container orchestration, load balancers, and uptime monitors:

**`GET /health`**
```json
{
  "status": "ok",
  "uptime": 342,
  "database": "connected",
  "timestamp": "2026-08-14T01:40:00.000Z"
}
```

---

## 🔑 Environment Variables

### Backend
| Variable | Description |
| :--- | :--- |
| `PORT` | Backend server port (e.g. `8000`) |
| `ATLASDB_URL` | MongoDB Atlas connection string |
| `JWT_SECRET` | Secret key used for HMAC-SHA256 JWT signing & verification |
| `FRONTEND_URL` | Allowed CORS origin(s) (e.g. `https://novacall-two.vercel.app,http://localhost:5173`) |

### Frontend
| Variable | Description |
| :--- | :--- |
| `VITE_API_URL` | Backend API URL (e.g. `http://localhost:8000` or production URL) |
| `VITE_TURN_URL` | *(Optional)* Custom TURN relay server URL |
| `VITE_TURN_USERNAME` | *(Optional)* TURN server username |
| `VITE_TURN_CREDENTIAL` | *(Optional)* TURN server credential |

---

## 🔒 Security & Reliability Architecture

NovaCall implements robust engineering and security standards:
- **Stateless JWT Authentication**: Passwords hashed with bcrypt; access tokens signed with HMAC-SHA256 and verified through Express middleware (`req.user` binding).
- **Strict CORS Origin Filtering**: Dynamic allowed origin configuration across both REST API endpoints and Socket.IO handshakes.
- **WebRTC STUN + TURN Relay**: Direct peer-to-peer WebRTC connections with automatic fallback to TURN relay servers for restrictive corporate firewalls and symmetric NATs.
- **Graceful Process Termination**: Catches `SIGTERM` and `SIGINT` to safely drain HTTP requests, disconnect Socket.IO peers, and close database connections cleanly.
- **Automated CI/CD Pipeline**: GitHub Actions workflow (`.github/workflows/ci.yml`) validates backend syntax and builds the frontend on every push.

---

## 🧪 Automated Testing Suite

Run the backend automated unit and security test suite:

```bash
cd backend
npm test
```

Test coverage includes:
- ✅ JWT access token signing & signature verification
- ✅ Tampered token detection & rejection
- ✅ Expired token invalidation
- ✅ Password complexity and email format validation
- ✅ In-meeting chat XSS HTML sanitization
- ✅ OpenAPI 3.0 specification integrity
- ✅ Logger credential masking and redaction

---

## 📸 Screenshots

### 1. Landing Page
![Landing Page](./screenshots/landing.png)

### 2. User Dashboard & Meeting Scheduler
![Dashboard](./screenshots/dashboard.png)

### 3. Video Meeting Room
![Meeting Room](./screenshots/meeting_room.png)

### 4. Real-Time In-Meeting Chat & Participant Drawer
![Chat Panel](./screenshots/chat_panel.png)

### 5. Meeting Activity History
![Meeting History](./screenshots/history.png)

### 6. User Profile & Settings
![Profile Settings](./screenshots/profile.png)

---

## 🧠 Key Engineering Concepts

NovaCall was built to understand and apply several important full-stack concepts:
- **Client-server architecture**: Clean separation of React frontend and Node.js REST / WebSocket backend.
- **REST API design**: Structured HTTP endpoints with status codes and validation.
- **JWT authentication**: Stateless token verification with Express middleware.
- **Password hashing**: Secure password storage using bcrypt with salt rounds.
- **MongoDB data modeling**: Mongoose schemas and relationships for users, history, and scheduled meetings.
- **Real-time communication**: Event-driven WebSocket communication via Socket.IO.
- **WebRTC peer connections**: Interactive video, audio, and screen sharing across browser endpoints.
- **React component architecture**: Modular component hierarchy, custom hooks, and context state management.

---

## 🚧 Current Limitations & Future Improvements

### Current Limitations:
- Peer-to-peer WebRTC mesh architecture is optimal for smaller rooms; larger rooms benefit from Selective Forwarding Units (SFU).
- Public demo environments rely on public STUN servers.

### 🔮 Future Improvements:
- SFU-based media server architecture (e.g. mediasoup / pion)
- Redis adapter for horizontal Socket.IO scaling
- Automated end-to-end test suites (Playwright / Cypress)
- Production TURN server infrastructure

---

## 🎯 Project Goals

The main goal of NovaCall was to gain practical experience building a real-time full-stack application and understand how different technologies work together:
**React + Node.js / Express + MongoDB + Socket.IO + WebRTC + JWT Authentication**

---

## 👨‍💻 Author

**Sekhar Reddy**
- GitHub: [@Sekhar01807](https://github.com/Sekhar01807)
- LinkedIn: [Sekhar Reddy](https://www.linkedin.com/in/sekhar-reddy-408560281)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).
