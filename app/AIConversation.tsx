"use client";

import { useState, useEffect } from 'react';
import { useWebSocket } from './WebSocketClient';
import useAudioManager from './AudioManager';

interface AIConversationProps {
serverUrl?: string;
onTranscriptUpdate?: (transcript: string) => void;
}

export default function AIConversation({ 
serverUrl = 'ws://localhost:3000/ws', 
onTranscriptUpdate 
}: AIConversationProps) {
const [isRecording, setIsRecording] = useState(false);
const [isProcessing, setIsProcessing] = useState(false);
const [transcript, setTranscript] = useState<string>('');
const [messages, setMessages] = useState<{ sender: 'user' | 'ai'; text: string }[]>([]);

// Set up WebSocket client
const handleMessage = (event: MessageEvent) => {
if (typeof event.data === 'string') {
    // Handle text messages (if any)
    try {
    const data = JSON.parse(event.data);
    if (data.transcript) {
        setTranscript(data.transcript);
        setMessages(prev => [...prev, { sender: 'user', text: data.transcript }]);
        if (onTranscriptUpdate) {
        onTranscriptUpdate(data.transcript);
        }
    }
    if (data.message) {
        setMessages(prev => [...prev, { sender: 'ai', text: data.message }]);
    }
    } catch (e) {
    console.log('Received text message:', event.data);
    }
} else if (event.data instanceof Blob) {
    // Handle audio response
    setIsProcessing(false);
    playAudio(event.data);
}
};

const { isConnected, sendMessage } = useWebSocket({ url: serverUrl, onMessage: handleMessage });

// Set up Audio Manager
const { playAudio, startRecording: startAudioRecording, stopRecording: stopAudioRecording } = useAudioManager();

// Handle processing state when recording stops
useEffect(() => {
if (!isRecording && messages.length > 0) {
    setIsProcessing(true);
}
}, [isRecording, messages.length]);

const startRecording = async () => {
try {
    await startAudioRecording();
    setIsRecording(true);
    setIsProcessing(false); // Don't set to true until we have some data
} catch (error) {
    console.error('Error starting recording:', error);
}
};

const stopRecording = () => {
if (isRecording) {
    stopAudioRecording();
    setIsRecording(false);
    setIsProcessing(true); // Now we're processing the recording
}
};

return (
    <div className="w-full max-w-lg mx-auto p-4 border rounded-lg shadow-md">
    <h2 className="text-xl font-bold mb-4">AI Conversation</h2>
    
    <div className="flex items-center mb-4">
        <div className={`w-3 h-3 rounded-full mr-2 ${isConnected ? 'bg-green-500' : 'bg-red-500'}`}></div>
        <span>{isConnected ? 'Connected' : 'Disconnected'}</span>
    </div>
    
    <div className="mb-4 h-64 overflow-y-auto border rounded p-3 bg-gray-50">
        {messages.map((msg, index) => (
        <div key={index} className={`mb-2 p-2 rounded ${msg.sender === 'user' ? 'bg-blue-100 ml-8' : 'bg-green-100 mr-8'}`}>
            <div className="font-bold">{msg.sender === 'user' ? 'You' : 'AI'}</div>
            <div>{msg.text}</div>
        </div>
        ))}
        {isProcessing && (
        <div className="text-center p-2">
            <span className="inline-block animate-pulse">Processing...</span>
        </div>
        )}
    </div>
    
    <div className="flex justify-center">
        <button
        onClick={isRecording ? stopRecording : startRecording}
        disabled={!isConnected || isProcessing}
        className={`px-4 py-2 rounded-full ${
            isRecording 
            ? 'bg-red-500 hover:bg-red-600' 
            : 'bg-blue-500 hover:bg-blue-600'
        } text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-16 h-16`}
        aria-label={isRecording ? 'Stop recording' : 'Start recording'}
        >
        {isRecording ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <rect x="6" y="6" width="12" height="12" strokeWidth="2" />
            </svg>
        ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
        )}
        </button>
    </div>
    </div>
);
}

