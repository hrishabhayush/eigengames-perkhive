"""
OpenAI Voice module for LangChain

This module provides voice capabilities for LangChain using OpenAI's APIs.
It includes functionality for:
- Speech-to-text (transcription)
- Text-to-speech (synthesis)
- Audio recording and playback
"""

import os
import tempfile
from typing import Optional, Dict, Any, List, Union
from dataclasses import dataclass

import numpy as np
import sounddevice as sd
import soundfile as sf
from openai import OpenAI
from langchain_openai import ChatOpenAI

@dataclass
class AudioResponse:
    """Container for audio data and its sampling rate"""
    audio_data: np.ndarray
    sampling_rate: int

class OpenAIVoice(ChatOpenAI):
    """
    OpenAI voice capabilities extension for LangChain.
    
    This class extends ChatOpenAI to add voice functionality including:
    - Speech-to-text transcription
    - Text-to-speech synthesis
    - Audio recording
    """
    voice: str = "alloy"
    tts_model: str = "tts-1"
    
    def __init__(
        self,
        model_name: str = "gpt-4o",
        temperature: float = 0.7,
        openai_api_key: Optional[str] = None,
        voice: str = "alloy",
        tts_model: str = None,
        **kwargs
    ):
        """
        Initialize the OpenAIVoice class.
        
        Args:
            model_name: The OpenAI model to use for chat completion
            temperature: Sampling temperature
            openai_api_key: API key for OpenAI (falls back to OPENAI_API_KEY env var)
            voice: Voice ID for text-to-speech (options: alloy, echo, fable, onyx, nova, shimmer)
            tts_model: Model to use for TTS (options: tts-1, tts-1-hd)
            tts_model: Model to use for TTS (options: tts-1, tts-1-hd). Defaults to OPENAI_TTS_MODEL env var or "tts-1" if not set.
        """
        super().__init__(
            model_name=model_name,
            temperature=temperature,
            openai_api_key=openai_api_key,
            **kwargs
        )
        

        self.voice = voice
        self.tts_model = tts_model or os.getenv("OPENAI_TTS_MODEL", "tts-1")
        self.client = OpenAI(api_key=openai_api_key or os.getenv("OPENAI_API_KEY"))
    def transcribe(self, audio_file_path: str) -> str:
        """
        Transcribe audio to text using OpenAI's Whisper model.
        
        Args:
            audio_file_path: Path to the audio file to transcribe
            
        Returns:
            Transcribed text as a string
        """
        try:
            with open(audio_file_path, "rb") as audio_file:
                transcript = self.client.audio.transcriptions.create(
                    model="whisper-1",
                    file=audio_file
                )
            return transcript.text
        except Exception as e:
            print(f"Error transcribing audio: {e}")
            return ""
    
    async def synthesize_speech(self, text: str) -> AudioResponse:
        """
        Convert text to speech using OpenAI's text-to-speech API.
        
        Args:
            text: The text to convert to speech
            
        Returns:
            AudioResponse object containing audio data and sampling rate
        """
        # Create temporary file for the audio
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".mp3")
        temp_filename = temp_file.name
        temp_file.close()
        
        try:
            # Generate speech using OpenAI API
            response = self.client.audio.speech.create(
                model=self.tts_model,
                voice=self.voice,
                input=text
            )
            
            # Save to file
            response.stream_to_file(temp_filename)
            
            # Read the audio data
            data, sampling_rate = sf.read(temp_filename)
            
            # Return audio data
            return AudioResponse(audio_data=data, sampling_rate=sampling_rate)
        except Exception as e:
            print(f"Error synthesizing speech: {e}")
            return AudioResponse(audio_data=np.array([]), sampling_rate=24000)
        finally:
            # Clean up temporary file
            if os.path.exists(temp_filename):
                os.unlink(temp_filename)
    
    async def record_audio(self, seconds: int = 5, sample_rate: int = 24000) -> str:
        """
        Record audio from the microphone.
        
        Args:
            seconds: Duration of recording in seconds
            sample_rate: Sample rate for recording
            
        Returns:
            Path to the recorded audio file
        """
        print(f"Recording for {seconds} seconds...")
        
        # Create temporary file for recording
        temp_file = tempfile.NamedTemporaryFile(delete=False, suffix=".wav")
        temp_filename = temp_file.name
        temp_file.close()
        
        try:
            # Record audio from microphone
            recording = sd.rec(
                int(seconds * sample_rate),
                samplerate=sample_rate,
                channels=1
            )
            sd.wait()  # Wait until recording is finished
            
            # Save recording to file
            sf.write(temp_filename, recording, sample_rate)
            
            return temp_filename
        except Exception as e:
            print(f"Error recording audio: {e}")
            # Create an empty file if recording fails
            sf.write(temp_filename, np.zeros((1000,)), sample_rate)
            return temp_filename
    
    def play_audio(self, audio_data: np.ndarray, sample_rate: int = 24000) -> None:
        """
        Play audio data through the speakers.
        
        Args:
            audio_data: NumPy array of audio data
            sample_rate: Sample rate of the audio data
        """
        try:
            sd.play(audio_data, sample_rate)
            sd.wait()  # Wait until audio finishes playing
        except Exception as e:
            print(f"Error playing audio: {e}")

