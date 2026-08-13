import React, { useEffect, useRef, useState } from 'react'
import io from "socket.io-client";
import { Badge, IconButton, TextField, Button, Box, Typography, Tabs, Tab, Avatar, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions, Chip, Alert, Switch, FormControlLabel } from '@mui/material';
import VideocamIcon from '@mui/icons-material/Videocam';
import VideocamOffIcon from '@mui/icons-material/VideocamOff';
import styles from "../styles/videoComponent.module.css";
import CallEndIcon from '@mui/icons-material/CallEnd';
import MicIcon from '@mui/icons-material/Mic';
import MicOffIcon from '@mui/icons-material/MicOff';
import ScreenShareIcon from '@mui/icons-material/ScreenShare';
import StopScreenShareIcon from '@mui/icons-material/StopScreenShare';
import ChatIcon from '@mui/icons-material/Chat';
import PeopleIcon from '@mui/icons-material/People';
import PollIcon from '@mui/icons-material/Poll';
import BackHandIcon from '@mui/icons-material/BackHand';
import NoteAltIcon from '@mui/icons-material/NoteAlt';
import SettingsIcon from '@mui/icons-material/Settings';
import FiberManualRecordIcon from '@mui/icons-material/FiberManualRecord';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import LockIcon from '@mui/icons-material/Lock';
import LockOpenIcon from '@mui/icons-material/LockOpen';
import DownloadIcon from '@mui/icons-material/Download';
import BlockIcon from '@mui/icons-material/Block';
import VolumeOffIcon from '@mui/icons-material/VolumeOff';
import SecurityIcon from '@mui/icons-material/Security';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import InsertEmoticonIcon from '@mui/icons-material/InsertEmoticon';
import EmojiEmotionsIcon from '@mui/icons-material/EmojiEmotions';
import Popover from '@mui/material/Popover';
import { useContext } from 'react';
import { AuthContext } from '../contexts/AuthContext';
import server from '../environment';
import { logoImg } from '../assets/images';

const server_url = server;
var connections = {};

const peerConfigConnections = {
    "iceServers": [
        { "urls": "stun:stun.l.google.com:19302" }
    ]
}

export default function VideoMeetComponent() {
    var socketRef = useRef();
    let socketIdRef = useRef();
    let localVideoref = useRef();

    const { userData, addToUserHistory } = useContext(AuthContext);
    const savedProfile = JSON.parse(localStorage.getItem("userProfile")) || {};
    const savedSettings = JSON.parse(localStorage.getItem("meetingSettings")) || { defaultMicOff: false, defaultCamOff: false };

    let [defaultMicOff, setDefaultMicOff] = useState(savedSettings.defaultMicOff);
    let [defaultCamOff, setDefaultCamOff] = useState(savedSettings.defaultCamOff);

    let [videoAvailable, setVideoAvailable] = useState(true);
    let [audioAvailable, setAudioAvailable] = useState(true);
    let [video, setVideo] = useState(!savedSettings.defaultCamOff);
    let [audio, setAudio] = useState(!savedSettings.defaultMicOff);
    let [screen, setScreen] = useState(false);
    let [showModal, setModal] = useState(false);
    let [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
    let [drawerTab, setDrawerTab] = useState(0);
    let [screenAvailable, setScreenAvailable] = useState(false);
    let [messages, setMessages] = useState([]);
    let [message, setMessage] = useState("");
    let [newMessages, setNewMessages] = useState(0);
    let [askForUsername, setAskForUsername] = useState(true);
    let [username, setUsername] = useState(userData?.name || userData?.username || savedProfile.displayName || "");
    const profilePic = userData?.profilePic || savedProfile.profilePic || "";
    const videoRef = useRef([]);
    let [videos, setVideos] = useState([]);

    // Enterprise States & Verification Items
    let [raisedHand, setRaisedHand] = useState(false);
    let [handList, setHandList] = useState({});
    let [floatingEmojis, setFloatingEmojis] = useState([]);
    let [polls, setPolls] = useState([]);
    let [pollQuestion, setPollQuestion] = useState("");
    let [pollOptions, setPollOptions] = useState(["Option 1", "Option 2"]);
    let [pollDuration, setPollDuration] = useState("Unlimited");
    let [userVotes, setUserVotes] = useState({});
    
    // Q&A States
    let [questions, setQuestions] = useState([]);
    let [newQuestionText, setNewQuestionText] = useState("");
    let [isAnonymousQuestion, setIsAnonymousQuestion] = useState(false);
    let [pollSubTab, setPollSubTab] = useState(0); // 0: Polls, 1: Q&A
    let [userUpvotes, setUserUpvotes] = useState({});

    let [callSeconds, setCallSeconds] = useState(0);
    let [isRecording, setIsRecording] = useState(false);
    let [settingsOpen, setSettingsOpen] = useState(false);
    let [copiedCode, setCopiedCode] = useState(false);
    let [isLocked, setIsLocked] = useState(false);
    let [meetingNotes, setMeetingNotes] = useState("");
    let [networkStatus, setNetworkStatus] = useState(navigator.onLine ? "Connected" : "Offline");
    let [errorMessage, setErrorMessage] = useState("");
    let [isHost, setIsHost] = useState(false);
    let [joinToast, setJoinToast] = useState("");
    let [allowChat, setAllowChat] = useState(true);
    let [emojiAnchor, setEmojiAnchor] = useState(null);
    let [reactionAnchor, setReactionAnchor] = useState(null);

    const quickEmojis = ['😄', '😂', '😍', '👍', '🎉', '❤️', '🚀', '👋', '💡', '🔥', '👏', '🙏'];

    const renderFormattedText = (text) => {
        if (!text) return null;
        // Item 5: XSS-safe text rendering
        const sanitized = sanitizeChatText(text);
        const urlRegex = /(https?:\/\/[^\s]+|www\.[^\s]+)/g;
        const parts = sanitized.split(urlRegex);

        return parts.map((part, i) => {
            if (part.match(urlRegex)) {
                const href = part.startsWith('www.') ? `https://${part}` : part;
                return (
                    <a
                        key={i}
                        href={href}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#3B82F6', textDecoration: 'underline', wordBreak: 'break-all' }}
                    >
                        {part}
                    </a>
                );
            }
            return part;
        });
    };

    // Item 5: Client-side chat XSS sanitization
    const sanitizeChatText = (str) => {
        if (typeof str !== 'string') return '';
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#x27;');
    };
    let mediaRecorderRef = useRef(null);
    let recordedChunksRef = useRef([]);

    const startSessionRecording = () => {
        if (!window.localStream) {
            setErrorMessage("No stream available to record.");
            return;
        }
        try {
            recordedChunksRef.current = [];
            const stream = window.localStream;
            const options = { mimeType: 'video/webm;codecs=vp9,opus' };
            let recorder;
            try {
                recorder = new MediaRecorder(stream, options);
            } catch (e) {
                recorder = new MediaRecorder(stream);
            }

            recorder.ondataavailable = (event) => {
                if (event.data && event.data.size > 0) {
                    recordedChunksRef.current.push(event.data);
                }
            };

            recorder.onstop = () => {
                const blob = new Blob(recordedChunksRef.current, { type: 'video/webm' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `NovaCall_Session_${Date.now()}.webm`;
                document.body.appendChild(a);
                a.click();
                setTimeout(() => {
                    document.body.removeChild(a);
                    window.URL.revokeObjectURL(url);
                }, 100);
            };

            recorder.start(1000);
            mediaRecorderRef.current = recorder;
            setIsRecording(true);
        } catch (e) {
            console.error("Recording error:", e);
            setErrorMessage("Recording failed to start.");
        }
    };

    const stopSessionRecording = () => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
            mediaRecorderRef.current.stop();
        }
        setIsRecording(false);
    };

    const toggleRecording = () => {
        if (isRecording) {
            stopSessionRecording();
        } else {
            startSessionRecording();
        }
    };

    useEffect(() => {
        const handleOnline = () => setNetworkStatus("Connected");
        const handleOffline = () => setNetworkStatus("Offline");
        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);
        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
    }, []);

    useEffect(() => {
        getPermissions();
    }, []);

    useEffect(() => {
        localStorage.setItem("meetingSettings", JSON.stringify({ defaultMicOff, defaultCamOff }));
    }, [defaultMicOff, defaultCamOff]);

    // Call Timer Counter
    useEffect(() => {
        let interval;
        if (!askForUsername) {
            interval = setInterval(() => {
                setCallSeconds(prev => prev + 1);
            }, 1000);
        }
        return () => clearInterval(interval);
    }, [askForUsername]);

    const formatCallTime = (totalSecs) => {
        const mins = Math.floor(totalSecs / 60).toString().padStart(2, '0');
        const secs = (totalSecs % 60).toString().padStart(2, '0');
        return `${mins}:${secs}`;
    };

    let getDislayMedia = () => {
        if (screen) {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(getDislayMediaSuccess)
                    .catch((e) => console.log(e))
            }
        }
    }

    const getPermissions = async () => {
        try {
            const videoPermission = await navigator.mediaDevices.getUserMedia({ video: true });
            setVideoAvailable(!!videoPermission);
            videoPermission.getTracks().forEach(t => t.stop());
        } catch (videoErr) {
            // Item 4: Show camera permission error to user
            setVideoAvailable(false);
            setErrorMessage("Camera access denied. Please check your browser permissions to enable video.");
        }

        try {
            const audioPermission = await navigator.mediaDevices.getUserMedia({ audio: true });
            setAudioAvailable(!!audioPermission);
            audioPermission.getTracks().forEach(t => t.stop());
        } catch (audioErr) {
            // Item 4: Show microphone permission error to user
            setAudioAvailable(false);
            setErrorMessage("Microphone access denied. Please check your browser permissions to enable audio.");
        }

        if (navigator.mediaDevices.getDisplayMedia) {
            setScreenAvailable(true);
        }

        try {
            const constraints = { video: videoAvailable, audio: audioAvailable };
            if (constraints.video || constraints.audio) {
                const userMediaStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
                if (userMediaStream) {
                    window.localStream = userMediaStream;
                    if (localVideoref.current) {
                        localVideoref.current.srcObject = userMediaStream;
                    }
                }
            }
        } catch (streamErr) {
            console.log("Could not get user media:", streamErr);
        }
    };

    useEffect(() => {
        if (video !== undefined && audio !== undefined) {
            getUserMedia();
        }
    }, [video, audio]);

    useEffect(() => {
        if (localVideoref.current && window.localStream) {
            localVideoref.current.srcObject = window.localStream;
        }
    }, [askForUsername, video]);

    let getMedia = () => {
        setVideo(videoAvailable);
        setAudio(audioAvailable);
        connectToSocketServer();
    }

    let getUserMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e) }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        // Item 6: Replace deprecated addStream with addTrack
        for (let id in connections) {
            if (id === socketIdRef.current) continue;
            try {
                // Remove old senders before adding new tracks
                const senders = connections[id].getSenders();
                senders.forEach(sender => {
                    try { connections[id].removeTrack(sender); } catch (e) { }
                });
            } catch (e) { }
            window.localStream.getTracks().forEach(track => {
                connections[id].addTrack(track, window.localStream);
            });
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        if (socketRef.current) {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                        }
                    }).catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setVideo(false);
            setAudio(false);
            try {
                if (localVideoref.current?.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }

            for (let id in connections) {
                try {
                    const senders = connections[id].getSenders();
                    senders.forEach(sender => {
                        try { connections[id].removeTrack(sender); } catch (e) { }
                    });
                } catch (e) { }
                window.localStream.getTracks().forEach(track => {
                    connections[id].addTrack(track, window.localStream);
                });
                connections[id].createOffer().then((description) => {
                    connections[id].setLocalDescription(description)
                        .then(() => {
                            if (socketRef.current) {
                                socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                            }
                        }).catch(e => console.log(e))
                })
            }
        })
    }

    let getUserMedia = () => {
        if ((video && videoAvailable) || (audio && audioAvailable)) {
            navigator.mediaDevices.getUserMedia({ video: video, audio: audio })
                .then(getUserMediaSuccess)
                .catch((e) => console.log(e))
        } else {
            try {
                if (localVideoref.current?.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { }
        }
    }

    let getDislayMediaSuccess = (stream) => {
        try {
            if (window.localStream) {
                window.localStream.getTracks().forEach(track => track.stop());
            }
        } catch (e) { console.log(e) }

        window.localStream = stream;
        if (localVideoref.current) {
            localVideoref.current.srcObject = stream;
        }

        // Item 6: Replace deprecated addStream with addTrack
        for (let id in connections) {
            if (id === socketIdRef.current) continue
            try {
                const senders = connections[id].getSenders();
                senders.forEach(sender => {
                    try { connections[id].removeTrack(sender); } catch (e) { }
                });
            } catch (e) { }
            window.localStream.getTracks().forEach(track => {
                connections[id].addTrack(track, window.localStream);
            });
            connections[id].createOffer().then((description) => {
                connections[id].setLocalDescription(description)
                    .then(() => {
                        if (socketRef.current) {
                            socketRef.current.emit('signal', id, JSON.stringify({ 'sdp': connections[id].localDescription }));
                        }
                    }).catch(e => console.log(e))
            })
        }

        stream.getTracks().forEach(track => track.onended = () => {
            setScreen(false)
            try {
                if (localVideoref.current?.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { console.log(e) }

            let blackSilence = (...args) => new MediaStream([black(...args), silence()])
            window.localStream = blackSilence()
            if (localVideoref.current) {
                localVideoref.current.srcObject = window.localStream;
            }
            getUserMedia()
        })
    }

    let handleAudio = () => {
        setAudio(prev => !prev);
    };

    let handleVideo = () => {
        setVideo(prev => !prev);
    };

    let handleToggleLock = () => {
        const nextLocked = !isLocked;
        setIsLocked(nextLocked);
        if (socketRef.current) {
            socketRef.current.emit("toggle-room-lock", nextLocked);
        }
    };

    let gotMessageFromServer = (fromId, message) => {
        var signal = JSON.parse(message)

        if (fromId !== socketIdRef.current) {
            if (signal.sdp) {
                connections[fromId].setRemoteDescription(new RTCSessionDescription(signal.sdp)).then(() => {
                    if (signal.sdp.type === 'offer') {
                        connections[fromId].createAnswer().then((description) => {
                            connections[fromId].setLocalDescription(description).then(() => {
                                socketRef.current.emit('signal', fromId, JSON.stringify({ 'sdp': connections[fromId].localDescription }))
                            }).catch(e => console.log(e))
                        }).catch(e => console.log(e))
                    }
                }).catch(e => console.log(e))
            }

            if (signal.ice) {
                connections[fromId].addIceCandidate(new RTCIceCandidate(signal.ice)).catch(e => console.log(e))
            }
        }
    }

    let connectToSocketServer = () => {
        socketRef.current = io.connect(server_url, { secure: false });
        socketRef.current.on('signal', gotMessageFromServer);

        socketRef.current.on('connect', () => {
            socketRef.current.emit('join-call', window.location.href);
            socketIdRef.current = socketRef.current.id;

            socketRef.current.on('chat-message', addMessage);
            socketRef.current.on('user-left', (id) => {
                setVideos((videos) => videos.filter((video) => video.socketId !== id))
            });

            // Item 1: Listen for host status from server
            socketRef.current.on('host-status', (data) => {
                setIsHost(data.isHost);
            });

            // Enterprise Socket Listeners
            socketRef.current.on('receive-notes', (incomingNotes) => {
                setMeetingNotes(incomingNotes);
            });

            socketRef.current.on('receive-reaction', (emoji) => {
                triggerEmoji(emoji);
            });

            socketRef.current.on('user-raised-hand', (socketId, senderName, isRaised) => {
                setHandList(prev => ({ ...prev, [socketId]: isRaised ? senderName : null }));
            });

            socketRef.current.on('poll-list', (latestPolls) => {
                setPolls(latestPolls);
            });

            socketRef.current.on('qna-list', (latestQuestions) => {
                setQuestions(latestQuestions);
            });

            socketRef.current.on('force-mute-audio', () => {
                setAudio(false);
                try {
                    let tracks = window.localStream.getAudioTracks();
                    tracks.forEach(t => t.enabled = false);
                } catch (e) { }
            });

            socketRef.current.on('user-joined-notification', (participantName) => {
                setJoinToast(`${participantName || 'A participant'} joined the meeting`);
                setTimeout(() => setJoinToast(""), 3000);
            });

            socketRef.current.on('force-kicked-out', () => {
                alert("You have been removed from the meeting by the Host.");
                window.location.href = "/home";
            });

            socketRef.current.on('room-lock-updated', (locked) => {
                setIsLocked(locked);
            });

            socketRef.current.on('chat-permission-updated', (allowed) => {
                setAllowChat(allowed);
            });

            socketRef.current.on('meeting-ended-by-host', () => {
                alert("The host has ended this meeting for everyone.");
                window.location.href = "/home";
            });

            socketRef.current.on('user-joined', (id, clients) => {
                clients.forEach((socketListId) => {
                    connections[socketListId] = new RTCPeerConnection(peerConfigConnections);
                    connections[socketListId].onicecandidate = function (event) {
                        if (event.candidate != null) {
                            socketRef.current.emit('signal', socketListId, JSON.stringify({ 'ice': event.candidate }))
                        }
                    }

                    // Item 6: Replace deprecated onaddstream with ontrack
                    connections[socketListId].ontrack = (event) => {
                        const remoteStream = event.streams[0];
                        if (!remoteStream) return;
                        let videoExists = videoRef.current.find(video => video.socketId === socketListId);
                        if (videoExists) {
                            setVideos(videos => {
                                const updatedVideos = videos.map(video =>
                                    video.socketId === socketListId ? { ...video, stream: remoteStream } : video
                                );
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        } else {
                            let newVideo = {
                                socketId: socketListId,
                                stream: remoteStream,
                                autoplay: true,
                                playsinline: true
                            };
                            setVideos(videos => {
                                const updatedVideos = [...videos, newVideo];
                                videoRef.current = updatedVideos;
                                return updatedVideos;
                            });
                        }
                    };

                    // Item 6: Replace deprecated addStream with addTrack
                    if (window.localStream !== undefined && window.localStream !== null) {
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    } else {
                        let blackSilence = (...args) => new MediaStream([black(...args), silence()])
                        window.localStream = blackSilence()
                        window.localStream.getTracks().forEach(track => {
                            connections[socketListId].addTrack(track, window.localStream);
                        });
                    }
                })

                if (id === socketIdRef.current) {
                    for (let id2 in connections) {
                        if (id2 === socketIdRef.current) continue
                        try {
                            window.localStream.getTracks().forEach(track => {
                                connections[id2].addTrack(track, window.localStream);
                            });
                        } catch (e) { }
                        connections[id2].createOffer().then((description) => {
                            connections[id2].setLocalDescription(description)
                                .then(() => {
                                    socketRef.current.emit('signal', id2, JSON.stringify({ 'sdp': connections[id2].localDescription }))
                                }).catch(e => console.log(e))
                        })
                    }
                }
            })
        })
    }

    let silence = () => {
        let ctx = new AudioContext()
        let oscillator = ctx.createOscillator()
        let dst = oscillator.connect(ctx.createMediaStreamDestination())
        oscillator.start()
        ctx.resume()
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false })
    }
    let black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height })
        canvas.getContext('2d').fillRect(0, 0, width, height)
        let stream = canvas.captureStream()
        return Object.assign(stream.getVideoTracks()[0], { enabled: false })
    }

    let handleScreen = () => {
        if (screen) {
            setScreen(false);
            try {
                if (localVideoref.current?.srcObject) {
                    let tracks = localVideoref.current.srcObject.getTracks();
                    tracks.forEach(track => track.stop());
                }
            } catch (e) { }
            getUserMedia();
        } else {
            if (navigator.mediaDevices.getDisplayMedia) {
                navigator.mediaDevices.getDisplayMedia({ video: true, audio: true })
                    .then(stream => {
                        setScreen(true);
                        getDislayMediaSuccess(stream);
                    })
                    .catch((e) => {
                        // Item 4: Show screen share error to user
                        setErrorMessage("Screen sharing was cancelled or denied.");
                        setScreen(false);
                    });
            }
        }
    }
    let handleEndCall = () => {
        try {
            if (localVideoref.current?.srcObject) {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        } catch (e) { }
        window.location.href = "/home";
    }

    const addMessage = (data, sender, socketIdSender) => {
        setMessages((prevMessages) => [
            ...prevMessages,
            { sender: sender, data: data }
        ]);
        if (socketIdSender !== socketIdRef.current) {
            setNewMessages((prevNewMessages) => prevNewMessages + 1);
        }
    };

    let sendMessage = () => {
        if (!message.trim()) return;
        socketRef.current.emit('chat-message', message, username);
        setMessage("");
    }

    let connect = async () => {
        setAskForUsername(false);
        const roomCode = window.location.pathname.replace('/', '') || "room";
        try {
            await addToUserHistory(roomCode);
        } catch (e) { }
        getMedia();
    }

    // Enterprise Reaction & Poll Broadcast Handlers
    const triggerEmoji = (emoji) => {
        const id = Date.now();
        setFloatingEmojis(prev => [...prev, { id, emoji }]);
        if (socketRef.current) {
            socketRef.current.emit("send-reaction", emoji, username);
        }
        setTimeout(() => {
            setFloatingEmojis(prev => prev.filter(item => item.id !== id));
        }, 2500);
    };

    const handleRaiseHand = () => {
        const nextState = !raisedHand;
        setRaisedHand(nextState);
        if (socketRef.current) {
            socketRef.current.emit("raise-hand", nextState, username);
        }
    };

    const handleCreatePoll = () => {
        if (!pollQuestion.trim()) return;
        const newPoll = {
            id: Date.now(),
            question: pollQuestion,
            options: (pollOptions || []).filter(o => o && o.trim()).map(opt => ({ text: opt, votes: 0 })),
            totalVotes: 0,
            status: "active",
            duration: pollDuration
        };
        if (socketRef.current) {
            socketRef.current.emit("create-poll", newPoll);
        } else {
            setPolls(prev => [...(prev || []), newPoll]);
        }
        setPollQuestion("");
        setPollOptions(["Option 1", "Option 2"]);
    };

    const handleVote = (pollId, optionIndex) => {
        if (userVotes[pollId] !== undefined) return;
        setUserVotes(prev => ({ ...prev, [pollId]: optionIndex }));
        if (socketRef.current) {
            socketRef.current.emit("vote-poll", pollId, optionIndex);
        }
    };

    const handleEndPoll = (pollId) => {
        if (socketRef.current) {
            socketRef.current.emit("end-poll", pollId);
        } else {
            setPolls(prev => (prev || []).map(p => p.id === pollId ? { ...p, status: 'closed' } : p));
        }
    };

    const handleDeletePoll = (pollId) => {
        if (socketRef.current) {
            socketRef.current.emit("delete-poll", pollId);
        } else {
            setPolls(prev => (prev || []).filter(p => p.id !== pollId));
        }
    };

    // Q&A Handlers
    const handleAskQuestion = () => {
        if (!newQuestionText.trim()) return;
        const newQ = {
            id: Date.now(),
            question: newQuestionText,
            author: isAnonymousQuestion ? "Anonymous" : (username || "Participant"),
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            upvotes: 0,
            answered: false
        };
        if (socketRef.current) {
            socketRef.current.emit("ask-question", newQ);
        } else {
            setQuestions(prev => [...(prev || []), newQ]);
        }
        setNewQuestionText("");
    };

    const handleUpvoteQuestion = (qId) => {
        if (userUpvotes[qId]) return;
        setUserUpvotes(prev => ({ ...prev, [qId]: true }));
        if (socketRef.current) {
            socketRef.current.emit("upvote-question", qId);
        } else {
            setQuestions(prev => (prev || []).map(q => q.id === qId ? { ...q, upvotes: (q.upvotes || 0) + 1 } : q));
        }
    };

    const handleAnswerQuestion = (qId) => {
        if (socketRef.current) {
            socketRef.current.emit("answer-question", qId);
        } else {
            setQuestions(prev => (prev || []).map(q => q.id === qId ? { ...q, answered: true } : q));
        }
    };

    const handleDeleteQuestion = (qId) => {
        if (socketRef.current) {
            socketRef.current.emit("delete-question", qId);
        } else {
            setQuestions(prev => (prev || []).filter(q => q.id !== qId));
        }
    };

    const handleHostMute = (targetId) => {
        if (socketRef.current) {
            socketRef.current.emit("host-mute-user", targetId);
        }
    };

    const handleHostKick = (targetId) => {
        if (socketRef.current) {
            socketRef.current.emit("host-kick-user", targetId);
        }
    };

    const handleToggleChatPermission = () => {
        const nextAllow = !allowChat;
        setAllowChat(nextAllow);
        if (socketRef.current) {
            socketRef.current.emit("toggle-chat-permission", nextAllow);
        }
    };

    const handleEndMeetingForEveryone = () => {
        if (socketRef.current) {
            socketRef.current.emit("end-meeting-all");
        }
        try {
            if (localVideoref.current?.srcObject) {
                let tracks = localVideoref.current.srcObject.getTracks();
                tracks.forEach(track => track.stop());
            }
        } catch (e) { }
        window.location.href = "/home";
    };

    const exportNotes = (format = 'txt') => {
        const title = `NovaCall Meeting Notes — ${new Date().toLocaleDateString()}`;
        const content = `${title}\n${'='.repeat(title.length)}\n\n${meetingNotes || 'No notes taken during meeting.'}`;
        
        if (format === 'pdf') {
            try {
                const printWindow = window.open('', '_blank');
                if (printWindow) {
                    printWindow.document.write(`<html><head><title>${title}</title><style>body{font-family:sans-serif;padding:30px;line-height:1.6;}h1{color:#2563eb;}</style></head><body><h1>${title}</h1><pre style="white-space:pre-wrap;font-family:sans-serif;">${meetingNotes || ''}</pre></body></html>`);
                    printWindow.document.close();
                    printWindow.print();
                } else {
                    alert("Pop-up blocked! Please allow pop-ups for this site to export PDF.");
                }
            } catch (e) {
                console.error("PDF export error:", e);
            }
            return;
        }

        try {
            const mime = format === 'docx' ? 'application/msword' : 'text/plain';
            const ext = format === 'docx' ? 'doc' : 'txt';
            const element = document.createElement("a");
            const file = new Blob([content], { type: mime });
            element.href = URL.createObjectURL(file);
            element.download = `NovaCall_Meeting_Notes.${ext}`;
            document.body.appendChild(element);
            element.click();
            setTimeout(() => {
                try { document.body.removeChild(element); } catch (e) {}
            }, 100);
        } catch (e) {
            console.error("Notes export error:", e);
        }
    };

    const handleNotesChange = (e) => {
        const newNotes = e.target.value;
        setMeetingNotes(newNotes);
        if (socketRef.current) {
            socketRef.current.emit("sync-notes", newNotes);
        }
    };

    const copyMeetingUrl = () => {
        try {
            if (navigator.clipboard && navigator.clipboard.writeText) {
                navigator.clipboard.writeText(window.location.href);
            } else {
                const dummy = document.createElement("input");
                document.body.appendChild(dummy);
                dummy.value = window.location.href;
                dummy.select();
                document.execCommand("copy");
                document.body.removeChild(dummy);
            }
            setCopiedCode(true);
            setTimeout(() => setCopiedCode(false), 2000);
        } catch (e) {
            console.error("Copy error:", e);
        }
    };

    return (
        <div style={{ backgroundColor: '#F8FAFC', minHeight: '100vh', fontFamily: "'Inter', sans-serif" }}>
            {errorMessage && (
                <Alert severity="error" onClose={() => setErrorMessage("")} sx={{ position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 1000 }}>
                    {errorMessage}
                </Alert>
            )}

            {joinToast && (
                <Alert severity="info" onClose={() => setJoinToast("")} sx={{ position: 'fixed', top: 75, left: '50%', transform: 'translateX(-50%)', zIndex: 1000, borderRadius: '12px' }}>
                    {joinToast}
                </Alert>
            )}

            {askForUsername === true ? (
                <div className={styles.lobbyWrapper}>
                    <div className={styles.lobbyCard}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <img src={logoImg} alt="NovaCall Logo" style={{ height: 38, width: 'auto' }} />
                            <h2 style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", fontWeight: 800, color: '#0F172A', fontSize: '1.8rem' }}>
                                Nova<span style={{ color: '#3B82F6' }}>Call</span> Lobby
                            </h2>
                        </div>

                        <div className={styles.lobbyVideoBox}>
                            <video ref={localVideoref} autoPlay muted></video>
                        </div>

                        <TextField
                            fullWidth
                            id="outlined-basic"
                            label="Enter Your Display Name"
                            value={username}
                            onChange={e => setUsername(e.target.value)}
                            variant="outlined"
                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', backgroundColor: '#F8FAFC' } }}
                        />

                        <Button
                            fullWidth
                            variant="contained"
                            className="glow-btn"
                            onClick={connect}
                            sx={{ py: 1.5, fontSize: '1.05rem', borderRadius: '12px', fontWeight: 700 }}
                        >
                            Join Meeting Room
                        </Button>
                    </div>
                </div>
            ) : (
                <div className={styles.meetVideoContainer}>
                    {/* Top Action Header Bar */}
                    <div className={styles.meetHeaderBar}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                            <img src={logoImg} alt="NovaCall Logo" style={{ height: 28, width: 'auto' }} />
                            <Typography variant="subtitle1" sx={{ fontWeight: 800, color: '#F8FAFC', letterSpacing: '-0.01em', fontSize: '0.95rem' }}>
                                NovaCall
                            </Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(255, 255, 255, 0.08)', border: '1px solid rgba(255, 255, 255, 0.15)', px: 1.2, py: 0.3, borderRadius: '8px' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8', fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                    Room: {window.location.pathname.replace('/', '') || 'demo'}
                                </Typography>
                            </Box>

                            <Chip 
                                icon={<SecurityIcon style={{ fontSize: 13, color: '#60A5FA' }} />}
                                label={isHost ? "Host" : "Participant"} 
                                size="small" 
                                sx={{ fontWeight: 700, fontSize: '0.7rem', bgcolor: 'rgba(59, 130, 246, 0.15)', color: '#60A5FA', border: '1px solid rgba(59, 130, 246, 0.3)', height: 24 }} 
                            />

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: 'rgba(255, 255, 255, 0.06)', px: 1.2, py: 0.3, borderRadius: '20px', border: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                <PeopleIcon style={{ fontSize: 14, color: '#94A3B8' }} />
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#F8FAFC', fontSize: '0.75rem' }}>
                                    {(videos ? videos.length : 0) + 1}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: 'rgba(59, 130, 246, 0.12)', px: 1.2, py: 0.3, borderRadius: '20px', border: '1px solid rgba(59, 130, 246, 0.25)' }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#60A5FA', fontSize: '0.75rem' }}>
                                    {formatCallTime(callSeconds)}
                                </Typography>
                            </Box>

                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: networkStatus === 'Connected' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(244, 63, 94, 0.12)', color: networkStatus === 'Connected' ? '#34D399' : '#FB7185', px: 1.2, py: 0.3, borderRadius: '20px', border: `1px solid ${networkStatus === 'Connected' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)'}` }}>
                                <Typography variant="caption" sx={{ fontWeight: 700, fontSize: '0.72rem' }}>
                                    {networkStatus === 'Connected' ? 'Connected' : 'Offline'}
                                </Typography>
                            </Box>

                            {isRecording && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, bgcolor: 'rgba(244, 63, 94, 0.2)', color: '#F43F5E', px: 1.2, py: 0.3, borderRadius: '20px', border: '1px solid rgba(244, 63, 94, 0.4)' }}>
                                    <FiberManualRecordIcon style={{ fontSize: 10 }} />
                                    <Typography variant="caption" sx={{ fontWeight: 800, fontSize: '0.7rem' }}>REC</Typography>
                                </Box>
                            )}
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Button
                                size="small"
                                variant="contained"
                                onClick={copyMeetingUrl}
                                startIcon={<ContentCopyIcon fontSize="small" />}
                                sx={{ bgcolor: 'rgba(59, 130, 246, 0.2)', color: '#60A5FA', textTransform: 'none', fontWeight: 700, borderRadius: '10px', border: '1px solid rgba(59, 130, 246, 0.3)', '&:hover': { bgcolor: 'rgba(59, 130, 246, 0.3)' } }}
                            >
                                {copiedCode ? "Copied!" : "Invite Link"}
                            </Button>
                            <IconButton size="small" onClick={() => setSettingsOpen(true)} sx={{ color: '#94A3B8', '&:hover': { color: '#F8FAFC', bgcolor: 'rgba(255, 255, 255, 0.1)' } }}>
                                <SettingsIcon fontSize="small" />
                            </IconButton>
                        </div>
                    </div>

                    {/* Floating Reaction Animation Stream */}
                    <div className={styles.emojiStream}>
                        {floatingEmojis.map(item => (
                            <span key={item.id} className={styles.floatingEmoji}>
                                {item.emoji}
                            </span>
                        ))}
                    </div>

                    {/* Multi-Tab Right Side Drawer */}
                    <div className={styles.meetMainBody}>
                        {screen ? (
                            /* Full Screen Share Presentation Stage + Participant Thumbnails */
                            <div className={styles.screenShareContainer}>
                                <div className={styles.screenShareStage}>
                                    <video ref={localVideoref} autoPlay muted style={{ width: '100%', height: '100%', objectFit: 'contain' }}></video>
                                    <div className={styles.tileBadge}>
                                        🖥️ Screen Share Presentation
                                    </div>
                                </div>
                                <div className={styles.screenShareThumbnails}>
                                    <div className={styles.screenShareThumbTile}>
                                        <div className={styles.cameraOffFallback}>
                                            {profilePic ? (
                                                <Avatar src={profilePic} sx={{ width: 36, height: 36 }} />
                                            ) : (
                                                <div className={styles.cameraOffAvatar} style={{ width: 32, height: 32, fontSize: '0.8rem' }}>
                                                    {username && username.length > 0 ? username.charAt(0).toUpperCase() : 'Y'}
                                                </div>
                                            )}
                                            <Typography variant="caption" sx={{ color: '#F8FAFC', fontWeight: 700, mt: 0.3, fontSize: '0.65rem' }}>
                                                {username || 'You'} (You)
                                            </Typography>
                                        </div>
                                    </div>

                                    {videos && videos.map((vid, idx) => (
                                        <div className={styles.screenShareThumbTile} key={vid.socketId || idx}>
                                            <video
                                                data-socket={vid.socketId}
                                                ref={ref => {
                                                    if (ref && vid.stream) {
                                                        ref.srcObject = vid.stream;
                                                    }
                                                }}
                                                autoPlay
                                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                            ></video>
                                            <div className={styles.tileBadge} style={{ fontSize: '0.65rem', py: 0.2 }}>
                                                Participant {idx + 1}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : (
                            /* Normal Conference Grid View */
                            <div className={`${styles.conferenceView} ${videos.length > 4 ? styles.manyParticipants : ''}`}>
                                {/* Local Video */}
                                <div className={`${styles.conferenceTile} ${!video ? styles.cameraOffFallback : ''}`}>
                                    <video ref={localVideoref} autoPlay muted style={{ display: video ? 'block' : 'none', width: '100%', height: '100%', objectFit: 'cover' }}></video>
                                    {!video && (
                                        <div className={styles.cameraOffFallback}>
                                            {profilePic ? (
                                                <Avatar src={profilePic} sx={{ width: 84, height: 84, border: '3px solid #3B82F6', boxShadow: '0 8px 20px rgba(59, 130, 246, 0.3)' }} />
                                            ) : (
                                                <div className={styles.cameraOffAvatar}>
                                                    {username ? username.charAt(0).toUpperCase() : 'Y'}
                                                </div>
                                            )}
                                            <Typography variant="body2" sx={{ color: '#F8FAFC', fontWeight: 700, mt: 1 }}>{username || 'You'}</Typography>
                                        </div>
                                    )}
                                    <div className={styles.tileBadge}>
                                        <span className={`${styles.micIcon} ${!audio ? styles.micMuted : ''}`}>
                                            {!audio ? <MicOffIcon fontSize="inherit"/> : <MicIcon fontSize="inherit"/>}
                                        </span>
                                        {username || 'You'} (You)
                                    </div>
                                </div>

                                {/* Remote Videos */}
                                {videos.map((vid, idx) => (
                                    <div className={`${styles.conferenceTile} ${idx === 0 ? styles.activeSpeaker : ''}`} key={vid.socketId || idx}>
                                        <video
                                            data-socket={vid.socketId}
                                            ref={ref => {
                                                if (ref && vid.stream) {
                                                    ref.srcObject = vid.stream;
                                                }
                                            }}
                                            autoPlay
                                            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        ></video>
                                        <div className={styles.tileBadge}>
                                            <span className={styles.micIcon}><MicIcon fontSize="inherit" /></span>
                                            Participant {idx + 1} {handList && handList[vid.socketId] && "✋"}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                    {showModal && (
                        <div className={styles.sidePanelContainer}>
                            <div className={styles.chatContainer}>
                                <Tabs
                                    value={drawerTab}
                                    onChange={(e, val) => setDrawerTab(val)}
                                    variant="scrollable"
                                    scrollButtons="auto"
                                    sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, '& .MuiTab-root': { textTransform: 'none', fontWeight: 700, fontSize: '0.8rem', minWidth: 80 } }}
                                >
                                    <Tab icon={<ChatIcon fontSize="small" />} label="Chat" />
                                    <Tab icon={<PeopleIcon fontSize="small" />} label={`People (${(videos ? videos.length : 0) + 1})`} />
                                    <Tab icon={<PollIcon fontSize="small" />} label="Polls" />
                                    <Tab icon={<NoteAltIcon fontSize="small" />} label="Notes" />
                                </Tabs>

                                {/* Tab 0: In-Meeting Chat */}
                                {drawerTab === 0 && (
                                    <>
                                        <div className={styles.chattingDisplay}>
                                            {messages.length !== 0 ? messages.map((item, index) => (
                                                <div className={styles.chatBubble} key={index}>
                                                    <p className={styles.chatSender}>{item.sender || 'Participant'}</p>
                                                    <p className={styles.chatText}>{renderFormattedText(item.data)}</p>
                                                </div>
                                            )) : (
                                                <Typography variant="body2" sx={{ color: '#94A3B8', textAlign: 'center', mt: 4 }}>
                                                    No chat messages yet. Send a note to start chatting!
                                                </Typography>
                                            )}
                                        </div>

                                        <div className={styles.chattingArea}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                value={message}
                                                disabled={!allowChat && !isHost}
                                                onChange={(e) => setMessage(e.target.value)}
                                                placeholder={allowChat || isHost ? "Send a message..." : "Chat is disabled by Host"}
                                                variant="outlined"
                                                onKeyPress={(e) => { if (e.key === 'Enter') sendMessage(); }}
                                                InputProps={{
                                                    endAdornment: (
                                                        <IconButton
                                                            size="small"
                                                            disabled={!allowChat && !isHost}
                                                            onClick={(e) => setEmojiAnchor(e.currentTarget)}
                                                            sx={{ color: '#3B82F6' }}
                                                        >
                                                            <InsertEmoticonIcon fontSize="small" />
                                                        </IconButton>
                                                    )
                                                }}
                                                sx={{ '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                            />
                                            <Popover
                                                open={Boolean(emojiAnchor)}
                                                anchorEl={emojiAnchor}
                                                onClose={() => setEmojiAnchor(null)}
                                                anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                                                transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                                            >
                                                <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 1, bgcolor: '#FFFFFF', borderRadius: 2 }}>
                                                    {quickEmojis.map((e, idx) => (
                                                        <Button
                                                            key={idx}
                                                            size="small"
                                                            onClick={() => {
                                                                setMessage((prev) => prev + e);
                                                                setEmojiAnchor(null);
                                                            }}
                                                            sx={{ minWidth: 36, fontSize: '1.2rem', p: 0.5 }}
                                                        >
                                                            {e}
                                                        </Button>
                                                    ))}
                                                </Box>
                                            </Popover>
                                            <Button
                                                variant='contained'
                                                onClick={sendMessage}
                                                disabled={!allowChat && !isHost}
                                                className="glow-btn"
                                                sx={{ borderRadius: '10px', px: 2.5, py: 1 }}
                                            >
                                                Send
                                            </Button>
                                        </div>
                                    </>
                                )}

                                {/* Tab 1: Participants & Host Moderation */}
                                {drawerTab === 1 && (
                                    <div className={styles.chattingDisplay}>
                                        {/* Host Controls Header */}
                                        {isHost && (
                                            <Box sx={{ p: 1.5, bgcolor: 'rgba(59, 130, 246, 0.1)', borderRadius: 3, mb: 1.5, border: '1px solid rgba(59, 130, 246, 0.3)' }}>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
                                                    <SecurityIcon sx={{ color: '#3B82F6', fontSize: 18 }} />
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Host Controls</Typography>
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <LockIcon sx={{ fontSize: 16, color: isLocked ? '#F43F5E' : '#94A3B8' }} />
                                                        <Box>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>Room is {isLocked ? 'Locked' : 'Open'}</Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>{isLocked ? 'No new participants' : 'Open to invite link'}</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Switch checked={!!isLocked} onChange={() => handleToggleLock()} size="small" color="primary" />
                                                </Box>
                                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                        <ChatIcon sx={{ fontSize: 16, color: allowChat ? '#10B981' : '#F43F5E' }} />
                                                        <Box>
                                                            <Typography variant="caption" sx={{ fontWeight: 700, display: 'block' }}>In-Meeting Chat</Typography>
                                                            <Typography variant="caption" sx={{ color: '#64748B', fontSize: '0.7rem' }}>{allowChat ? 'Enabled for all' : 'Host only'}</Typography>
                                                        </Box>
                                                    </Box>
                                                    <Switch checked={!!allowChat} onChange={() => handleToggleChatPermission()} size="small" color="primary" />
                                                </Box>
                                            </Box>
                                        )}

                                        {/* Participant Count */}
                                        <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8', mb: 1, display: 'block' }}>
                                            Participants ({(videos ? videos.length : 0) + 1})
                                        </Typography>

                                        {/* Host (You) */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 2.5, mb: 0.8 }}>
                                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                {profilePic ? (
                                                    <Avatar src={profilePic} sx={{ width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }} />
                                                ) : (
                                                    <Avatar sx={{ bgcolor: '#3B82F6', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                                                        {username && username.length > 0 ? username.charAt(0).toUpperCase() : 'Y'}
                                                    </Avatar>
                                                )}
                                                <Typography variant="body2" sx={{ fontWeight: 700 }}>
                                                    {username || 'You'} (You)
                                                </Typography>
                                            </Box>
                                            <Chip label="Host" size="small" sx={{ fontWeight: 700, fontSize: '0.65rem', bgcolor: '#EFF6FF', color: '#3B82F6', height: 22 }} />
                                        </Box>

                                        {/* Other Participants */}
                                        {videos && videos.map((vid, idx) => {
                                            if (!vid) return null;
                                            const sId = vid.socketId || idx;
                                            return (
                                                <Box key={sId} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.2, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 2.5, mb: 0.8, '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.05)' } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                                                        <Avatar sx={{ bgcolor: '#8B5CF6', width: 32, height: 32, fontSize: '0.8rem', fontWeight: 700 }}>
                                                            P{idx + 1}
                                                        </Avatar>
                                                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                                            Participant {idx + 1}
                                                        </Typography>
                                                    </Box>
                                                    {isHost && (
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                            <IconButton size="small" onClick={() => handleHostMute(vid.socketId)} sx={{ color: '#FB7185' }}>
                                                                <MicOffIcon style={{ fontSize: 16 }} />
                                                            </IconButton>
                                                            <IconButton size="small" onClick={() => handleHostKick(vid.socketId)} sx={{ color: '#94A3B8' }}>
                                                                <MoreVertIcon style={{ fontSize: 16 }} />
                                                            </IconButton>
                                                        </Box>
                                                    )}
                                                </Box>
                                            );
                                        })}
                                    </div>
                                )}

                                {/* Tab 2: Interactive Polls & Q&A */}
                                {drawerTab === 2 && (
                                    <div className={styles.chattingDisplay}>
                                        {/* Sub-tab switcher: Live Polls vs Q&A */}
                                        <Box sx={{ display: 'flex', gap: 1, mb: 2, p: 0.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: '12px' }}>
                                            <Button
                                                fullWidth size="small"
                                                variant={pollSubTab === 0 ? "contained" : "text"}
                                                onClick={() => setPollSubTab(0)}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }}
                                            >
                                                Live Polls
                                            </Button>
                                            <Button
                                                fullWidth size="small"
                                                variant={pollSubTab === 1 ? "contained" : "text"}
                                                onClick={() => setPollSubTab(1)}
                                                sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700, fontSize: '0.8rem' }}
                                            >
                                                Q&A ({questions ? questions.length : 0})
                                            </Button>
                                        </Box>

                                        {pollSubTab === 0 ? (
                                            <>
                                                {/* Create Poll Form */}
                                                {isHost && (
                                                    <Box sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)', mb: 2 }}>
                                                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                                            <PollIcon sx={{ color: '#3B82F6', fontSize: 18 }} />
                                                            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Create a Live Poll</Typography>
                                                        </Box>
                                                        <TextField
                                                            fullWidth size="small"
                                                            placeholder="Poll Question..."
                                                            value={pollQuestion}
                                                            onChange={e => setPollQuestion(e.target.value)}
                                                            sx={{ mb: 1.5, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                                        />
                                                        {pollOptions.map((opt, idx) => (
                                                            <TextField
                                                                key={idx}
                                                                fullWidth size="small"
                                                                placeholder={`Option ${idx + 1}`}
                                                                value={opt}
                                                                onChange={e => {
                                                                    const copy = [...pollOptions];
                                                                    copy[idx] = e.target.value;
                                                                    setPollOptions(copy);
                                                                }}
                                                                sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: '8px' } }}
                                                            />
                                                        ))}
                                                        <Box sx={{ display: 'flex', gap: 1, mb: 1.5, alignItems: 'center' }}>
                                                            <Button
                                                                size="small"
                                                                onClick={() => setPollOptions([...pollOptions, `Option ${pollOptions.length + 1}`])}
                                                                sx={{ textTransform: 'none', fontWeight: 600, color: '#3B82F6' }}
                                                            >
                                                                + Option
                                                            </Button>
                                                        </Box>
                                                        <Button
                                                            fullWidth variant="contained"
                                                            onClick={handleCreatePoll}
                                                            className="glow-btn"
                                                            sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                                                        >
                                                            Launch Live Poll
                                                        </Button>
                                                    </Box>
                                                )}

                                                {/* Poll Results & Actions */}
                                                {polls && polls.map((poll) => {
                                                     if (!poll || !poll.options) return null;
                                                     const isClosed = poll.status === 'closed';
                                                     const totalVotes = poll.options.reduce((sum, o) => sum + (o?.votes || 0), 0) || 0;
                                                     const safeTotal = totalVotes === 0 ? 1 : totalVotes;
                                                     const maxVotes = Math.max(...poll.options.map(o => o?.votes || 0));

                                                     return (
                                                         <Box key={poll.id || Math.random()} sx={{ p: 2, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 3, mb: 1.5, bgcolor: 'rgba(255, 255, 255, 0.03)' }}>
                                                             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                                 <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                                     <PollIcon sx={{ color: isClosed ? '#94A3B8' : '#3B82F6', fontSize: 16 }} />
                                                                     <Chip 
                                                                         label={isClosed ? "Closed" : "Live"} 
                                                                         size="small" 
                                                                         sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: isClosed ? '#F1F5F9' : '#EFF6FF', color: isClosed ? '#64748B' : '#3B82F6' }} 
                                                                     />
                                                                 </Box>
                                                                 {isHost && (
                                                                     <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                         {!isClosed && (
                                                                             <Button size="small" onClick={() => handleEndPoll(poll.id)} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#F59E0B', py: 0.1, px: 0.8, minWidth: 0 }}>
                                                                                 Close Poll
                                                                             </Button>
                                                                         )}
                                                                         <Button size="small" onClick={() => handleDeletePoll(poll.id)} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#F43F5E', py: 0.1, px: 0.8, minWidth: 0 }}>
                                                                             Delete
                                                                         </Button>
                                                                     </Box>
                                                                 )}
                                                             </Box>

                                                             <Typography variant="subtitle2" sx={{ fontWeight: 800, mb: 1.5, fontSize: '0.95rem' }}>
                                                                 {poll.question}
                                                             </Typography>

                                                             {poll.options.map((opt, oIdx) => {
                                                                 if (!opt) return null;
                                                                 const pct = Math.round(((opt.votes || 0) / safeTotal) * 100);
                                                                 const isUserSelected = userVotes[poll.id] === oIdx;
                                                                 const isWinner = isClosed && maxVotes > 0 && opt.votes === maxVotes;

                                                                 return (
                                                                     <Box key={oIdx} onClick={() => !isClosed && handleVote(poll.id, oIdx)} sx={{ mb: 1.2, cursor: isClosed ? 'default' : 'pointer' }}>
                                                                         <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 0.3 }}>
                                                                             <Typography variant="body2" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center', gap: 0.8 }}>
                                                                                 {opt.text}
                                                                                 {isUserSelected && <Chip label="✓ Voted" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: '#ECFDF5', color: '#10B981' }} />}
                                                                                 {isWinner && <Chip label="Top Choice" size="small" sx={{ height: 16, fontSize: '0.55rem', fontWeight: 700, bgcolor: '#FEF3C7', color: '#D97706' }} />}
                                                                             </Typography>
                                                                             <Typography variant="body2" sx={{ fontWeight: 700, color: '#3B82F6' }}>
                                                                                 {opt.votes || 0} ({pct}%)
                                                                             </Typography>
                                                                         </Box>
                                                                         <Box sx={{ width: '100%', height: 8, bgcolor: 'rgba(255, 255, 255, 0.1)', borderRadius: 4, overflow: 'hidden' }}>
                                                                             <Box sx={{ width: `${pct}%`, height: '100%', bgcolor: isWinner ? '#F59E0B' : (isUserSelected ? '#10B981' : '#3B82F6'), borderRadius: 4, transition: 'width 0.5s ease' }} />
                                                                         </Box>
                                                                     </Box>
                                                                 );
                                                             })}

                                                             <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mt: 1, pt: 1, borderTop: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                                                 <Typography variant="caption" sx={{ color: '#94A3B8', fontWeight: 600 }}>
                                                                     Total Votes: {poll.totalVotes || 0}
                                                                 </Typography>
                                                                 {userVotes[poll.id] !== undefined && (
                                                                     <Typography variant="caption" sx={{ color: '#10B981', fontWeight: 700 }}>
                                                                         ✓ You participated
                                                                     </Typography>
                                                                 )}
                                                             </Box>
                                                         </Box>
                                                     );
                                                 })}
                                            </>
                                        ) : (
                                            /* Q&A Section */
                                            <>
                                                {/* Ask Question Form */}
                                                <Box sx={{ p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)', mb: 2 }}>
                                                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Ask a Question</Typography>
                                                    <TextField
                                                        fullWidth size="small" multiline rows={2}
                                                        placeholder="Type your question for the host/speaker..."
                                                        value={newQuestionText}
                                                        onChange={e => setNewQuestionText(e.target.value)}
                                                        sx={{ mb: 1, '& .MuiOutlinedInput-root': { borderRadius: '10px' } }}
                                                    />
                                                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                                        <FormControlLabel
                                                            control={<Switch checked={isAnonymousQuestion} onChange={e => setIsAnonymousQuestion(e.target.checked)} size="small" />}
                                                            label={<Typography variant="caption" sx={{ fontWeight: 600, color: '#94A3B8' }}>Post Anonymously</Typography>}
                                                        />
                                                        <Button
                                                            variant="contained" size="small"
                                                            onClick={handleAskQuestion}
                                                            disabled={!newQuestionText.trim()}
                                                            sx={{ borderRadius: '8px', textTransform: 'none', fontWeight: 700 }}
                                                        >
                                                            Submit Question
                                                        </Button>
                                                    </Box>
                                                </Box>

                                                {/* Questions List */}
                                                {questions && questions.length > 0 ? (
                                                    questions.map(q => (
                                                        <Box key={q.id} sx={{ p: 1.5, border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: 3, mb: 1.2, bgcolor: q.answered ? 'rgba(16, 185, 129, 0.05)' : 'rgba(255, 255, 255, 0.02)' }}>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                                                <Typography variant="caption" sx={{ fontWeight: 700, color: '#3B82F6' }}>
                                                                    {q.author} • {q.timestamp}
                                                                </Typography>
                                                                {q.answered ? (
                                                                    <Chip label="Answered" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#ECFDF5', color: '#10B981' }} />
                                                                ) : (
                                                                    <Chip label="Open" size="small" sx={{ height: 18, fontSize: '0.6rem', fontWeight: 700, bgcolor: '#EFF6FF', color: '#3B82F6' }} />
                                                                )}
                                                            </Box>
                                                            <Typography variant="body2" sx={{ fontWeight: 600, mb: 1.2, fontSize: '0.9rem' }}>
                                                                {q.question}
                                                            </Typography>
                                                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pt: 0.8, borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                                                                <Button
                                                                    size="small" variant="outlined"
                                                                    onClick={() => handleUpvoteQuestion(q.id)}
                                                                    disabled={userUpvotes[q.id]}
                                                                    sx={{ borderRadius: '6px', textTransform: 'none', fontSize: '0.72rem', py: 0.2, px: 1, borderColor: 'rgba(255, 255, 255, 0.2)', color: userUpvotes[q.id] ? '#10B981' : '#F8FAFC' }}
                                                                >
                                                                    {userUpvotes[q.id] ? "Upvoted" : "Upvote"} ({q.upvotes || 0})
                                                                </Button>
                                                                {isHost && (
                                                                    <Box sx={{ display: 'flex', gap: 0.5 }}>
                                                                        {!q.answered && (
                                                                            <Button size="small" onClick={() => handleAnswerQuestion(q.id)} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#10B981', py: 0.1, px: 0.8, minWidth: 0 }}>
                                                                                Mark Answered
                                                                            </Button>
                                                                        )}
                                                                        <Button size="small" onClick={() => handleDeleteQuestion(q.id)} sx={{ textTransform: 'none', fontSize: '0.7rem', color: '#F43F5E', py: 0.1, px: 0.8, minWidth: 0 }}>
                                                                            Delete
                                                                        </Button>
                                                                    </Box>
                                                                )}
                                                            </Box>
                                                        </Box>
                                                    ))
                                                ) : (
                                                    <Typography variant="caption" sx={{ color: '#94A3B8', textAlign: 'center', display: 'block', mt: 3 }}>
                                                        No questions asked yet. Be the first to ask!
                                                    </Typography>
                                                )}
                                            </>
                                        )}
                                    </div>
                                )}

                                {/* Tab 3: Meeting Notes (Clean & Emoji-Free) */}
                                {drawerTab === 3 && (
                                    <div className={styles.chattingDisplay}>
                                        {/* Notes Header */}
                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                                            <Box>
                                                <Typography variant="subtitle2" sx={{ fontWeight: 800 }}>Meeting Notes</Typography>
                                                <Typography variant="caption" sx={{ color: '#94A3B8', display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <span style={{ color: '#10B981' }}>●</span> Real-time synced with all participants
                                                </Typography>
                                            </Box>
                                        </Box>

                                        {/* Format Toolbar */}
                                        <Box sx={{ display: 'flex', gap: 0.8, mb: 1 }}>
                                            <Button size="small" variant="outlined" onClick={() => handleNotesChange({ target: { value: (meetingNotes || '') + '\n• ' } })} sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.2, borderRadius: '6px' }}>
                                                + Bullet
                                            </Button>
                                            <Button size="small" variant="outlined" onClick={() => handleNotesChange({ target: { value: (meetingNotes || '') + '\n- [ ] ' } })} sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.2, borderRadius: '6px' }}>
                                                + Task
                                            </Button>
                                            <Button size="small" variant="outlined" onClick={() => handleNotesChange({ target: { value: (meetingNotes || '') + `\n[${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}] ` } })} sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.2, borderRadius: '6px' }}>
                                                + Timestamp
                                            </Button>
                                            <Button size="small" color="error" onClick={() => handleNotesChange({ target: { value: '' } })} sx={{ fontSize: '0.7rem', textTransform: 'none', py: 0.2, ml: 'auto' }}>
                                                Clear
                                            </Button>
                                        </Box>

                                        {/* Notes Editor */}
                                        <TextField
                                            fullWidth multiline rows={11}
                                            value={meetingNotes}
                                            onChange={handleNotesChange}
                                            placeholder={"Meeting Agenda\n• Project overview\n• Timeline discussion\n\nKey Discussion Points\n• ...\n\nAction Items\n- [ ] Task 1\n- [ ] Task 2"}
                                            sx={{ '& .MuiOutlinedInput-root': { borderRadius: '12px', fontFamily: "'Inter', sans-serif", fontSize: '0.88rem', lineHeight: 1.7 } }}
                                        />

                                        {/* Export Options */}
                                        <Box sx={{ mt: 2, p: 1.5, bgcolor: 'rgba(255, 255, 255, 0.05)', borderRadius: 3, border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                                            <Typography variant="caption" sx={{ fontWeight: 700, color: '#94A3B8', mb: 1, display: 'block' }}>Export Notes</Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
                                                <Button size="small" fullWidth variant="text" startIcon={<span style={{ color: '#F43F5E', fontWeight: 800, fontSize: '0.7rem' }}>PDF</span>} onClick={() => exportNotes('pdf')}
                                                    sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
                                                    Export as PDF / Print
                                                </Button>
                                                <Button size="small" fullWidth variant="text" startIcon={<span style={{ color: '#3B82F6', fontWeight: 800, fontSize: '0.7rem' }}>DOC</span>} onClick={() => exportNotes('docx')}
                                                    sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
                                                    Export as DOCX
                                                </Button>
                                                <Button size="small" fullWidth variant="text" startIcon={<DownloadIcon sx={{ fontSize: 16 }} />} onClick={() => exportNotes('txt')}
                                                    sx={{ justifyContent: 'flex-start', textTransform: 'none', fontWeight: 600, borderRadius: '8px' }}>
                                                    Export as TXT
                                                </Button>
                                            </Box>
                                        </Box>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                    </div> {/* End meetMainBody */}

                    <div className={styles.bottomControlBar}>
                        <button className={styles.controlBtn} onClick={handleAudio}>
                            {audio ? <MicIcon /> : <MicOffIcon sx={{ color: '#F43F5E' }}/>}
                            <span>{audio ? 'Mute' : 'Unmute'}</span>
                        </button>
                        <button className={styles.controlBtn} onClick={handleVideo}>
                            {video ? <VideocamIcon /> : <VideocamOffIcon sx={{ color: '#F43F5E' }}/>}
                            <span>{video ? 'Stop Video' : 'Start Video'}</span>
                        </button>
                        {screenAvailable && (
                            <button className={styles.controlBtn} onClick={handleScreen}>
                                {screen ? <StopScreenShareIcon sx={{ color: '#3B82F6' }}/> : <ScreenShareIcon />}
                                <span style={{ color: screen ? '#3B82F6' : '#F8FAFC' }}>{screen ? 'Stop Share' : 'Share'}</span>
                            </button>
                        )}
                        <button className={styles.controlBtn} onClick={toggleRecording}>
                            <FiberManualRecordIcon sx={{ color: isRecording ? '#F43F5E' : '#F8FAFC' }} />
                            <span style={{ color: isRecording ? '#F43F5E' : '#F8FAFC' }}>{isRecording ? 'Recording...' : 'Record'}</span>
                        </button>
                        {/* Item 2: Raise Hand Button */}
                        <button className={styles.controlBtn} onClick={handleRaiseHand} style={{ position: 'relative' }}>
                            <BackHandIcon sx={{ color: raisedHand ? '#F59E0B' : '#F8FAFC' }} />
                            <span style={{ color: raisedHand ? '#F59E0B' : '#F8FAFC' }}>{raisedHand ? 'Lower' : 'Raise'}</span>
                        </button>
                        {/* Item 2: Reaction Button */}
                        <button className={styles.controlBtn} onClick={(e) => setReactionAnchor(e.currentTarget)}>
                            <EmojiEmotionsIcon sx={{ color: reactionAnchor ? '#3B82F6' : '#F8FAFC' }} />
                            <span style={{ color: reactionAnchor ? '#3B82F6' : '#F8FAFC' }}>React</span>
                        </button>
                        <Popover
                            open={Boolean(reactionAnchor)}
                            anchorEl={reactionAnchor}
                            onClose={() => setReactionAnchor(null)}
                            anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                            transformOrigin={{ vertical: 'bottom', horizontal: 'center' }}
                        >
                            <Box sx={{ p: 1.5, display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: 0.8, bgcolor: '#1E293B', borderRadius: 2, border: '1px solid rgba(255,255,255,0.1)' }}>
                                {quickEmojis.map((emoji, idx) => (
                                    <Button
                                        key={idx}
                                        size="small"
                                        onClick={() => {
                                            triggerEmoji(emoji);
                                            setReactionAnchor(null);
                                        }}
                                        sx={{ minWidth: 36, fontSize: '1.3rem', p: 0.5, '&:hover': { bgcolor: 'rgba(255,255,255,0.1)' } }}
                                    >
                                        {emoji}
                                    </Button>
                                ))}
                            </Box>
                        </Popover>
                        <button className={styles.controlBtn} onClick={() => { setModal(!showModal); setDrawerTab(0); setNewMessages(0); }}>
                            <Badge badgeContent={newMessages} color="primary" overlap="circular">
                                <ChatIcon sx={{ color: (showModal && drawerTab === 0) ? '#3B82F6' : '#F8FAFC' }} />
                            </Badge>
                            <span style={{ color: (showModal && drawerTab === 0) ? '#3B82F6' : '#F8FAFC' }}>Chat</span>
                        </button>
                        <button className={styles.controlBtn} onClick={() => { setModal(true); setDrawerTab(1); }}>
                            <Badge badgeContent={videos.length + 1} color="primary" overlap="circular">
                                <PeopleIcon sx={{ color: (showModal && drawerTab === 1) ? '#3B82F6' : '#F8FAFC' }} />
                            </Badge>
                            <span style={{ color: (showModal && drawerTab === 1) ? '#3B82F6' : '#F8FAFC' }}>People</span>
                        </button>
                        <button className={styles.controlBtn} onClick={() => { setModal(true); setDrawerTab(2); }}>
                            <PollIcon sx={{ color: (showModal && drawerTab === 2) ? '#3B82F6' : '#F8FAFC' }} />
                            <span style={{ color: (showModal && drawerTab === 2) ? '#3B82F6' : '#F8FAFC' }}>Polls</span>
                        </button>
                        <button className={styles.controlBtn} onClick={() => { setModal(true); setDrawerTab(3); }}>
                            <NoteAltIcon sx={{ color: (showModal && drawerTab === 3) ? '#3B82F6' : '#F8FAFC' }} />
                            <span style={{ color: (showModal && drawerTab === 3) ? '#3B82F6' : '#F8FAFC' }}>Notes</span>
                        </button>
                        <button className={`${styles.leaveBtn}`} onClick={() => setShowLeaveConfirm(true)}>
                            <CallEndIcon />
                            <span>{isHost ? 'End Call' : 'Leave'}</span>
                        </button>
                    </div>
                </div>
            )}

            {/* Leave Confirmation Dialog */}
            <Dialog open={showLeaveConfirm} onClose={() => setShowLeaveConfirm(false)}>
                <DialogTitle sx={{ fontWeight: 800 }}>{isHost ? "Host Call Options" : "Leave Meeting?"}</DialogTitle>
                <DialogContent>
                    <Typography variant="body2" sx={{ color: '#94A3B8' }}>
                        {isHost 
                            ? "As the host, you can end this meeting for all participants or leave yourself."
                            : "Are you sure you want to leave this meeting? You can rejoin later if active."}
                    </Typography>
                </DialogContent>
                <DialogActions sx={{ p: 2, gap: 1 }}>
                    <Button onClick={() => setShowLeaveConfirm(false)} sx={{ fontWeight: 600, color: '#94A3B8', textTransform: 'none' }}>Cancel</Button>
                    <Button onClick={handleEndCall} variant="outlined" sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}>Leave Meeting Only</Button>
                    {isHost && (
                        <Button onClick={handleEndMeetingForEveryone} variant="contained" color="error" sx={{ fontWeight: 700, borderRadius: '8px', textTransform: 'none' }}>End Meeting For Everyone</Button>
                    )}
                </DialogActions>
            </Dialog>

            {/* Device Settings Dialog Modal */}
            <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} fullWidth maxWidth="xs">
                <DialogTitle sx={{ fontWeight: 800, fontFamily: "'Plus Jakarta Sans', sans-serif" }}>Audio & Video Settings</DialogTitle>
                <DialogContent dividers>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Join Defaults</Typography>
                    <FormControlLabel 
                        control={<Switch checked={defaultMicOff} onChange={(e) => setDefaultMicOff(e.target.checked)} />} 
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Mute microphone when joining</Typography>} 
                        sx={{ mb: 1, display: 'block' }} 
                    />
                    <FormControlLabel 
                        control={<Switch checked={defaultCamOff} onChange={(e) => setDefaultCamOff(e.target.checked)} />} 
                        label={<Typography variant="body2" sx={{ fontWeight: 600 }}>Turn off camera when joining</Typography>} 
                        sx={{ mb: 3, display: 'block' }} 
                    />

                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Video Resolution Quality</Typography>
                    <Button variant="outlined" fullWidth sx={{ mb: 3, borderRadius: '10px', textTransform: 'none' }}>1080p Full HD (Default)</Button>
                    
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>Meeting Recording</Typography>
                    <Button
                        variant={isRecording ? "contained" : "outlined"}
                        color={isRecording ? "error" : "primary"}
                        fullWidth
                        onClick={() => setIsRecording(!isRecording)}
                        sx={{ borderRadius: '10px', textTransform: 'none', fontWeight: 700 }}
                    >
                        {isRecording ? "Stop Recording" : "Start Session Recording"}
                    </Button>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsOpen(false)} sx={{ fontWeight: 700 }}>Done</Button>
                </DialogActions>
            </Dialog>
        </div>
    )
}