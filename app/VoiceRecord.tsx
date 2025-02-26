'use client';

import React, { useState, useEffect } from 'react';

export default function VoiceRecord() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window)) {
      console.error('Speech recognition not supported in this browser.');
      return;
    }

    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event: any) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          setTranscript((prev) => prev + event.results[i][0].transcript);
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }
    };

    recognition.onerror = (event: any) => {
      console.error('Speech recognition error', event.error);
    };

    if (isRecording) {
      recognition.start();
    } else {
      recognition.stop();
    }

    return () => {
      recognition.stop();
    };
  }, [isRecording]);

  const handleRecordButtonClick = () => {
    setIsRecording((prev) => !prev);
  };

  return (
    <div className="flex flex-col items-center p-4">
      <button
        onClick={handleRecordButtonClick}
        className={`p-4 rounded-full ${isRecording ? 'bg-red-600' : 'bg-blue-600'} text-white mb-4`}
      >
        {isRecording ? 'Stop Recording' : 'Start Recording'}
      </button>
      
      <div className="w-full max-w-md">
        <div className="p-4 border border-gray-300 rounded bg-white shadow-sm">
          <p className="text-sm text-gray-500 mb-2">
            {isRecording ? 'Recording... Speak now' : 'Transcription'}
          </p>
          
          <div className="w-full min-h-20 p-3 border border-gray-200 rounded bg-gray-50">
            {transcript}
          </div>
        </div>
      </div>
    </div>
  );
}