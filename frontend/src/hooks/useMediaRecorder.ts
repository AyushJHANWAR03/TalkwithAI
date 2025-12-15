'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { MAX_RECORDING_DURATION } from '@/lib/constants';

interface UseMediaRecorderProps {
  onAudioData?: (data: Blob) => void;
  onRecordingComplete?: (blob: Blob) => void;
}

interface UseMediaRecorderReturn {
  isRecording: boolean;
  isPaused: boolean;
  duration: number;
  timeRemaining: number;
  videoRef: React.RefObject<HTMLVideoElement | null>;
  startRecording: () => Promise<void>;
  stopRecording: () => void;
  pauseRecording: () => void;
  resumeRecording: () => void;
  recordedBlob: Blob | null;
  error: string | null;
}

export function useMediaRecorder({
  onAudioData,
  onRecordingComplete,
}: UseMediaRecorderProps = {}): UseMediaRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioProcessorRef = useRef<ScriptProcessorNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const timeRemaining = MAX_RECORDING_DURATION - duration;

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }
    };
  }, []);

  // Auto-stop at max duration
  useEffect(() => {
    if (duration >= MAX_RECORDING_DURATION && isRecording) {
      stopRecording();
    }
  }, [duration, isRecording]);

  const startRecording = useCallback(async () => {
    try {
      setError(null);
      chunksRef.current = [];

      // Get media stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: 1280, height: 720 },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 16000,
        },
      });

      streamRef.current = stream;

      // Set recording state FIRST so the video element renders
      setIsRecording(true);

      // Wait for next render cycle so video element is available
      await new Promise(resolve => setTimeout(resolve, 100));

      // Set video preview
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        await videoRef.current.play();
      } else {
        console.error('Video element not available');
      }

      // Set up audio processing for real-time streaming
      if (onAudioData) {
        audioContextRef.current = new AudioContext({ sampleRate: 16000 });
        const source = audioContextRef.current.createMediaStreamSource(stream);

        // Use ScriptProcessorNode for audio chunks (deprecated but widely supported)
        audioProcessorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);

        audioProcessorRef.current.onaudioprocess = (e) => {
          if (!isPaused) {
            const inputData = e.inputBuffer.getChannelData(0);
            const pcmData = new Int16Array(inputData.length);

            // Convert float32 to int16
            for (let i = 0; i < inputData.length; i++) {
              const s = Math.max(-1, Math.min(1, inputData[i]));
              pcmData[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
            }

            const blob = new Blob([pcmData.buffer], { type: 'audio/pcm' });
            onAudioData(blob);
          }
        };

        source.connect(audioProcessorRef.current);
        audioProcessorRef.current.connect(audioContextRef.current.destination);
      }

      // Set up MediaRecorder for final video
      const mimeType = MediaRecorder.isTypeSupported('video/webm;codecs=vp9')
        ? 'video/webm;codecs=vp9'
        : 'video/webm';

      mediaRecorderRef.current = new MediaRecorder(stream, { mimeType });

      mediaRecorderRef.current.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorderRef.current.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setRecordedBlob(blob);
        onRecordingComplete?.(blob);
      };

      mediaRecorderRef.current.start(1000); // Collect data every second

      // Start duration timer
      setDuration(0);
      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);

      setIsPaused(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to start recording';
      setError(message);
      setIsRecording(false);
      // Clean up stream if it was obtained
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
      console.error('Recording error:', err);
    }
  }, [onAudioData, onRecordingComplete, isPaused]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }

    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioProcessorRef.current) {
      audioProcessorRef.current.disconnect();
    }

    if (audioContextRef.current) {
      audioContextRef.current.close();
    }

    setIsRecording(false);
    setIsPaused(false);
  }, []);

  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);

      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, []);

  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);

      timerRef.current = setInterval(() => {
        setDuration((d) => d + 1);
      }, 1000);
    }
  }, []);

  return {
    isRecording,
    isPaused,
    duration,
    timeRemaining,
    videoRef,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    recordedBlob,
    error,
  };
}
