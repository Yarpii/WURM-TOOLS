'use client';

import { useState, useEffect } from 'react';

export default function BetaBanner() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Only check localStorage on client after hydration
    const dismissed = localStorage.getItem('betaBannerDismissed') === 'true';
    setIsVisible(!dismissed);
  }, []);

  const handleDismiss = () => {
    setIsVisible(false);
    localStorage.setItem('betaBannerDismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 dark:from-amber-600/90 dark:to-orange-600/90 text-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-1.5 gap-3">
          <div className="flex items-center gap-2 flex-1">
            {/* Beta Badge */}
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30">
              BETA
            </span>

            {/* Message */}
            <p className="text-xs sm:text-sm font-medium">
              <span className="font-semibold">Beta version</span> — expect bugs and unexpected behavior.
              <span className="hidden sm:inline"> Help us improve by reporting issues!</span>
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
            aria-label="Close beta banner"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
