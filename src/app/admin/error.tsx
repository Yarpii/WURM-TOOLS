"use client";

import Link from "next/link";

export default function AdminError({
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
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Admin Panel Error</h2>
        <p className="text-text-secondary mb-4">Failed to load admin panel. Please check your permissions.</p>
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
