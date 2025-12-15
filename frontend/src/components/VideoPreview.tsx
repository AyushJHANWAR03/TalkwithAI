'use client';

import { FC, RefObject } from 'react';

interface VideoPreviewProps {
  videoRef: RefObject<HTMLVideoElement | null>;
  isRecording: boolean;
}

export const VideoPreview: FC<VideoPreviewProps> = ({ videoRef, isRecording }) => {
  return (
    <div className="absolute inset-0 bg-gray-900">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="w-full h-full object-cover"
        style={{ transform: 'scaleX(-1)' }}
      />

      {/* LIVE indicator */}
      {isRecording && (
        <div className="absolute top-4 left-4">
          <div className="flex items-center gap-2 bg-red-600/90 backdrop-blur-sm px-3 py-1.5 rounded-full">
            <span className="recording-pulse w-2 h-2 bg-white rounded-full" />
            <span className="text-white text-sm font-medium">LIVE</span>
          </div>
        </div>
      )}
    </div>
  );
};
