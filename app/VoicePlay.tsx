'use client';

import React, { useRef, useImperativeHandle, forwardRef } from 'react';

const VoicePlay = forwardRef((props, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useImperativeHandle(ref, () => ({
        playAudio() {
            if (audioRef.current) {
                audioRef.current.play();
            }
        }
    }));

    return (
        <div>
            <audio ref={audioRef} src='/audio/audio.mp3' />
        </div>
    );
});

export default VoicePlay;