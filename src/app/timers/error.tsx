"use client";

import Link from "next/link";
import { AlertCircle } from "lucide-react";

export default function TimersError({
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
          <AlertCircle className="w-8 h-8 text-danger" />
        </div>
        <h2 className="text-xl font-semibold text-text-primary mb-2">Timer Error</h2>
        <p className="text-text-secondary mb-4">
          Failed to load timer data. This might be a temporary issue.
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={reset}
            className="px-4 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Retry
          </button>
          <Link
            href="/"
            className="px-4 py-2 bg-bg-secondary text-text-primary rounded-lg hover:bg-bg-tertiary focus:outline-none focus:ring-2 focus:ring-accent"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}
