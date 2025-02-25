'use client';

import React, {useState} from 'react';

export default function App() {
    const [isRecording, setIsRecording] = useState(false);
    const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  
    const handleRecordButtonClick = async () => {
      if (isRecording) {
        mediaRecorder?.stop();
        setIsRecording(false);
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
        } catch (err) {
          console.error('Error accessing microphone:', err);
        }
      }
    };

    return (
        <button
            onClick={handleRecordButtonClick}
            className={`p-4 rounded-full ${isRecording ? 'bg-red-800' : 'bg-blue-800'} text-white`}
        >
            {isRecording ? 'Stop' : 'Record'}
        </button>
    )
}