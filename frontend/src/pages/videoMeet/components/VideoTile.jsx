import React, { useEffect, useRef } from "react";
import MicIcon from "@mui/icons-material/Mic";
import MicOffIcon from "@mui/icons-material/MicOff";
import Avatar from "@mui/material/Avatar";
import styles from "../../../styles/videoComponent.module.css";

export function VideoTile({ stream, isLocal = false, username = "Participant", isAudioMuted = false, isVideoMuted = false, isActiveSpeaker = false }) {
    const videoRef = useRef(null);

    useEffect(() => {
        if (videoRef.current && stream) {
            videoRef.current.srcObject = stream;
        }
    }, [stream]);

    return (
        <div className={`${styles.conferenceTile} ${isActiveSpeaker ? styles.activeSpeaker : ''}`}>
            {isVideoMuted ? (
                <div style={{
                    width: '100%',
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#1E293B'
                }}>
                    <Avatar sx={{ width: 68, height: 68, bgcolor: '#3B82F6', fontSize: '1.8rem', fontWeight: 800 }}>
                        {username ? username.charAt(0).toUpperCase() : 'U'}
                    </Avatar>
                </div>
            ) : (
                <video
                    ref={videoRef}
                    autoPlay
                    muted={isLocal}
                    playsInline
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
            )}

            <div className={styles.tileBadge}>
                <span className={`${styles.micIcon} ${isAudioMuted ? styles.micMuted : ''}`}>
                    {isAudioMuted ? <MicOffIcon fontSize="inherit" sx={{ color: '#F43F5E' }} /> : <MicIcon fontSize="inherit" />}
                </span>
                {username} {isLocal && "(You)"}
            </div>
        </div>
    );
}
