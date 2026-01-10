"use client";

import Link from "next/link";

export default function TreasuresError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-danger/20 flex items-center justify-center">
          <svg className="w-8 h-8 text-danger" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Treasure Hunts Error</h2>
        <p className="text-text-secondary mb-4">Failed to load treasure hunts. Please try again.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={reset} className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover">
            Retry
          </button>
          <Link href="/dashboard" className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
