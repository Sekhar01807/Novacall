import React, { useEffect, useRef, useState, useContext, useCallback } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useMediaDevices } from "./hooks/useMediaDevices";
import { socketService } from "./services/socketService";
import { MeetingHeader } from "./components/MeetingHeader";
import { VideoGrid } from "./components/VideoGrid";
import { MeetingControls } from "./components/MeetingControls";
import { ParticipantList } from "./components/ParticipantList";
import { ChatPanel } from "./components/ChatPanel";
import {
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    TextField,
    Box,
    Typography,
    Tabs,
    Tab,
    IconButton,
    CircularProgress,
    Chip
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import styles from "../../styles/videoComponent.module.css";
import { logoImg } from "../../assets/images";

const peerConfigConnections = {
    iceServers: [
        // Standard Google STUN Servers (Direct P2P NAT Traversal)
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        { urls: "stun:stun2.l.google.com:19302" },
        // Fallback TURN Relay Servers (for restrictive firewalls & symmetric NATs)
        ...(import.meta.env.VITE_TURN_URL ? [{
            urls: import.meta.env.VITE_TURN_URL,
            username: import.meta.env.VITE_TURN_USERNAME || "novacall",
            credential: import.meta.env.VITE_TURN_CREDENTIAL || "novacall_secret"
        }] : [
            {
                urls: "turn:openrelay.metered.ca:80",
                username: "openrelay",
                credential: "openrelay"
            },
            {
                urls: "turn:openrelay.metered.ca:443",
                username: "openrelay",
                credential: "openrelay"
            }
        ])
    ],
    iceCandidatePoolSize: 10
};

// Meeting State Machine Definition
export const MEETING_STATES = {
    LOBBY: "LOBBY",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    RECONNECTING: "RECONNECTING",
    ENDED: "ENDED",
    ERROR: "ERROR"
};

var connections = {};

export default function VideoMeet() {
    const { userData } = useContext(AuthContext);
    const savedProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    const guestName = localStorage.getItem("guestDisplayName") || "";

    const [username, setUsername] = useState(
        userData?.name || userData?.username || guestName || savedProfile.displayName || "Participant"
    );
    const [meetingState, setMeetingState] = useState(MEETING_STATES.LOBBY);
    const [isHost, setIsHost] = useState(false);
    const [videos, setVideos] = useState([]);
    const [peerNames, setPeerNames] = useState({});
    const [peerMediaStates, setPeerMediaStates] = useState({});
    const [messages, setMessages] = useState([]);
    const [newMessages, setNewMessages] = useState(0);
    const [showDrawer, setShowDrawer] = useState(false);
    const [drawerTab, setDrawerTab] = useState(0); // 0: Chat, 1: People
    const [networkQuality, setNetworkQuality] = useState("Excellent");
    const [networkMetrics, setNetworkMetrics] = useState({ rtt: 25, packetLoss: 0 });
    const [peerQualities, setPeerQualities] = useState({});
    const [copiedCode, setCopiedCode] = useState(false);
    const [joinToast, setJoinToast] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    const [kickedModalOpen, setKickedModalOpen] = useState(false);
    const [meetingEndedModalOpen, setMeetingEndedModalOpen] = useState(false);
    const [roomFullModalOpen, setRoomFullModalOpen] = useState(false);

    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const statsIntervalRef = useRef(null);

    const {
        audio,
        video,
        screen,
        screenAvailable,
        localVideoRef,
        permissionError,
        permissionDenied,
        getUserMedia,
        toggleAudio,
        toggleVideo,
        setScreen,
        stopMedia
    } = useMediaDevices();

    const roomCode = window.location.pathname.replace(/^\/+/, '') || 'demo';

    useEffect(() => {
        getUserMedia();
    }, [getUserMedia]);

    /**
     * WebRTC Connection Telemetry Polling Loop
     * Polls active RTCPeerConnection stats every 3 seconds to measure RTT and Packet Loss
     */
    useEffect(() => {
        if (meetingState !== MEETING_STATES.CONNECTED) {
            if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
            return;
        }

        const pollStats = async () => {
            const peerIds = Object.keys(connections);
            if (peerIds.length === 0) {
                // Fall back to socket heartbeat latency
                const sockLatency = socketService.getSocketLatency() || 25;
                setNetworkMetrics({ rtt: sockLatency, packetLoss: 0 });
                setNetworkQuality(sockLatency < 100 ? "Excellent" : sockLatency < 200 ? "Good" : sockLatency < 350 ? "Fair" : "Poor");
                return;
            }

            const updatedPeerQualities = {};
            let totalRtt = 0;
            let totalLoss = 0;
            let count = 0;

            for (const peerId of peerIds) {
                const pc = connections[peerId];
                if (!pc || pc.connectionState === 'closed') continue;

                try {
                    const stats = await pc.getStats();
                    let peerRtt = 0;
                    let peerPacketsLost = 0;
                    let peerPacketsReceived = 0;

                    stats.forEach(report => {
                        if (report.type === 'candidate-pair' && report.state === 'succeeded') {
                            if (report.currentRoundTripTime !== undefined) {
                                peerRtt = report.currentRoundTripTime * 1000; // convert to ms
                            }
                        }
                        if (report.type === 'inbound-rtp') {
                            if (report.packetsLost !== undefined) peerPacketsLost += report.packetsLost;
                            if (report.packetsReceived !== undefined) peerPacketsReceived += report.packetsReceived;
                        }
                    });

                    const totalPackets = peerPacketsLost + peerPacketsReceived;
                    const lossRate = totalPackets > 0 ? (peerPacketsLost / totalPackets) * 100 : 0;

                    let peerRating = "Excellent";
                    if (peerRtt > 350 || lossRate > 8) peerRating = "Poor";
                    else if (peerRtt > 200 || lossRate > 3) peerRating = "Fair";
                    else if (peerRtt > 100 || lossRate > 1) peerRating = "Good";

                    updatedPeerQualities[peerId] = {
                        quality: peerRating,
                        rtt: peerRtt,
                        packetLoss: lossRate
                    };

                    totalRtt += peerRtt;
                    totalLoss += lossRate;
                    count++;
                } catch (e) {
                    // Ignore stats error during renegotiation
                }
            }

            if (count > 0) {
                const avgRtt = totalRtt / count;
                const avgLoss = totalLoss / count;
                setNetworkMetrics({ rtt: avgRtt, packetLoss: avgLoss });

                let overallRating = "Excellent";
                if (avgRtt > 350 || avgLoss > 8) overallRating = "Poor";
                else if (avgRtt > 200 || avgLoss > 3) overallRating = "Fair";
                else if (avgRtt > 100 || avgLoss > 1) overallRating = "Good";

                setNetworkQuality(overallRating);
                setPeerQualities(updatedPeerQualities);
            }
        };

        statsIntervalRef.current = setInterval(pollStats, 3000);
        pollStats();

        return () => {
            if (statsIntervalRef.current) clearInterval(statsIntervalRef.current);
        };
    }, [meetingState]);

    /**
     * Comprehensive WebRTC and Media Stream Lifecycle Cleanup
     * Disconnects all peer connections, removes listeners, stops media tracks
     */
    const cleanupWebRTC = useCallback(() => {
        if (statsIntervalRef.current) {
            clearInterval(statsIntervalRef.current);
            statsIntervalRef.current = null;
        }

        // 1. Close all active RTCPeerConnections
        for (const peerId in connections) {
            try {
                const pc = connections[peerId];
                if (pc) {
                    pc.ontrack = null;
                    pc.onicecandidate = null;
                    pc.oniceconnectionstatechange = null;
                    pc.onsignalingstatechange = null;
                    pc.close();
                }
            } catch (err) {
                console.error("Error closing peer connection:", err);
            }
        }
        connections = {};

        // 2. Stop local camera and microphone hardware tracks
        stopMedia();

        // 3. Disconnect Socket
        socketService.disconnect();
        socketRef.current = null;
        socketIdRef.current = null;

        // 4. Reset component state
        setVideos([]);
        setPeerNames({});
        setPeerMediaStates({});
    }, [stopMedia]);

    // Handle beforeunload and component unmount
    useEffect(() => {
        const handleBeforeUnload = () => {
            cleanupWebRTC();
        };

        window.addEventListener("beforeunload", handleBeforeUnload);
        return () => {
            window.removeEventListener("beforeunload", handleBeforeUnload);
            cleanupWebRTC();
        };
    }, [cleanupWebRTC]);

    const connectToSocket = () => {
        setMeetingState(MEETING_STATES.CONNECTING);
        const socket = socketService.connect(null, username);
        socketRef.current = socket;

        socket.on("connect_error", (err) => {
            console.warn("Socket connect error:", err.message);
            if (err.message === "AUTH_INVALID_TOKEN") {
                setErrorMessage("Your login session has expired. Joining as guest participant.");
                localStorage.removeItem("token");
                socketService.disconnect();
                // Retry connecting as guest
                setTimeout(() => connectToSocket(), 500);
            } else {
                setMeetingState(MEETING_STATES.RECONNECTING);
                setNetworkQuality("Reconnecting");
            }
        });

        socket.on("disconnect", (reason) => {
            console.warn("Socket disconnected:", reason);
            if (reason !== "io client disconnect") {
                setMeetingState(MEETING_STATES.RECONNECTING);
                setNetworkQuality("Reconnecting");
            }
        });

        // Automatic Reconnect & Rejoin Flow
        socket.on("reconnect", (attemptNumber) => {
            console.log(`Socket reconnected successfully after ${attemptNumber} attempts. Re-joining room...`);
            setMeetingState(MEETING_STATES.CONNECTED);
            setNetworkQuality("Good");
            socketService.joinCall(roomCode, username);

            // Re-negotiate ICE connections for any existing peers
            for (const peerId in connections) {
                try {
                    const pc = connections[peerId];
                    if (pc && pc.signalingState !== "closed") {
                        pc.createOffer({ iceRestart: true }).then((description) => {
                            pc.setLocalDescription(description).then(() => {
                                socketService.sendSignal(peerId, JSON.stringify({ sdp: pc.localDescription }));
                            });
                        }).catch(e => console.warn("Renegotiation error on reconnect:", e));
                    }
                } catch (e) {}
            }
        });

        socket.on("signal", (fromId, message) => {
            try {
                const signal = JSON.parse(message);
                if (fromId !== socketIdRef.current && connections[fromId]) {
                    if (signal.sdp) {
                        connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                            if (signal.sdp.type === 'offer') {
                                connections[fromId].createAnswer().then((description) => {
                                    connections[fromId].setLocalDescription(description).then(() => {
                                        socketService.sendSignal(fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
                                    });
                                });
                            }
                        }).catch(e => console.warn("SDP error:", e));
                    }
                    if (signal.ice) {
                        connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.warn("ICE error:", e));
                    }
                }
            } catch (err) {
                console.error("Signal parsing error:", err);
            }
        });

        socket.on("connect", () => {
            socketIdRef.current = socket.id;
            socketService.joinCall(roomCode, username);
            setMeetingState(MEETING_STATES.CONNECTED);
            setNetworkQuality("Excellent");
        });

        socket.on("host-status", (data) => {
            setIsHost(Boolean(data.isHost));
        });

        socket.on("chat-message", (data, sender, socketIdSender, timestamp) => {
            setMessages(prev => [
                ...prev,
                {
                    data,
                    sender,
                    timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
            ]);
            if (socketIdSender !== socketIdRef.current) {
                setNewMessages(prev => prev + 1);
            }
        });

        socket.on("user-left", (id) => {
            // Teardown disconnected peer connection
            if (connections[id]) {
                try {
                    connections[id].ontrack = null;
                    connections[id].onicecandidate = null;
                    connections[id].close();
                    delete connections[id];
                } catch (e) {}
            }

            setVideos(prev => prev.filter(v => v.socketId !== id));
            setPeerNames(prev => {
                const name = prev[id] || "A participant";
                setJoinToast(`${name} left the meeting`);
                setTimeout(() => setJoinToast(""), 3000);
                const updated = { ...prev };
                delete updated[id];
                return updated;
            });
        });

        socket.on("user-media-state-changed", (socketId, mediaType, isEnabled) => {
            setPeerMediaStates(prev => ({
                ...prev,
                [socketId]: {
                    ...prev[socketId],
                    [mediaType === 'audio' ? 'audioMuted' : 'videoMuted']: !isEnabled
                }
            }));
        });

        socket.on("force-mute-audio", () => {
            if (audio) {
                toggleAudio();
                setErrorMessage("Your microphone was muted by the Host.");
            }
        });

        socket.on("force-kicked-out", () => {
            cleanupWebRTC();
            setMeetingState(MEETING_STATES.ENDED);
            setKickedModalOpen(true);
        });

        socket.on("meeting-ended-by-host", () => {
            cleanupWebRTC();
            setMeetingState(MEETING_STATES.ENDED);
            setMeetingEndedModalOpen(true);
        });

        socket.on("error-message", (err) => {
            if (err.code === "ROOM_CAPACITY_EXCEEDED") {
                cleanupWebRTC();
                setMeetingState(MEETING_STATES.ERROR);
                setRoomFullModalOpen(true);
            } else {
                setErrorMessage(err.message || "An unexpected error occurred.");
            }
        });

        socket.on("user-joined", (id, clients, roomNamesMap) => {
            if (roomNamesMap) setPeerNames(roomNamesMap);

            clients.forEach((socketListId) => {
                if (socketListId === socketIdRef.current) return;
                if (connections[socketListId]) return; // Connection already initialized

                const pc = new RTCPeerConnection(peerConfigConnections);
                connections[socketListId] = pc;

                pc.onicecandidate = (event) => {
                    if (event.candidate != null) {
                        socketService.sendSignal(socketListId, JSON.stringify({ ice: event.candidate }));
                    }
                };

                pc.oniceconnectionstatechange = () => {
                    const state = pc.iceConnectionState;
                    if (state === 'disconnected' || state === 'failed') {
                        setNetworkQuality("Poor");
                        try {
                            pc.createOffer({ iceRestart: true }).then(desc => {
                                pc.setLocalDescription(desc).then(() => {
                                    socketService.sendSignal(socketListId, JSON.stringify({ sdp: pc.localDescription }));
                                });
                            });
                        } catch (e) {}
                    } else if (state === 'connected' || state === 'completed') {
                        setNetworkQuality("Excellent");
                    }
                };

                pc.ontrack = (event) => {
                    const remoteStream = event.streams[0];
                    if (!remoteStream) return;
                    setVideos(prev => {
                        const exists = prev.find(v => v.socketId === socketListId);
                        if (exists) {
                            return prev.map(v => v.socketId === socketListId ? { ...v, stream: remoteStream } : v);
                        }
                        return [...prev, { socketId: socketListId, stream: remoteStream }];
                    });
                };

                if (window.localStream) {
                    window.localStream.getTracks().forEach(track => {
                        try {
                            pc.addTrack(track, window.localStream);
                        } catch (e) {}
                    });
                }
            });

            if (id === socketIdRef.current) {
                for (let id2 in connections) {
                    if (id2 === socketIdRef.current) continue;
                    try {
                        if (window.localStream) {
                            window.localStream.getTracks().forEach(track => {
                                connections[id2].addTrack(track, window.localStream);
                            });
                        }
                    } catch (e) {}
                    connections[id2].createOffer().then(description => {
                        connections[id2].setLocalDescription(description).then(() => {
                            socketService.sendSignal(id2, JSON.stringify({ sdp: connections[id2].localDescription }));
                        });
                    }).catch(e => console.warn("Create offer error:", e));
                }
            }
        });
    };

    const handleJoin = () => {
        connectToSocket();
    };

    const handleToggleAudio = () => {
        toggleAudio();
        socketService.toggleMediaState("audio", !audio);
    };

    const handleToggleVideo = () => {
        toggleVideo();
        socketService.toggleMediaState("video", !video);
    };

    const handleToggleScreen = async () => {
        if (screen) {
            setScreen(false);
            getUserMedia();
        } else {
            try {
                const displayStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
                setScreen(true);
                window.localStream = displayStream;
                if (localVideoRef.current) localVideoRef.current.srcObject = displayStream;

                for (let id in connections) {
                    const senders = connections[id].getSenders();
                    senders.forEach(s => connections[id].removeTrack(s));
                    displayStream.getTracks().forEach(t => connections[id].addTrack(t, displayStream));
                    connections[id].createOffer().then(desc => {
                        connections[id].setLocalDescription(desc).then(() => {
                            socketService.sendSignal(id, JSON.stringify({ sdp: connections[id].localDescription }));
                        });
                    });
                }

                displayStream.getTracks().forEach(t => t.onended = () => {
                    setScreen(false);
                    getUserMedia();
                });
            } catch (e) {
                setErrorMessage("Screen sharing cancelled or denied.");
            }
        }
    };

    const handleSendMessage = (text) => {
        socketService.sendChatMessage(text, username);
    };

    const handleLeaveMeeting = () => {
        if (isHost) {
            socketService.endMeetingAll();
        } else {
            socketService.leaveCall();
        }
        cleanupWebRTC();
        window.location.href = "/home";
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
        <div style={{ backgroundColor: '#0B132B', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            {/* Global Error Banner */}
            {errorMessage && (
                <Alert
                    severity="error"
                    onClose={() => setErrorMessage("")}
                    sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, borderRadius: '12px' }}
                >
                    {errorMessage}
                </Alert>
            )}

            {/* Permission Denied Alert */}
            {permissionError && (
                <Alert
                    severity="warning"
                    onClose={() => {}}
                    sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, borderRadius: '12px' }}
                >
                    {permissionError}
                </Alert>
            )}

            {/* Participant Join Toast */}
            {joinToast && (
                <Alert
                    severity="info"
                    onClose={() => setJoinToast("")}
                    sx={{ position: 'fixed', top: 75, left: '50%', transform: 'translateX(-50%)', zIndex: 2000, borderRadius: '12px' }}
                >
                    {joinToast}
                </Alert>
            )}

            {/* Reconnecting Network Banner */}
            {meetingState === MEETING_STATES.RECONNECTING && (
                <Box
                    sx={{
                        position: 'fixed',
                        top: 15,
                        left: '50%',
                        transform: 'translateX(-50%)',
                        zIndex: 2500,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 1.5,
                        bgcolor: '#EF4444',
                        color: '#FFF',
                        px: 2.5,
                        py: 1,
                        borderRadius: '24px',
                        boxShadow: '0 8px 24px rgba(239, 68, 68, 0.4)'
                    }}
                >
                    <WifiOffIcon fontSize="small" />
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>Connection Interrupted. Reconnecting...</Typography>
                    <CircularProgress size={16} sx={{ color: '#FFF' }} />
                </Box>
            )}

            {/* 1. Lobby Screen */}
            {meetingState === MEETING_STATES.LOBBY ? (
                <div className={styles.lobbyWrapper}>
                    <div className={styles.lobbyCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={logoImg} alt="NovaCall" style={{ height: 38, width: 'auto' }} />
                            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: '#0F172A', fontSize: '1.8rem' }}>
                                Nova<span style={{ color: '#3B82F6' }}>Call</span> Lobby
                            </h2>
                        </div>

                        <div className={styles.lobbyVideoBox}>
                            <video ref={localVideoRef} autoPlay muted playsInline></video>
                        </div>

                        <TextField
                            fullWidth
                            label="Display Name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#F8FAFC' } }}
                        />

                        {userData?.username ? (
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                <Chip
                                    icon={<LockOutlinedIcon style={{ fontSize: 14 }} />}
                                    label={`Signed in as @${userData.username}`}
                                    size="small"
                                    color="primary"
                                    variant="outlined"
                                    sx={{ fontWeight: 600 }}
                                />
                            </Box>
                        ) : null}

                        <Button
                            fullWidth
                            variant="contained"
                            className="glow-btn"
                            onClick={handleJoin}
                            disabled={!username.trim()}
                            sx={{ py: 1.5, fontSize: '1.05rem', borderRadius: '12px', fontWeight: 700 }}
                        >
                            Join Meeting Room
                        </Button>

                        <Button
                            fullWidth
                            variant="outlined"
                            onClick={() => window.location.href = "/home"}
                            sx={{ mt: 1, py: 1.2, borderRadius: '12px', fontWeight: 600, color: '#64748B', borderColor: '#CBD5E1' }}
                        >
                            Back to Dashboard
                        </Button>
                    </div>
                </div>
            ) : meetingState === MEETING_STATES.CONNECTING ? (
                /* 2. Connecting Screen */
                <Box sx={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#FFF' }}>
                    <CircularProgress size={48} sx={{ color: '#3B82F6', mb: 3 }} />
                    <Typography variant="h6" sx={{ fontWeight: 700 }}>Connecting to room: {roomCode}</Typography>
                    <Typography variant="body2" sx={{ color: '#94A3B8', mt: 1 }}>Authenticating session & negotiating WebRTC mesh...</Typography>
                </Box>
            ) : (
                /* 3. Active Conference Room */
                <div className={styles.meetVideoContainer}>
                    <MeetingHeader
                        roomCode={roomCode}
                        isHost={isHost}
                        participantCount={videos.length + 1}
                        networkQuality={meetingState === MEETING_STATES.RECONNECTING ? "Reconnecting" : networkQuality}
                        networkMetrics={networkMetrics}
                        onCopyUrl={handleCopyUrl}
                        copied={copiedCode}
                    />

                    <div className={styles.meetMainBody}>
                        <div className={styles.videoStage}>
                            <VideoGrid
                                localStream={window.localStream}
                                localUsername={username}
                                isLocalAudioMuted={!audio}
                                isLocalVideoMuted={!video}
                                remoteVideos={videos}
                                peerNames={peerNames}
                                peerMediaStates={peerMediaStates}
                                screenStream={window.localStream}
                                isScreenSharing={screen}
                                localQuality={meetingState === MEETING_STATES.RECONNECTING ? "Reconnecting" : networkQuality}
                                localMetrics={networkMetrics}
                                peerQualities={peerQualities}
                            />
                        </div>

                        {/* Side Drawer (Chat & Participants) */}
                        {showDrawer && (
                            <div className={styles.sideDrawerContainer}>
                                <div className={styles.sideDrawerHeader}>
                                    <Tabs
                                        value={drawerTab}
                                        onChange={(e, val) => setDrawerTab(val)}
                                        textColor="primary"
                                        indicatorColor="primary"
                                        sx={{ minHeight: 48 }}
                                    >
                                        <Tab label="Chat" sx={{ color: '#F8FAFC', fontWeight: 700, textTransform: 'none' }} />
                                        <Tab label={`People (${videos.length + 1})`} sx={{ color: '#F8FAFC', fontWeight: 700, textTransform: 'none' }} />
                                    </Tabs>
                                    <IconButton size="small" onClick={() => setShowDrawer(false)} sx={{ color: '#94A3B8' }}>
                                        <CloseIcon fontSize="small" />
                                    </IconButton>
                                </div>

                                <div className={styles.sideDrawerContent}>
                                    {drawerTab === 0 && (
                                        <ChatPanel
                                            messages={messages}
                                            onSendMessage={handleSendMessage}
                                            localUsername={username}
                                        />
                                    )}
                                    {drawerTab === 1 && (
                                        <ParticipantList
                                            localUsername={username}
                                            isHost={isHost}
                                            remoteVideos={videos}
                                            peerNames={peerNames}
                                            onHostMute={(sId) => socketService.hostMuteUser(sId)}
                                            onHostKick={(sId) => socketService.hostKickUser(sId)}
                                        />
                                    )}
                                </div>
                            </div>
                        )}
                    </div>

                    <MeetingControls
                        audio={audio}
                        video={video}
                        screen={screen}
                        screenAvailable={screenAvailable}
                        onToggleAudio={handleToggleAudio}
                        onToggleVideo={handleToggleVideo}
                        onToggleScreen={handleToggleScreen}
                        showDrawer={showDrawer}
                        drawerTab={drawerTab}
                        onOpenDrawer={(tabIndex) => {
                            setShowDrawer(true);
                            setDrawerTab(tabIndex);
                            if (tabIndex === 0) setNewMessages(0);
                        }}
                        unreadMessages={newMessages}
                        participantCount={videos.length + 1}
                        isHost={isHost}
                        onLeave={() => setShowLeaveConfirm(true)}
                    />

                    {/* Leave Confirmation Dialog */}
                    <Dialog open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)}>
                        <DialogTitle sx={{ fontWeight: 800 }}>{isHost ? "End Meeting for Everyone?" : "Leave Meeting?"}</DialogTitle>
                        <DialogContent>
                            <Typography variant="body2" sx={{ color: '#475569' }}>
                                {isHost ? "As the host, leaving will end the call for all participants." : "Are you sure you want to exit this call?"}
                            </Typography>
                        </DialogContent>
                        <DialogActions sx={{ p: 2 }}>
                            <Button onClick={() => setShowLeaveConfirm(false)}>Cancel</Button>
                            <Button variant="contained" color="error" onClick={handleLeaveMeeting} sx={{ fontWeight: 700 }}>
                                {isHost ? "End Call" : "Leave Call"}
                            </Button>
                        </DialogActions>
                    </Dialog>
                </div>
            )}

            {/* Room Full / Capacity Exceeded Modal Dialog */}
            <Dialog open={roomFullModalOpen} onClose={() => {}}>
                <DialogTitle sx={{ fontWeight: 800, color: '#F59E0B' }}>Meeting Room Full</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        This meeting room has reached its maximum participant limit. Please wait for an attendee to leave or contact the meeting organizer.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => window.location.href = "/home"} sx={{ fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Kicked Modal Dialog */}
            <Dialog open={kickedModalOpen} onClose={() => {}}>
                <DialogTitle sx={{ fontWeight: 800, color: '#EF4444' }}>Removed From Meeting</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        You have been removed from this meeting room by the host.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => window.location.href = "/home"} sx={{ fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Meeting Ended Modal Dialog */}
            <Dialog open={meetingEndedModalOpen} onClose={() => {}}>
                <DialogTitle sx={{ fontWeight: 800, color: '#3B82F6' }}>Meeting Concluded</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#475569' }}>
                        The host has ended this meeting for all participants.
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button variant="contained" onClick={() => window.location.href = "/home"} sx={{ fontWeight: 700 }}>
                        Return to Dashboard
                    </Button>
                </DialogActions>
            </Dialog>
        </div>
    );
}
