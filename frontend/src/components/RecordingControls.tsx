'use client';

import { FC } from 'react';

interface RecordingControlsProps {
  isRecording: boolean;
  isPaused: boolean;
  onStart: () => void;
  onStop: () => void;
  onPause: () => void;
  onResume: () => void;
  disabled?: boolean;
}

export const RecordingControls: FC<RecordingControlsProps> = ({
  isRecording,
  isPaused,
  onStart,
  onStop,
  onPause,
  onResume,
  disabled = false,
}) => {
  return (
    <div className="flex items-center justify-center gap-4">
      {!isRecording ? (
        <button
          onClick={onStart}
          disabled={disabled}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:cursor-not-allowed rounded-full text-white font-semibold transition-colors"
        >
          <span className="w-3 h-3 bg-white rounded-full" />
          Start Recording
        </button>
      ) : (
        <>
          {isPaused ? (
            <button
              onClick={onResume}
              className="flex items-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 rounded-full text-white font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M6.3 2.841A1.5 1.5 0 004 4.11V15.89a1.5 1.5 0 002.3 1.269l9.344-5.89a1.5 1.5 0 000-2.538L6.3 2.84z" />
              </svg>
              Resume
            </button>
          ) : (
            <button
              onClick={onPause}
              className="flex items-center gap-2 px-6 py-3 bg-yellow-600 hover:bg-yellow-700 rounded-full text-white font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path d="M5.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75A.75.75 0 007.25 3h-1.5zM12.75 3a.75.75 0 00-.75.75v12.5c0 .414.336.75.75.75h1.5a.75.75 0 00.75-.75V3.75a.75.75 0 00-.75-.75h-1.5z" />
              </svg>
              Pause
            </button>
          )}

          <button
            onClick={onStop}
            className="flex items-center gap-2 px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-full text-white font-semibold transition-colors"
          >
            <span className="w-4 h-4 bg-white rounded-sm" />
            Stop
          </button>
        </>
      )}
    </div>
  );
};
