'use client';

import React, { useState, useEffect, useRef } from 'react';

interface VoiceRecordProps {
onTranscriptReady?: (transcript: string) => void;
}

export default function VoiceRecord({ onTranscriptReady }: VoiceRecordProps) {
const [isRecording, setIsRecording] = useState(false);
const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
const [showTextBar, setShowTextBar] = useState(false);
const [transcript, setTranscript] = useState('');
const recognitionRef = useRef<any>(null);

useEffect(() => {
// Initialize speech recognition if available in the browser
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    recognitionRef.current.continuous = true;
    recognitionRef.current.interimResults = true;
    
    recognitionRef.current.onresult = (event: any) => {
    const current = event.resultIndex;
    const newTranscript = event.results[current][0].transcript;
    setTranscript(prev => prev + ' ' + newTranscript);
    
    if (event.results[current].isFinal && onTranscriptReady) {
        onTranscriptReady(transcript + ' ' + newTranscript);
    }
    };
}

return () => {
    if (recognitionRef.current) {
    try {
        recognitionRef.current.stop();
    } catch (e) {
        // Ignore errors when stopping
    }
    }
};
}, [onTranscriptReady, transcript]);

const handleRecordButtonClick = async () => {
if (isRecording) {
    mediaRecorder?.stop();
    if (recognitionRef.current) {
    recognitionRef.current.stop();
    }
    setIsRecording(false);
    setShowTextBar(false);
    
    // Send final transcript to parent
    if (onTranscriptReady && transcript.trim()) {
    onTranscriptReady(transcript);
    }
    } else {
        try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const recorder = new MediaRecorder(stream);
        recorder.ondataavailable = (event) => {
            const audioURL = URL.createObjectURL(event.data);
            console.log('Audio URL:', audioURL);
        };
        recorder.start();
        setMediaRecorder(recorder);
        
        // Reset transcript when starting a new recording
        setTranscript('');
        
        // Start speech recognition
        if (recognitionRef.current) {
            recognitionRef.current.start();
        }
        
        setIsRecording(true);
        setShowTextBar(true);
      } catch (err) {
        console.error('Error accessing microphone:', err);
      }
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleRecordButtonClick}
        className={`p-4 rounded-full ${isRecording ? 'bg-red-800' : 'bg-blue-800'} text-white mb-4`}
      >
        {isRecording ? 'Stop' : 'Record'}
      </button>
      {showTextBar && (
        <div className="w-full max-w-md p-2 border border-gray-300 rounded">
        <input
            type="text"
            value={transcript}
            placeholder="Speak now..."
            className="w-full p-2 border border-gray-300 rounded"
            readOnly
        />
        </div>
      )}
    </div>
  );
}