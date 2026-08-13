import { useState, useEffect, useRef } from "react";

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
            const devices = await navigator.mediaDevices.enumerateDevices();
            setAudioDevices(devices.filter(d => d.kind === 'audioinput'));
            setVideoDevices(devices.filter(d => d.kind === 'videoinput'));
        } catch (e) {
            console.error("Enumerate devices error:", e);
        }
    };

    const getUserMedia = async () => {
        try {
            if (navigator.mediaDevices.getDisplayMedia) {
                setScreenAvailable(true);
            }
            await enumerateDevices();

            const constraints = { video: video, audio: audio };
            if (constraints.video || constraints.audio) {
                const stream = await navigator.mediaDevices.getUserMedia(constraints);
                window.localStream = stream;
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = stream;
                }
            } else {
                window.localStream = blackSilence();
                if (localVideoRef.current) {
                    localVideoRef.current.srcObject = window.localStream;
                }
            }
        } catch (err) {
            setPermissionError("Camera or microphone permission denied. Using fallback stream.");
            window.localStream = blackSilence();
            if (localVideoRef.current) {
                localVideoRef.current.srcObject = window.localStream;
            }
        }
    };

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
        getUserMedia,
        toggleAudio,
        toggleVideo,
        setScreen
    };
}
