'use client';

import { useEffect, useRef, useState, useCallback } from 'react';

interface AudioManagerProps {
onAudioData?: (audioData: Float32Array) => void;
onAudioStart?: () => void;
onAudioStop?: () => void;
}

export default function useAudioManager({ onAudioData, onAudioStart, onAudioStop }: AudioManagerProps = {}) {
const audioContextRef = useRef<AudioContext | null>(null);
const processorNodeRef = useRef<AudioWorkletNode | null>(null);
const playbackNodeRef = useRef<AudioWorkletNode | null>(null);
const streamRef = useRef<MediaStream | null>(null);
const sourceNodeRef = useRef<MediaStreamAudioSourceNode | null>(null);
const [isRecording, setIsRecording] = useState<boolean>(false);
const [isInitialized, setIsInitialized] = useState<boolean>(false);
const [error, setError] = useState<string | null>(null);

// Initialize audio context and worklets
const initAudio = useCallback(async () => {
    try {
    if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
    }
    
    if (audioContextRef.current.state === 'suspended') {
        await audioContextRef.current.resume();
    }

    // Load audio worklets
    await audioContextRef.current.audioWorklet.addModule('/audio-processor-worklet.js');
    await audioContextRef.current.audioWorklet.addModule('/audio-playback-worklet.js');
    
    // Create audio processor node
    processorNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-processor-worklet');
    
    // Create audio playback node
    playbackNodeRef.current = new AudioWorkletNode(audioContextRef.current, 'audio-playback-worklet');
    playbackNodeRef.current.connect(audioContextRef.current.destination);
    
    // Set up message handler for processor node
    processorNodeRef.current.port.onmessage = (event) => {
        if (onAudioData && event.data && event.data.audioData) {
        onAudioData(event.data.audioData);
        }
    };
    
    setIsInitialized(true);
    setError(null);
    } catch (err) {
    console.error('Error initializing audio:', err);
    setError(`Failed to initialize audio: ${err.message}`);
    }
}, [onAudioData]);

// Initialize on component mount
useEffect(() => {
    initAudio();
    
    return () => {
    // Cleanup when component unmounts
    if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
    }
    
    if (audioContextRef.current) {
        audioContextRef.current.close();
    }
    };
}, [initAudio]);

// Start recording
const startRecording = useCallback(async () => {
    if (!isInitialized) {
    await initAudio();
    }
    
    try {
    // Get microphone access
    streamRef.current = await navigator.mediaDevices.getUserMedia({ audio: true });
    
    // Create source node from microphone stream
    sourceNodeRef.current = audioContextRef.current.createMediaStreamSource(streamRef.current);
    
    // Connect source to processor
    sourceNodeRef.current.connect(processorNodeRef.current);
    
    setIsRecording(true);
    if (onAudioStart) onAudioStart();
    } catch (err) {
    console.error('Error starting audio recording:', err);
    setError(`Failed to start recording: ${err.message}`);
    }
}, [isInitialized, initAudio, onAudioStart]);

// Stop recording
const stopRecording = useCallback(() => {
    if (sourceNodeRef.current) {
    sourceNodeRef.current.disconnect();
    sourceNodeRef.current = null;
    }
    
    if (streamRef.current) {
    streamRef.current.getTracks().forEach(track => track.stop());
    streamRef.current = null;
    }
    
    setIsRecording(false);
    if (onAudioStop) onAudioStop();
}, [onAudioStop]);

// Play audio
const playAudio = useCallback((audioData: Float32Array) => {
    if (playbackNodeRef.current && audioData) {
    playbackNodeRef.current.port.postMessage({ audioData });
    }
}, []);

return {
    isInitialized,
    isRecording,
    error,
    startRecording,
    stopRecording,
    playAudio
};
}

