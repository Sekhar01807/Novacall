import { useState, useEffect, useRef, useCallback } from "react";

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

    const black = ({ width = 640, height = 480 } = {}) => {
        let canvas = Object.assign(document.createElement("canvas"), { width, height });
        canvas.getContext('2d').fillRect(0, 0, width, height);
        let stream = canvas.captureStream();
        return Object.assign(stream.getVideoTracks()[0], { enabled: false });
    };

    const silence = () => {
        let ctx = new AudioContext();
        let oscillator = ctx.createOscillator();
        let dst = oscillator.connect(ctx.createMediaStreamDestination());
        oscillator.start();
        ctx.resume();
        return Object.assign(dst.stream.getAudioTracks()[0], { enabled: false });
    };

    const blackSilence = () => new MediaStream([black(), silence()]);

    const enumerateDevices = async () => {
        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
        } catch (e) {
            console.error("Enumerate devices error:", e);
        }
    };

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
            if (navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            }
            await enumerateDevices();

            // Stop existing tracks before requesting fresh media
            if (window.localStream) {
                window.localStream.getTracks().forEach(t => t.stop());
            }

            const constraints = { video: video, audio: audio };
            if (constraints.video || constraints.audio) {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                window.localStream = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
                setPermissionError("");
                setPermissionDenied(false);
            } else {
                window.localStream = blackSilence();
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = window.localStream;
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
                localVideoRef.current.srcObject = window.localStream;
            }
        }
    }, [audio, video]);

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
