import React, { useEffect, useRef, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useMediaDevices } from "./hooks/useMediaDevices";
import { socketService } from "./services/socketService";
import { MeetingHeader } from "./components/MeetingHeader";
import { VideoGrid } from "./components/VideoGrid";
import { MeetingControls } from "./components/MeetingControls";
import { ParticipantList } from "./components/ParticipantList";
import { ChatPanel } from "./components/ChatPanel";
import { Alert, Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Box, Typography, Tabs, Tab, IconButton } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
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

var connections = {};

export default function VideoMeet() {
    const { userData, addToUserHistory } = useContext(AuthContext);
    const savedProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    const guestName = localStorage.getItem("guestDisplayName") || "";

    const [username, setUsername] = useState(
        guestName || userData?.name || userData?.username || savedProfile.displayName || "Participant"
    );
    const [askForUsername, setAskForUsername] = useState(true);
    const [isHost, setIsHost] = useState(false);
    const [videos, setVideos] = useState([]);
    const [peerNames, setPeerNames] = useState({});
    const [peerMediaStates, setPeerMediaStates] = useState({});
    const [messages, setMessages] = useState([]);
    const [newMessages, setNewMessages] = useState(0);
    const [showDrawer, setShowDrawer] = useState(false);
    const [drawerTab, setDrawerTab] = useState(0); // 0: Chat, 1: People
    const [networkQuality, setNetworkQuality] = useState("Excellent");
    const [copiedCode, setCopiedCode] = useState(false);
    const [joinToast, setJoinToast] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const videoRef = useRef([]);

    const {
        audio,
        video,
        screen,
        screenAvailable,
        localVideoRef,
        permissionError,
        getUserMedia,
        toggleAudio,
        toggleVideo,
        setScreen
    } = useMediaDevices();

    const roomCode = window.location.pathname.replace('/', '') || 'demo';

    useEffect(() => {
        getUserMedia();
    }, []);

    const connectToSocket = () => {
        socketRef.current = socketService.connect();

        socketRef.current.on("signal", (fromId, message) => {
            const signal = JSON.parse(message);
            if (fromId !== socketIdRef.current) {
                if (signal.sdp) {
                    connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                        if (signal.sdp.type === 'offer') {
                            connections[fromId].createAnswer().then((description) => {
                                connections[fromId].setLocalDescription(description).then(() => {
                                    socketService.sendSignal(fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
                                });
                            });
                        }
                    });
                }
                if (signal.ice) {
                    connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e));
                }
            }
        });

        socketRef.current.on("connect", () => {
            socketService.joinCall(username);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on("host-status", (data) => {
                setIsHost(data.isHost);
            });

            socketRef.current.on("chat-message", (data, sender, socketIdSender, timestamp) => {
                setMessages(prev => [...prev, { data, sender, timestamp: timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
                if (socketIdSender !== socketIdRef.current) {
                    setNewMessages(prev => prev + 1);
                }
            });

            socketRef.current.on("user-left", (id) => {
                setVideos(prev => prev.filter(v => v.socketId !== id));
                setPeerNames(prev => {
                    const name = prev[id] || "A participant";
                    setJoinToast(`${name} left the meeting`);
                    setTimeout(() => setJoinToast(""), 3000);
                    return prev;
                });
            });

            socketRef.current.on("user-media-state-changed", (socketId, mediaType, isEnabled) => {
                setPeerMediaStates(prev => ({
                    ...prev,
                    [socketId]: {
                        ...prev[socketId],
                        [mediaType === 'audio' ? 'audioMuted' : 'videoMuted']: !isEnabled
                    }
                }));
            });

            socketRef.current.on("force-mute-audio", () => {
                if (audio) toggleAudio();
            });

            socketRef.current.on("force-kicked-out", () => {
                alert("You have been removed from the meeting by the Host.");
                window.location.href = "/home";
            });

            socketRef.current.on("meeting-ended-by-host", () => {
                alert("The host has ended this meeting for everyone.");
                window.location.href = "/home";
            });

            socketRef.current.on("user-joined", (id, clients, roomNamesMap) => {
                if (roomNamesMap) setPeerNames(roomNamesMap);

                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);

                    connections[socketListId].onicecandidate = (event) => {
                        if (event.candidate != null) {
                            socketService.sendSignal(socketListId, JSON.stringify({ ice: event.candidate }));
                        }
                    };

                    connections[socketListId].oniceconnectionstatechange = () => {
                        const state = connections[socketListId].iceConnectionState;
                        if (state === 'disconnected' || state === 'failed') {
                            setNetworkQuality("Poor");
                            try {
                                connections[socketListId].createOffer({ iceRestart: true }).then(desc => {
                                    connections[socketListId].setLocalDescription(desc).then(() => {
                                        socketService.sendSignal(socketListId, JSON.stringify({ sdp: connections[socketListId].localDescription }));
                                    });
                                });
                            } catch (e) {}
                        } else if (state === 'connected' || state === 'completed') {
                            setNetworkQuality("Excellent");
                        }
                    };

                    connections[socketListId].ontrack = (event) => {
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
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                });

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue;
                        try {
                            window.localStream.getTracks().forEach(track => {
                                connections[id2].addTrack(track, window.localStream);
                            });
                        } catch (e) {}
                        connections[id2].createOffer().then(description => {
                            connections[id2].setLocalDescription(description).then(() => {
                                socketService.sendSignal(id2, JSON.stringify({ sdp: connections[id2].localDescription }));
                            });
                        });
                    }
                }
            });
        });
    };

    const handleJoin = () => {
        setAskForUsername(false);
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
        }
        socketService.disconnect();
        window.location.href = "/home";
    };

    const handleCopyUrl = () => {
        navigator.clipboard.writeText(window.location.href);
        setCopiedCode(true);
        setTimeout(() => setCopiedCode(false), 2000);
    };

    return (
        <div style={{ backgroundColor: '#0B132B', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            {errorMessage && (
                <Alert severity="error" onClose={() => setErrorMessage("")} sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                    {errorMessage}
                </Alert>
            )}
            {permissionError && (
                <Alert severity="warning" onClose={() => {}} sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                    {permissionError}
                </Alert>
            )}
            {joinToast && (
                <Alert severity="info" onClose={() => setJoinToast("")} sx={{ position: 'fixed', top: 75, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, borderRadius: '12px' }}>
                    {joinToast}
                </Alert>
            )}

            {askForUsername ? (
                /* Meeting Lobby */
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
                            label="Enter Your Display Name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#F8FAFC' } }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            className="glow-btn"
                            onClick={handleJoin}
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
            ) : (
                /* Main Meeting Room */
                <div className={styles.meetVideoContainer}>
                    <MeetingHeader
                        roomCode={roomCode}
                        isHost={isHost}
                        participantCount={videos.length + 1}
                        networkQuality={networkQuality}
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
        </div>
    );
}
