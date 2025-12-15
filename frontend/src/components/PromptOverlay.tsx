'use client';

import { FC, useState, useEffect } from 'react';
import { Prompt } from '@/types';

interface PromptOverlayProps {
  prompt: Prompt | null;
  isVisible: boolean;
}

export const PromptOverlay: FC<PromptOverlayProps> = ({ prompt, isVisible }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  useEffect(() => {
    if (!prompt?.text) {
      setDisplayedText('');
      setIsTyping(false);
      return;
    }

    // Skip typewriter for welcome message - show instantly
    if (prompt.type === 'welcome') {
      setDisplayedText(prompt.text);
      setIsTyping(false);
      return;
    }

    // Reset and start typing for AI responses
    setDisplayedText('');
    setIsTyping(true);
    let index = 0;

    const interval = setInterval(() => {
      if (index < prompt.text.length) {
        setDisplayedText(prompt.text.slice(0, index + 1));
        index++;
      } else {
        setIsTyping(false);
        clearInterval(interval);
      }
    }, 30); // 30ms per character

    return () => clearInterval(interval);
  }, [prompt?.text, prompt?.type]);

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
          "{displayedText}
          {isTyping && <span className="animate-pulse">|</span>}"
        </p>
      </div>
    </div>
  );
};
