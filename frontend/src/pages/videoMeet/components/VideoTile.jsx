import React, { useEffect, useRef } from "react";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import Avatar from "@mui/material/Avatar";
import { ConnectionQualityIndicator } from "./ConnectionQualityIndicator";
import styles from "../../../styles/videoComponent.module.css";

export function VideoTile({ 
    stream, 
    isLocal = false, 
    username = "Participant", 
    isAudioMuted = false, 
    isVideoMuted = false, 
    isActiveSpeaker = false,
    quality = "Excellent",
    rtt = null,
    packetLoss = null
}) {
    const videoRef = useRef(null);
    const cleanUsername = (username && username.includes('@')) ? username.split('@')[0] : username;

    useEffect(() => {
        if (videoRef.current) {
            try {
                videoRef.current.srcObject = (typeof MediaStream !== 'undefined' && stream instanceof MediaStream) ? stream : null;
            } catch {
                videoRef.current.srcObject = null;
            }
        }
    }, [stream]);

    return (
        <div className={`${styles.conferenceTile} ${isActiveSpeaker ? styles.activeSpeaker : ''}`}>
            {/* Active Video Stream Element */}
            <video
                ref={videoRef}
                autoPlay
                muted={isLocal}
                playsInline
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: isVideoMuted ? 'none' : 'block'
                }}
            />

            {/* Stable Avatar Overlay when Camera is Off */}
            {isVideoMuted && (
                <div className={styles.cameraOffFallback}>
                    <Avatar sx={{ width: 76, height: 76, bgcolor: '#3B82F6', fontSize: '2rem', fontWeight: 800, boxShadow: '0 8px 24px rgba(59, 130, 246, 0.35)' }}>
                        {cleanUsername ? cleanUsername.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                </div>
            )}

            <div className={styles.tileBadge}>
                <span className={`${styles.micIcon} ${isAudioMuted ? styles.micMuted : ''}`}>
                    {isAudioMuted ? <MicOffIcon fontSize="inherit" sx={{ color: '#F43F5E' }} /> : <MicIcon fontSize="inherit" />}
                </span>
                <span>{cleanUsername} {isLocal && "(You)"}</span>
                <ConnectionQualityIndicator quality={quality} rtt={rtt} packetLoss={packetLoss} compact={true} />
            </div>
        </div>
    );
}
