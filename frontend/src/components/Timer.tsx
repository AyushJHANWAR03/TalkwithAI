'use client';

import { FC } from 'react';

interface TimerProps {
  duration: number;
  timeRemaining: number;
  isRecording: boolean;
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export const Timer: FC<TimerProps> = ({ duration, timeRemaining, isRecording }) => {
  const isLowTime = timeRemaining <= 60 && isRecording;
  const progress = (duration / (duration + timeRemaining)) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="flex items-center gap-4">
        {isRecording && (
          <div className="flex items-center gap-2">
            <span className="recording-pulse w-3 h-3 bg-red-500 rounded-full" />
            <span className="text-red-400 text-sm font-medium">REC</span>
          </div>
        )}

        <div className="text-center">
          <div className={`text-2xl font-mono font-bold ${isLowTime ? 'text-red-400' : 'text-white'}`}>
            {formatTime(timeRemaining)}
          </div>
          <div className="text-xs text-gray-400">remaining</div>
        </div>
      </div>

      {isRecording && (
        <div className="w-48 h-1 bg-gray-700 rounded-full overflow-hidden">
          <div
            className={`h-full transition-all duration-1000 ${isLowTime ? 'bg-red-500' : 'bg-blue-500'}`}
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};
