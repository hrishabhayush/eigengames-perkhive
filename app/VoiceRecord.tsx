'use client';

import React, { useState } from 'react';

export default function App() {
  const [isRecording, setIsRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [showTextBar, setShowTextBar] = useState(false);

  const handleRecordButtonClick = async () => {
    if (isRecording) {
      mediaRecorder?.stop();
      setIsRecording(false);
      setShowTextBar(false);
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
            placeholder="Speak now..."
            className="w-full p-2 border border-gray-300 rounded"
            readOnly
          />
        </div>
      )}
    </div>
  );
}