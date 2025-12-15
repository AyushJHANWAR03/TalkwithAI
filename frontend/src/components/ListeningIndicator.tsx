'use client';

import { FC } from 'react';

interface ListeningIndicatorProps {
  isVisible: boolean;
}

export const ListeningIndicator: FC<ListeningIndicatorProps> = ({ isVisible }) => {
  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10">
      <div className="flex items-center gap-2 bg-black/50 backdrop-blur-sm px-4 py-2 rounded-full">
        {/* Pulsing dots */}
        <div className="flex gap-1">
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '0ms' }} />
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '150ms' }} />
          <span className="w-2 h-2 bg-green-400 rounded-full animate-pulse-dot" style={{ animationDelay: '300ms' }} />
        </div>
        <span className="text-white/80 text-sm font-medium">AI is listening...</span>
      </div>
    </div>
  );
};
