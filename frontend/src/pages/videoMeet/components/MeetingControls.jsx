import React from "react";
import { Badge } from "@mui/material";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import VideocamIcon from "@mui/icons-material/Videocam";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ScreenShareIcon from "@mui/icons-material/ScreenShare";
import StopScreenShareIcon from "@mui/icons-material/StopScreenShare";
import ChatIcon from "@mui/icons-material/Chat";
import PeopleIcon from "@mui/icons-material/People";
import CallEndIcon from "@mui/icons-material/CallEnd";
import styles from "../../../styles/videoComponent.module.css";

export function MeetingControls({
    audio,
    video,
    screen,
    screenAvailable,
    onToggleAudio,
    onToggleVideo,
    onToggleScreen,
    showDrawer,
    drawerTab,
    onOpenDrawer,
    unreadMessages,
    participantCount,
    isHost,
    onLeave
}) {
    return (
        <div className={styles.bottomControlBar}>
            {/* Audio Toggle */}
            <button className={styles.controlBtn} onClick={onToggleAudio}>
                {audio ? <MicIcon /> : <MicOffIcon sx={{ color: '#F43F5E' }} />}
                <span>{audio ? 'Mute' : 'Unmute'}</span>
            </button>

            {/* Video Toggle */}
            <button className={styles.controlBtn} onClick={onToggleVideo}>
                {video ? <VideocamIcon /> : <VideocamOffIcon sx={{ color: '#F43F5E' }} />}
                <span>{video ? 'Stop Video' : 'Start Video'}</span>
            </button>

            {/* Screen Share */}
            {screenAvailable && (
                <button className={styles.controlBtn} onClick={onToggleScreen}>
                    {screen ? <StopScreenShareIcon sx={{ color: '#3B82F6' }} /> : <ScreenShareIcon />}
                    <span style={{ color: screen ? '#3B82F6' : '#F8FAFC' }}>
                        {screen ? 'Stop Share' : 'Share'}
                    </span>
                </button>
            )}

            {/* Chat Drawer Toggle */}
            <button
                className={styles.controlBtn}
                onClick={() => onOpenDrawer(0)}
            >
                <Badge badgeContent={unreadMessages} color="primary" overlap="circular">
                    <ChatIcon sx={{ color: (showDrawer && drawerTab === 0) ? '#3B82F6' : '#F8FAFC' }} />
                </Badge>
                <span style={{ color: (showDrawer && drawerTab === 0) ? '#3B82F6' : '#F8FAFC' }}>Chat</span>
            </button>

            {/* Participants Drawer Toggle */}
            <button
                className={styles.controlBtn}
                onClick={() => onOpenDrawer(1)}
            >
                <Badge badgeContent={participantCount} color="primary" overlap="circular">
                    <PeopleIcon sx={{ color: (showDrawer && drawerTab === 1) ? '#3B82F6' : '#F8FAFC' }} />
                </Badge>
                <span style={{ color: (showDrawer && drawerTab === 1) ? '#3B82F6' : '#F8FAFC' }}>People</span>
            </button>

            {/* Leave / End Call */}
            <button className={styles.leaveBtn} onClick={onLeave}>
                <CallEndIcon />
                <span>{isHost ? 'End Call' : 'Leave'}</span>
            </button>
        </div>
    );
}
