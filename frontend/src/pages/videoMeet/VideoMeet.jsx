import React, { useEffect, useState, useContext } from "react";
import { AuthContext } from "../../contexts/AuthContext";
import { useMediaDevices } from "./hooks/useMediaDevices";
import { useWebRTCConnection, MEETING_STATES } from "./hooks/useWebRTCConnection";
import { socketService } from "./services/socketService";
import { MeetingHeader } from "./components/MeetingHeader";
import { VideoGrid } from "./components/VideoGrid";
import { MeetingControls } from "./components/MeetingControls";
import { ParticipantList } from "./components/ParticipantList";
import { ChatPanel } from "./components/ChatPanel";
import { LobbyView } from "./components/LobbyView";
import { MeetingModals } from "./components/MeetingModals";
import {
    Alert,
    Box,
    Typography,
    Tabs,
    Tab,
    IconButton,
    CircularProgress
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import WifiOffIcon from "@mui/icons-material/WifiOff";
import styles from "../../styles/videoComponent.module.css";

export { MEETING_STATES };

export default function VideoMeet() {
    const { userData } = useContext(AuthContext);
    const savedProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    const guestName = localStorage.getItem("guestDisplayName") || "";

    const getCleanUsername = () => {
        if (userData?.username) return userData.username;
        if (savedProfile.username) return savedProfile.username;
        if (userData?.name && !userData.name.includes('@')) return userData.name;
        if (savedProfile.displayName && !savedProfile.displayName.includes('@')) return savedProfile.displayName;
        if (guestName) return guestName.includes('@') ? guestName.split('@')[0] : guestName;
        if (userData?.email) return userData.email.split('@')[0];
        return "Participant";
    };

    const [username, setUsername] = useState(getCleanUsername);
    const [showDrawer, setShowDrawer] = useState(false);
    const [drawerTab, setDrawerTab] = useState(0); // 0: Chat, 1: People
    const [copiedCode, setCopiedCode] = useState(false);
    const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);

    // Synchronize username whenever user authentication profile arrives
    useEffect(() => {
        if (userData?.username) {
            setUsername(userData.username);
        } else if (userData?.name && !userData.name.includes('@')) {
            setUsername(userData.name);
        }
    }, [userData]);

    const roomCode = window.location.pathname.replace(/^\/+/, '') || 'demo';

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
        setScreen,
        stopMedia
    } = useMediaDevices();

    const {
        meetingState,
        isHost,
        videos,
        peerNames,
        peerMediaStates,
        messages,
        newMessages,
        setNewMessages,
        networkQuality,
        networkMetrics,
        peerQualities,
        joinToast,
        setJoinToast,
        errorMessage,
        setErrorMessage,
        kickedModalOpen,
        meetingEndedModalOpen,
        roomFullModalOpen,
        connectToSocket,
        cleanupWebRTC,
        getActiveConnections,
        localSocketId
    } = useWebRTCConnection({
        roomCode,
        username,
        audio,
        toggleAudio,
        stopMedia
    });

    const participantCount = Math.max(Object.keys(peerNames).length, videos.length + 1, 1);

    useEffect(() => {
        getUserMedia();
    }, [getUserMedia]);

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

                const connections = getActiveConnections();
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
            } catch {
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
                <LobbyView
                    localVideoRef={localVideoRef}
                    username={username}
                    setUsername={setUsername}
                    userData={userData}
                    onJoin={handleJoin}
                />
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
                        participantCount={participantCount}
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
                                localSocketId={localSocketId}
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
                                        <Tab label={`People (${participantCount})`} sx={{ color: '#F8FAFC', fontWeight: 700, textTransform: 'none' }} />
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
                                            localSocketId={localSocketId}
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
                        participantCount={participantCount}
                        isHost={isHost}
                        onLeave={() => setShowLeaveConfirm(true)}
                    />

                    <MeetingModals
                        showLeaveConfirm={showLeaveConfirm}
                        onCloseLeaveConfirm={() => setShowLeaveConfirm(false)}
                        isHost={isHost}
                        onConfirmLeave={handleLeaveMeeting}
                        roomFullModalOpen={roomFullModalOpen}
                        kickedModalOpen={kickedModalOpen}
                        meetingEndedModalOpen={meetingEndedModalOpen}
                    />
                </div>
            )}
        </div>
    );
}
