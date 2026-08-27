import { useEffect, useRef, useState, useCallback } from "react";
import { socketService } from "../services/socketService";
import { decodeHTMLEntities } from "../../../utils/textUtils";

export const peerConfigConnections = {
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

export const MEETING_STATES = {
    LOBBY: "LOBBY",
    CONNECTING: "CONNECTING",
    CONNECTED: "CONNECTED",
    RECONNECTING: "RECONNECTING",
    ENDED: "ENDED",
    ERROR: "ERROR"
};

let connections = {};

export function useWebRTCConnection({ roomCode, username, audio, toggleAudio, stopMedia }) {
    const [meetingState, setMeetingState] = useState(MEETING_STATES.LOBBY);
    const [isHost, setIsHost] = useState(false);
    const [videos, setVideos] = useState([]);
    const [peerNames, setPeerNames] = useState({});
    const [peerMediaStates, setPeerMediaStates] = useState({});
    const [messages, setMessages] = useState([]);
    const [newMessages, setNewMessages] = useState(0);
    const [networkQuality, setNetworkQuality] = useState("Excellent");
    const [networkMetrics, setNetworkMetrics] = useState({ rtt: 25, packetLoss: 0 });
    const [peerQualities, setPeerQualities] = useState({});
    const [joinToast, setJoinToast] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [kickedModalOpen, setKickedModalOpen] = useState(false);
    const [meetingEndedModalOpen, setMeetingEndedModalOpen] = useState(false);
    const [roomFullModalOpen, setRoomFullModalOpen] = useState(false);
    const [localSocketId, setLocalSocketId] = useState("");

    const socketRef = useRef(null);
    const socketIdRef = useRef(null);
    const statsIntervalRef = useRef(null);

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
                                peerRtt = report.currentRoundTripTime * 1000;
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
                } catch {
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
     * WebRTC and Media Stream Lifecycle Cleanup
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
            } catch {
                // Connection already closed
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

    const connectToSocketRef = useRef(null);

    const connectToSocket = useCallback(() => {
        setMeetingState(MEETING_STATES.CONNECTING);
        const socket = socketService.connect(null, username);
        socketRef.current = socket;

        socket.on("connect_error", (err) => {
            if (err.message === "AUTH_INVALID_TOKEN") {
                setErrorMessage("Your login session has expired. Joining as guest participant.");
                socketService.disconnect();
                setTimeout(() => {
                    if (connectToSocketRef.current) connectToSocketRef.current();
                }, 500);
            } else {
                setMeetingState(MEETING_STATES.RECONNECTING);
                setNetworkQuality("Reconnecting");
            }
        });

        socket.on("disconnect", (reason) => {
            if (reason !== "io client disconnect") {
                setMeetingState(MEETING_STATES.RECONNECTING);
                setNetworkQuality("Reconnecting");
            }
        });

        // Automatic Reconnect & Rejoin Flow
        socket.on("reconnect", () => {
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
                        }).catch(() => {});
                    }
                } catch {
                    // Ignore reconnection offer error
                }
            }
        });

        socket.on("signal", (fromId, message) => {
            try {
                const signal = JSON.parse(message);
                if (fromId !== socketIdRef.current && connections[fromId]) {
                    const SessionDesc = window.RTCSessionDescription || window.webkitRTCSessionDescription;
                    const IceCand = window.RTCIceCandidate || window.webkitRTCIceCandidate;
                    if (signal.sdp && SessionDesc) {
                        connections[fromId].setRemoteDescription(new SessionDesc(signal.sdp)).then(() => {
                            if (signal.sdp.type === 'offer') {
                                connections[fromId].createAnswer().then((description) => {
                                    connections[fromId].setLocalDescription(description).then(() => {
                                        socketService.sendSignal(fromId, JSON.stringify({ sdp: connections[fromId].localDescription }));
                                    });
                                });
                            }
                        }).catch(() => {});
                    }
                    if (signal.ice && IceCand) {
                        connections[fromId].addIceCandidate(new IceCand(signal.ice)).catch(() => {});
                    }
                }
            } catch {
                // Ignore malformed signal
            }
        });

        const handleConnected = () => {
            socketIdRef.current = socket.id;
            setLocalSocketId(socket.id);
            socketService.joinCall(roomCode, username);
            setMeetingState(MEETING_STATES.CONNECTED);
            setNetworkQuality("Excellent");
        };

        socket.on("connect", handleConnected);
        if (socket.connected) {
            handleConnected();
        }

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
            if (connections[id]) {
                try {
                    connections[id].ontrack = null;
                    connections[id].onicecandidate = null;
                    connections[id].close();
                    delete connections[id];
                } catch {
                    // Ignore peer cleanup error
                }
            }

            setVideos(prev => prev.filter(v => v.socketId !== id));
            setPeerNames(prev => {
                const rawName = prev[id] || "A participant";
                const name = decodeHTMLEntities(rawName);
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

            const PeerConn = window.RTCPeerConnection || window.webkitRTCPeerConnection;
            if (!PeerConn) return;

            clients.forEach((socketListId) => {
                if (socketListId === socketIdRef.current) return;
                if (connections[socketListId]) return;

                const pc = new PeerConn(peerConfigConnections);
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
                        } catch {
                            // Ignore offer creation failure
                        }
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
                        } catch {
                            // Ignore track addition error
                        }
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
                    } catch {
                        // Ignore track addition error
                    }
                    connections[id2].createOffer().then(description => {
                        connections[id2].setLocalDescription(description).then(() => {
                            socketService.sendSignal(id2, JSON.stringify({ sdp: connections[id2].localDescription }));
                        });
                    }).catch(() => {});
                }
            }
        });
    }, [roomCode, username, audio, toggleAudio, cleanupWebRTC]);

    useEffect(() => {
        connectToSocketRef.current = connectToSocket;
    }, [connectToSocket]);

    const getActiveConnections = useCallback(() => connections, []);

    return {
        meetingState,
        setMeetingState,
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
    };
}
