'use client';

import { FC, useRef, useEffect } from 'react';
import { TranscriptSegment } from '@/types';

interface TranscriptDisplayProps {
  segments: TranscriptSegment[];
  isVisible: boolean;
}

export const TranscriptDisplay: FC<TranscriptDisplayProps> = ({ segments, isVisible }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [segments]);

  if (!isVisible) {
    return null;
  }

  return (
    <div className="absolute bottom-24 left-4 w-80 max-h-48 overflow-hidden">
      <div className="bg-black/60 backdrop-blur-md rounded-xl border border-gray-700/50 p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-sm">📝</span>
          <span className="text-xs font-medium text-gray-400 uppercase tracking-wide">
            Live Transcript
          </span>
        </div>
        <div
          ref={containerRef}
          className="max-h-32 overflow-y-auto text-sm text-gray-200 leading-relaxed scrollbar-thin scrollbar-thumb-gray-600"
        >
          {segments.length === 0 ? (
            <p className="text-gray-500 italic">Start speaking...</p>
          ) : (
            segments.map((segment, index) => (
              <span
                key={index}
                className={segment.isFinal ? 'text-white' : 'text-gray-400'}
              >
                {segment.text}{' '}
              </span>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
