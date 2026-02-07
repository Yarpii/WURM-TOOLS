"use client";

import { useState } from "react";
import { RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import type { UserTimer } from "@/lib/types";
import { getTimerTypeInfo } from "./constants";

interface CompletedTimerCardProps {
  timer: UserTimer;
  onRestart: (id: number) => Promise<void>;
  onDelete: (id: number) => Promise<void>;
}

export default function CompletedTimerCard({ timer, onRestart, onDelete }: CompletedTimerCardProps) {
  const [restarting, setRestarting] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const typeInfo = getTimerTypeInfo(timer.timer_type);
  const Icon = typeInfo.icon;

  const handleRestart = async () => {
    setRestarting(true);
    try {
      await onRestart(timer.id);
    } finally {
      setRestarting(false);
    }
  };

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
      className="bg-bg-secondary rounded-lg border border-success/50 p-4"
      aria-label={`${timer.name} timer completed`}
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
        <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full flex items-center gap-1 flex-shrink-0">
          <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
          Done
        </span>
      </div>

      <div className="flex gap-2 mt-3">
        <button
          onClick={handleRestart}
          disabled={restarting}
          className="flex-1 px-3 py-1.5 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors text-sm inline-flex items-center justify-center gap-1.5 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent"
          aria-label={`Restart ${timer.name} timer`}
        >
          <RefreshCw className={`w-3.5 h-3.5 ${restarting ? "animate-spin" : ""}`} aria-hidden="true" />
          {restarting ? "Restarting..." : "Restart"}
        </button>

        {confirming ? (
          <div className="flex items-center gap-1">
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1.5 bg-danger text-white rounded-lg hover:bg-danger/80 transition-colors text-sm disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-danger"
              aria-label="Confirm delete"
            >
              {deleting ? "..." : "Yes"}
            </button>
            <button
              onClick={() => setConfirming(false)}
              className="px-3 py-1.5 bg-bg-tertiary text-text-secondary rounded-lg hover:bg-bg-hover transition-colors text-sm focus:outline-none focus:ring-2 focus:ring-accent"
              aria-label="Cancel delete"
            >
              No
            </button>
          </div>
        ) : (
          <button
            onClick={() => setConfirming(true)}
            className="px-3 py-1.5 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors text-sm inline-flex items-center gap-1.5 focus:outline-none focus:ring-2 focus:ring-danger"
            aria-label={`Delete ${timer.name} timer`}
          >
            <Trash2 className="w-3.5 h-3.5" aria-hidden="true" />
            Delete
          </button>
        )}
      </div>
    </article>
  );
}
