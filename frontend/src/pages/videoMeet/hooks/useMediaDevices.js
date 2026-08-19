import { useState, useEffect, useRef, useCallback } from "react";

const black = ({ width = 640, height = 480 } = {}) => {
    try {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.fillRect(0, 0, width, height);
        if (typeof canvas.captureStream === 'function') {
            let stream = canvas.captureStream();
            if (stream && stream.getVideoTracks().length > 0) {
                return Object.assign(stream.getVideoTracks()[0], { enabled: false });
            }
        }
    } catch (e) {
        console.warn("black canvas fallback error:", e);
    }
    return null;
};

const silence = () => {
    try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return null;
        let ctx = new AudioCtx();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        if (dst && dst.stream && dst.stream.getAudioTracks().length > 0) {
            return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
        }
    } catch (e) {
        console.warn("silence audio fallback error:", e);
    }
    return null;
};

const blackSilence = () => {
    try {
        const tracks = [];
        const b = black();
        const s = silence();
        if (b) tracks.push(b);
        if (s) tracks.push(s);
        const StreamClass = window.MediaStream || window.webkitMediaStream;
        if (StreamClass) {
            return new StreamClass(tracks);
        }
    } catch (e) {
        console.warn("blackSilence creation error:", e);
    }
    return {
        getTracks: () => [],
        getAudioTracks: () => [],
        getVideoTracks: () => []
    };
};

export function useMediaDevices() {
    const [audio, setAudio] = useState(true);
    const [video, setVideo] = useState(true);
    const [screen, setScreen] = useState(false);
    const [screenAvailable, setScreenAvailable] = useState(false);
    const [audioDevices, setAudioDevices] = useState([]);
    const [videoDevices, setVideoDevices] = useState([]);
    const [selectedAudioDevice, setSelectedAudioDevice] = useState("");
    const [selectedVideoDevice, setSelectedVideoDevice] = useState("");
    const [permissionError, setPermissionError] = useState("");
    const [permissionDenied, setPermissionDenied] = useState(false);

    const localVideoRef = useRef(null);

    const enumerateDevices = useCallback(async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audios = devices.filter(d => d.kind === 'audioinput');
            const videos = devices.filter(d => d.kind === 'videoinput');
            setAudioDevices(audios);
            setVideoDevices(videos);
            if (audios.length > 0) setSelectedAudioDevice(prev => prev || audios[0].deviceId);
            if (videos.length > 0) setSelectedVideoDevice(prev => prev || videos[0].deviceId);
        } catch (e) {
            console.error("Device enumeration error:", e);
        }
    }, []);

    const stopMedia = useCallback(() => {
        if (window.localStream) {
            window.localStream.getTracks().forEach(track => {
                try {
                    track.stop();
                } catch (e) {
                    console.error("Error stopping track:", e);
                }
            });
            window.localStream = null;
        }
        if (localVideoRef.current) {
            localVideoRef.current.srcObject = null;
        }
    }, []);

    const getUserMedia = useCallback(async () => {
        try {
            const savedSettings = JSON.parse(localStorage.getItem("meetingSettings")) || {};
            if (savedSettings.defaultMicOff) setAudio(false);
            if (savedSettings.defaultCamOff) setVideo(false);

            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            }
            await enumerateDevices();

            const constraints = { video: video, audio: audio };
            if (navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === 'function' && (constraints.video || constraints.audio)) {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                window.localStream = stream;
                if (localVideoRef.current) {
                    try {
                        localVideoRef.current.srcObject = stream;
                    } catch {
                        localVideoRef.current.srcObject = null;
                    }
                }
                setPermissionError("");
                setPermissionDenied(false);
            } else {
                window.localStream = blackSilence();
                if (localVideoRef.current) {
                    try {
                        localVideoRef.current.srcObject = (typeof MediaStream !== 'undefined' && window.localStream instanceof MediaStream) ? window.localStream : null;
                    } catch {
                        localVideoRef.current.srcObject = null;
                    }
                }
            }
        } catch (err) {
            console.warn("getUserMedia failed with error:", err.name, err.message);
            if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
                setPermissionDenied(true);
                setPermissionError("Camera or microphone permission blocked. Please enable device access in your browser settings.");
            } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
                setPermissionError("No camera or microphone device was detected on your system.");
            } else if (err.name === 'NotReadableError' || err.name === 'TrackStartError') {
                setPermissionError("Camera or microphone is already in use by another application.");
            } else {
                setPermissionError(`Media access error: ${err.message || 'Unable to access audio/video devices.'}`);
            }

            window.localStream = blackSilence();
            if (localVideoRef.current) {
                try {
                    localVideoRef.current.srcObject = (typeof MediaStream !== 'undefined' && window.localStream instanceof MediaStream) ? window.localStream : null;
                } catch {
                    localVideoRef.current.srcObject = null;
                }
            }
        }
    }, [audio, video, enumerateDevices]);

    const toggleAudio = () => {
        setAudio(prev => {
            const next = !prev;
            if (window.localStream) {
                window.localStream.getAudioTracks().forEach(t => t.enabled = next);
            }
            return next;
        });
    };

    const toggleVideo = () => {
        setVideo(prev => {
            const next = !prev;
            if (window.localStream) {
                window.localStream.getVideoTracks().forEach(t => t.enabled = next);
            }
            return next;
        });
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            stopMedia();
        };
    }, [stopMedia]);

    return {
        audio,
        video,
        screen,
        screenAvailable,
        localVideoRef,
        audioDevices,
        videoDevices,
        selectedAudioDevice,
        setSelectedAudioDevice,
        selectedVideoDevice,
        setSelectedVideoDevice,
        permissionError,
        setPermissionError,
        permissionDenied,
        getUserMedia,
        toggleAudio,
        toggleVideo,
        setScreen,
        stopMedia
    };
}
