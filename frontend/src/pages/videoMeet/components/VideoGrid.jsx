import React from "react";
import { VideoTile } from "./VideoTile";
import { decodeHTMLEntities } from "../../../utils/textUtils";
import styles from "../../../styles/videoComponent.module.css";

export function VideoGrid({
    localStream,
    localUsername,
    localSocketId,
    isLocalAudioMuted,
    isLocalVideoMuted,
    remoteVideos = [],
    peerNames = {},
    peerMediaStates = {},
    screenStream,
    isScreenSharing,
    localQuality = "Excellent",
    localMetrics = null,
    peerQualities = {}
}) {
    // Collect all remote peer IDs from peerNames and remoteVideos
    const remotePeerIds = Array.from(new Set([
        ...Object.keys(peerNames).filter(id => id !== localSocketId),
        ...remoteVideos.map(v => v.socketId)
    ])).filter(Boolean);

    const cleanLocalUsername = decodeHTMLEntities(localUsername) || "User";

    const remotePeers = remotePeerIds.map((peerId, idx) => {
        const vid = remoteVideos.find(v => v.socketId === peerId);
        const rawName = peerNames[peerId] || `Participant ${idx + 1}`;
        return {
            socketId: peerId,
            stream: vid ? vid.stream : null,
            name: decodeHTMLEntities(rawName),
            isVideoMuted: vid ? (peerMediaStates[peerId]?.videoMuted ?? false) : true,
            isAudioMuted: peerMediaStates[peerId]?.audioMuted ?? false,
            quality: peerQualities[peerId]?.quality || "Excellent",
            rtt: peerQualities[peerId]?.rtt || null,
            packetLoss: peerQualities[peerId]?.packetLoss || null
        };
    });

    if (isScreenSharing && screenStream) {
        return (
            <div className={styles.screenShareStage}>
                <div className={styles.screenMainStage}>
                    <video
                        ref={ref => {
                            if (ref) {
                                try {
                                    ref.srcObject = (typeof MediaStream !== 'undefined' && screenStream instanceof MediaStream) ? screenStream : null;
                                } catch {
                                    ref.srcObject = null;
                                }
                            }
                        }}
                        autoPlay
                        playsInline
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                    />
                </div>
                <div className={styles.screenSideStrip}>
                    <VideoTile
                        stream={localStream}
                        isLocal={true}
                        username={cleanLocalUsername}
                        isAudioMuted={isLocalAudioMuted}
                        isVideoMuted={isLocalVideoMuted}
                        quality={localQuality}
                        rtt={localMetrics?.rtt}
                        packetLoss={localMetrics?.packetLoss}
                    />
                    {remotePeers.map((peer) => (
                        <VideoTile
                            key={peer.socketId}
                            stream={peer.stream}
                            username={peer.name}
                            isAudioMuted={peer.isAudioMuted}
                            isVideoMuted={peer.isVideoMuted}
                            quality={peer.quality}
                            rtt={peer.rtt}
                            packetLoss={peer.packetLoss}
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
                username={cleanLocalUsername}
                isAudioMuted={isLocalAudioMuted}
                isVideoMuted={isLocalVideoMuted}
                quality={localQuality}
                rtt={localMetrics?.rtt}
                packetLoss={localMetrics?.packetLoss}
            />

            {/* Remote Peer Video Tiles */}
            {remotePeers.map((peer, idx) => (
                <VideoTile
                    key={peer.socketId}
                    stream={peer.stream}
                    username={peer.name}
                    isAudioMuted={peer.isAudioMuted}
                    isVideoMuted={peer.isVideoMuted}
                    isActiveSpeaker={idx === 0}
                    quality={peer.quality}
                    rtt={peer.rtt}
                    packetLoss={peer.packetLoss}
                />
            ))}
        </div>
    );
}
