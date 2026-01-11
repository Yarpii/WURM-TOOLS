'use client';

import { useState } from 'react';

export default function BetaBanner() {
  const [isVisible, setIsVisible] = useState(() => {
    // Check if user has dismissed the banner (stored in localStorage)
    if (typeof window !== 'undefined') {
      return localStorage.getItem('betaBannerDismissed') !== 'true';
    }
    return true;
  });

  const handleDismiss = () => {
    setIsVisible(false);
    if (typeof window !== 'undefined') {
      localStorage.setItem('betaBannerDismissed', 'true');
    }
  };

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-amber-500/90 to-orange-500/90 dark:from-amber-600/90 dark:to-orange-600/90 text-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 gap-4">
          <div className="flex items-center gap-3 flex-1">
            {/* Beta Badge */}
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-white/20 backdrop-blur-sm border border-white/30">
              BETA
            </span>

            {/* Message */}
            <p className="text-sm sm:text-base font-medium">
              🚧 <span className="font-semibold">Dit is een beta versie!</span> Je kunt bugs en onverwacht gedrag verwachten.
              <span className="hidden sm:inline"> Help ons verbeteren door problemen te melden!</span>
            </p>
          </div>

          {/* Dismiss Button */}
          <button
            onClick={handleDismiss}
            className="flex-shrink-0 p-1 rounded-md hover:bg-white/20 transition-colors"
            aria-label="Sluit beta banner"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
