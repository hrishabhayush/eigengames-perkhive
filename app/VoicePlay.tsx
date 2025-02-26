'use client';

import React, { useRef, useImperativeHandle, forwardRef, useEffect } from 'react';

const VoicePlay = forwardRef<{ playAudio: () => void }, { audioSrc: string }>(({ audioSrc }, ref) => {
    const audioRef = useRef<HTMLAudioElement>(null);

    useImperativeHandle(ref, () => ({
        playAudio() {
            if (audioRef.current) {
                audioRef.current.play();
            }
        }
    }));

    useEffect(() => {
        if (audioRef.current && audioSrc) {
            audioRef.current.src = audioSrc;
        }
    }, [audioSrc]);

    return (
        <div>
            <audio ref={audioRef} />
        </div>
    );
});

export default VoicePlay;