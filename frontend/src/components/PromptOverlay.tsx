'use client';

import { FC } from 'react';
import { Prompt } from '@/types';

interface PromptOverlayProps {
  prompt: Prompt | null;
  isVisible: boolean;
}

export const PromptOverlay: FC<PromptOverlayProps> = ({ prompt, isVisible }) => {
  if (!prompt || !isVisible) {
    return null;
  }

  return (
    <div className="absolute inset-x-0 top-8 flex flex-col items-center z-20 animate-fade-in">
      {/* AI Friend Badge */}
      <div className="bg-purple-600/90 backdrop-blur-sm px-4 py-1.5 rounded-full mb-3 shadow-lg">
        <span className="text-white text-sm font-semibold tracking-wide flex items-center gap-2">
          <span>🤖</span>
          <span>AI FRIEND</span>
        </span>
      </div>

      {/* Question Card */}
      <div className="bg-black/60 backdrop-blur-md px-6 py-4 rounded-2xl max-w-md mx-4 shadow-2xl border border-white/10">
        <p className="text-white text-xl font-medium text-center leading-relaxed">
          "{prompt.text}"
        </p>
      </div>
    </div>
  );
};
