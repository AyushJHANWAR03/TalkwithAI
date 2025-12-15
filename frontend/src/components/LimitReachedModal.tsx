'use client';

import { FC } from 'react';

interface LimitReachedModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDownload: () => void;
}

export const LimitReachedModal: FC<LimitReachedModalProps> = ({
  isOpen,
  onClose,
  onDownload,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />

      <div className="relative bg-gray-900 rounded-2xl border border-gray-700 p-8 max-w-md w-full mx-4 shadow-2xl">
        <div className="text-center">
          <div className="text-5xl mb-4">⏱️</div>
          <h2 className="text-2xl font-bold text-white mb-2">Free Limit Reached</h2>
          <p className="text-gray-400 mb-6">
            You've used your 15-minute free session. Download your recording below.
          </p>

          <div className="space-y-3">
            <button
              onClick={onDownload}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-xl text-white font-semibold transition-colors"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Recording
            </button>

            <button
              onClick={onClose}
              className="w-full px-6 py-3 bg-gray-700 hover:bg-gray-600 rounded-xl text-white font-semibold transition-colors"
            >
              Close
            </button>
          </div>

          <p className="text-xs text-gray-500 mt-4">
            Come back tomorrow or sign in for longer sessions (coming soon)
          </p>
        </div>
      </div>
    </div>
  );
};
