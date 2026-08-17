import React from "react";
import { VideoTile } from "./VideoTile";
import styles from "../../../styles/videoComponent.module.css";

export function VideoGrid({
    localStream,
    localUsername,
    isLocalAudioMuted,
    isLocalVideoMuted,
    remoteVideos,
    peerNames,
    peerMediaStates,
    screenStream,
    isScreenSharing,
    localQuality = "Excellent",
    localMetrics = null,
    peerQualities = {}
}) {
    if (isScreenSharing && screenStream) {
        return (
            <div className={styles.screenShareStage}>
                <div className={styles.screenMainStage}>
                    <video
                        ref={ref => { if (ref) ref.srcObject = screenStream; }}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                </div>
                <div className={styles.screenSideStrip}>
                    <VideoTile
                        stream={localStream}
                        isLocal={true}
                        username={localUsername}
                        isAudioMuted={isLocalAudioMuted}
                        isVideoMuted={isLocalVideoMuted}
                        quality={localQuality}
                        rtt={localMetrics?.rtt}
                        packetLoss={localMetrics?.packetLoss}
                    />
                    {remoteVideos.map((vid, idx) => (
                        <VideoTile
                            key={vid.socketId || idx}
                            stream={vid.stream}
                            username={peerNames[vid.socketId] || `Participant ${idx + 1}`}
                            isAudioMuted={peerMediaStates[vid.socketId]?.audioMuted}
                            isVideoMuted={peerMediaStates[vid.socketId]?.videoMuted}
                            quality={peerQualities[vid.socketId]?.quality || "Excellent"}
                            rtt={peerQualities[vid.socketId]?.rtt}
                            packetLoss={peerQualities[vid.socketId]?.packetLoss}
                        />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className={styles.gridContainer}>
            {/* Local Video Tile */}
            <VideoTile
                stream={localStream}
                isLocal={true}
                username={localUsername}
                isAudioMuted={isLocalAudioMuted}
                isVideoMuted={isLocalVideoMuted}
                quality={localQuality}
                rtt={localMetrics?.rtt}
                packetLoss={localMetrics?.packetLoss}
            />

            {/* Remote Peer Video Tiles */}
            {remoteVideos.map((vid, idx) => (
                <VideoTile
                    key={vid.socketId || idx}
                    stream={vid.stream}
                    username={peerNames[vid.socketId] || `Participant ${idx + 1}`}
                    isAudioMuted={peerMediaStates[vid.socketId]?.audioMuted}
                    isVideoMuted={peerMediaStates[vid.socketId]?.videoMuted}
                    isActiveSpeaker={idx === 0}
                    quality={peerQualities[vid.socketId]?.quality || "Excellent"}
                    rtt={peerQualities[vid.socketId]?.rtt}
                    packetLoss={peerQualities[vid.socketId]?.packetLoss}
                />
            ))}
        </div>
    );
}
