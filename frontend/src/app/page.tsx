'use client';

import { useState, useCallback, useRef } from 'react';
import { PromptOverlay } from '@/components/PromptOverlay';
import { ListeningIndicator } from '@/components/ListeningIndicator';
import { ExportModal } from '@/components/ExportModal';
import { LimitReachedModal } from '@/components/LimitReachedModal';
import { useMediaRecorder } from '@/hooks/useMediaRecorder';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Prompt, TranscriptSegment } from '@/types';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8000/ws';

export default function Home() {
  const [currentPrompt, setCurrentPrompt] = useState<Prompt | null>(null);
  const [transcript, setTranscript] = useState<TranscriptSegment[]>([]);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showLimitModal, setShowLimitModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendAudioRef = useRef<((data: Blob) => void) | null>(null);

  const handlePrompt = useCallback((prompt: Prompt) => {
    console.log('Received prompt:', prompt);
    setCurrentPrompt(prompt);
    // Auto-hide prompt after 10 seconds
    setTimeout(() => {
      setCurrentPrompt((current) => (current?.id === prompt.id ? null : current));
    }, 10000);
  }, []);

  const handleTranscript = useCallback((segment: TranscriptSegment) => {
    setTranscript((prev) => {
      if (prev.length > 0 && !prev[prev.length - 1].isFinal) {
        return [...prev.slice(0, -1), segment];
      }
      return [...prev, segment];
    });
  }, []);

  const {
    isConnected,
    connect,
    disconnect,
    sendAudio,
  } = useWebSocket({
    url: WS_URL,
    onPrompt: handlePrompt,
    onTranscript: handleTranscript,
    onError: (err) => setError(err),
  });

  sendAudioRef.current = sendAudio;

  const handleRecordingComplete = useCallback((blob: Blob) => {
    disconnect();
    setShowExportModal(true);
  }, [disconnect]);

  const handleAudioData = useCallback((data: Blob) => {
    if (sendAudioRef.current) {
      sendAudioRef.current(data);
    }
  }, []);

  const {
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
    error: recorderError,
  } = useMediaRecorder({
    onAudioData: handleAudioData,
    onRecordingComplete: handleRecordingComplete,
  });

  const handleStart = async () => {
    setError(null);
    setTranscript([]);
    setCurrentPrompt(null);

    try {
      console.log('Connecting to WebSocket...');
      await connect();
      console.log('WebSocket connected, starting recording...');
      await startRecording();
      console.log('Recording started');
    } catch (err) {
      console.error('Failed to start:', err);
      setError('Failed to connect to server');
    }
  };

  const handleStop = () => {
    stopRecording();
  };

  const isLimitReached = timeRemaining <= 0;

  // Landing Page (not recording)
  if (!isRecording) {
    return (
      <main className="min-h-screen flex flex-col">
        {/* Hero Section */}
        <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
          {/* Logo & Title */}
          <div className="text-center mb-12">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mb-6 shadow-lg shadow-purple-500/25">
              <span className="text-4xl">🎬</span>
            </div>
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">
              PromptCast
            </h1>
            <p className="text-xl text-gray-400 max-w-md mx-auto">
              Your AI-powered video recording assistant
            </p>
          </div>

          {/* Error Display */}
          {(error || recorderError) && (
            <div className="mb-6 p-4 bg-red-900/50 border border-red-700 rounded-xl text-red-200 max-w-md">
              {error || recorderError}
            </div>
          )}

          {/* Start Button */}
          <button
            onClick={handleStart}
            className="group relative px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 rounded-full text-white font-semibold text-lg shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40 hover:scale-105 transition-all duration-200"
          >
            <span className="flex items-center gap-3">
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                <circle cx="10" cy="10" r="8" className="text-red-500" />
              </svg>
              Start Recording
            </span>
          </button>

          {/* Features */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl">
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-purple-500/20 rounded-xl mb-4">
                <span className="text-2xl">🎙️</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Real-time Transcription</h3>
              <p className="text-gray-500 text-sm">Your speech is transcribed instantly as you speak</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-pink-500/20 rounded-xl mb-4">
                <span className="text-2xl">🤖</span>
              </div>
              <h3 className="text-white font-semibold mb-2">AI Friend</h3>
              <p className="text-gray-500 text-sm">Get intelligent questions to keep you on track</p>
            </div>
            <div className="text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-500/20 rounded-xl mb-4">
                <span className="text-2xl">📹</span>
              </div>
              <h3 className="text-white font-semibold mb-2">Easy Export</h3>
              <p className="text-gray-500 text-sm">Download your video when you're done</p>
            </div>
          </div>

          {/* Session Info */}
          <p className="mt-12 text-gray-600 text-sm">
            Free sessions limited to 15 minutes
          </p>
        </div>

        {/* Modals */}
        <ExportModal
          isOpen={showExportModal}
          onClose={() => setShowExportModal(false)}
          videoBlob={recordedBlob}
          transcript={transcript}
        />
      </main>
    );
  }

  // Recording View
  return (
    <main className="h-screen flex flex-col bg-black overflow-hidden">
      {/* Video Area - Full Screen */}
      <div className="flex-1 relative w-full h-full">
        {/* Video element - absolute positioned to fill */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 w-full h-full object-cover"
          style={{ transform: 'scaleX(-1)' }}
        />

        {/* LIVE indicator - top left */}
        <div className="absolute top-4 left-4 z-20">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="recording-pulse w-2 h-2 bg-white rounded-full" />
            <span className="text-white text-sm font-medium">LIVE</span>
          </div>
        </div>

        {/* Timer - top right, compact */}
        <div className="absolute top-4 right-4 z-20">
          <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className={`font-mono font-bold ${timeRemaining <= 60 ? 'text-red-400' : 'text-white'}`}>
              {Math.floor(timeRemaining / 60).toString().padStart(2, '0')}:{(timeRemaining % 60).toString().padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* AI Friend Prompt Overlay */}
        <PromptOverlay prompt={currentPrompt} isVisible={isRecording} />

        {/* Listening Indicator */}
        <ListeningIndicator isVisible={isRecording && !currentPrompt} />
      </div>

      {/* Controls */}
      <div className="p-6 flex justify-center gap-4">
        {/* Pause/Resume Button */}
        <button
          onClick={isPaused ? resumeRecording : pauseRecording}
          className="w-14 h-14 rounded-full bg-gray-800 hover:bg-gray-700 flex items-center justify-center transition-colors"
        >
          {isPaused ? (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M6.3 2.84A1.5 1.5 0 004 4.11v11.78a1.5 1.5 0 002.3 1.27l9.344-5.891a1.5 1.5 0 000-2.538L6.3 2.84z" />
            </svg>
          ) : (
            <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.5 4a1.5 1.5 0 00-1.5 1.5v9A1.5 1.5 0 005.5 16h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 006.5 4h-1zm8 0a1.5 1.5 0 00-1.5 1.5v9a1.5 1.5 0 001.5 1.5h1a1.5 1.5 0 001.5-1.5v-9A1.5 1.5 0 0014.5 4h-1z" clipRule="evenodd" />
            </svg>
          )}
        </button>

        {/* Stop Button */}
        <button
          onClick={handleStop}
          className="w-16 h-16 rounded-full bg-red-600 hover:bg-red-500 flex items-center justify-center transition-colors shadow-lg shadow-red-600/30"
        >
          <div className="w-6 h-6 bg-white rounded-sm" />
        </button>
      </div>

      {/* Modals */}
      <ExportModal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        videoBlob={recordedBlob}
        transcript={transcript}
      />

      <LimitReachedModal
        isOpen={showLimitModal || isLimitReached}
        onClose={() => {
          setShowLimitModal(false);
          if (isRecording) stopRecording();
        }}
        onDownload={() => {
          setShowExportModal(true);
          setShowLimitModal(false);
        }}
      />
    </main>
  );
}
