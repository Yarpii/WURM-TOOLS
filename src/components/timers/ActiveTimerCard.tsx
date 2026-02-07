"use client";

import { useState } from "react";
import { X, RefreshCw, Repeat } from "lucide-react";
import type { UserTimer } from "@/lib/types";
import { getTimerTypeInfo } from "./constants";
import { formatTimeRemaining, getTimerProgress } from "./utils";

interface ActiveTimerCardProps {
  timer: UserTimer;
  onDelete: (id: number) => Promise<void>;
}

export default function ActiveTimerCard({ timer, onDelete }: ActiveTimerCardProps) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { text, isExpired } = formatTimeRemaining(timer.end_time);
  const progress = getTimerProgress(timer.start_time, timer.end_time);
  const typeInfo = getTimerTypeInfo(timer.timer_type);
  const Icon = typeInfo.icon;

  // Should not render if expired -- parent filters, but guard anyway
  if (isExpired) return null;

  const isUrgent = !isExpired && progress > 90;

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await onDelete(timer.id);
    } finally {
      setDeleting(false);
      setConfirming(false);
    }
  };

  return (
    <article
      className={`bg-bg-secondary rounded-lg border border-border p-4 transition-all ${
        isUrgent ? "ring-1 ring-warning/50" : ""
      }`}
      style={{ borderLeftColor: timer.color, borderLeftWidth: "4px" }}
      aria-label={`${timer.name} timer: ${text} remaining`}
    >
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <Icon
            className="w-5 h-5 flex-shrink-0"
            style={{ color: timer.color }}
            aria-hidden="true"
          />
          <h3 className="font-medium text-text-primary truncate">{timer.name}</h3>
        </div>

        {confirming ? (
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-2 py-0.5 text-xs bg-danger text-white rounded hover:bg-danger/80 transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-danger"
              aria-label="Confirm delete"
            >
              {deleting ? "..." : "Yes"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-2 py-0.5 text-xs bg-bg-tertiary text-text-secondary rounded hover:bg-bg-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Cancel delete"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="text-text-muted hover:text-danger transition-colors flex-shrink-0 p-0.5 rounded focus:outline-none focus:ring-2 focus:ring-danger"
            aria-label={`Delete ${timer.name} timer`}
          >
            <X className="w-4 h-4" aria-hidden="true" />
          </button>
        )}
      </div>

      <div
        className={`text-3xl font-bold font-mono mb-2 ${
          isUrgent ? "text-warning" : "text-text-primary"
        }`}
        aria-live="polite"
        aria-atomic="true"
      >
        {text}
      </div>

      <div
        className="w-full bg-bg-tertiary rounded-full h-2 mb-2"
        role="progressbar"
        aria-valuenow={Math.round(progress)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Timer progress: ${Math.round(progress)}%`}
      >
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: timer.color }}
        />
      </div>

      <div className="flex justify-between items-center text-xs text-text-muted">
        <span className="flex items-center gap-1">
          {typeInfo.label}
        </span>
        {timer.is_recurring && (
          <span className="text-accent flex items-center gap-1">
            <Repeat className="w-3 h-3" aria-hidden="true" />
            Recurring
          </span>
        )}
      </div>
    </article>
  );
}
