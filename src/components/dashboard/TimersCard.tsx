"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Timer, Moon, Zap, Church, Brain, Clock, Plus } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardStats } from "./types";
import { formatTimerRemaining } from "./utils";
import { Skeleton } from "@/components/Skeleton";

const TIMER_TYPE_ICONS: Record<string, LucideIcon> = {
  sleep_bonus: Moon,
  fatigue: Zap,
  sermon: Church,
  meditation: Brain,
  custom: Clock,
};

interface TimersCardProps {
  timers: DashboardStats["timers"] | null;
  loading?: boolean;
}

export function TimersCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded" />
          <Skeleton className="h-5 w-16" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="text-center mb-4">
        <Skeleton className="h-8 w-8 mx-auto mb-1" />
        <Skeleton className="h-3 w-20 mx-auto" />
      </div>
      <div className="space-y-3">
        <Skeleton className="h-14 w-full rounded-lg" />
        <Skeleton className="h-14 w-full rounded-lg" />
      </div>
    </div>
  );
}

export default function TimersCard({ timers, loading }: TimersCardProps) {
  const [, setTick] = useState(0);

  // Live countdown: re-render every second when there are active timers
  useEffect(() => {
    if (!timers || timers.active === 0) return;

    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);

    return () => clearInterval(interval);
  }, [timers]);

  if (loading || !timers) return <TimersCardSkeleton />;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Active timers">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Timer className="w-6 h-6 text-accent" aria-hidden="true" />
          <h3 className="font-semibold text-text-primary">Timers</h3>
        </div>
        <Link href="/timers" className="text-accent text-sm hover:underline">View all</Link>
      </div>
      {timers.active > 0 ? (
        <div className="space-y-3">
          <div className="text-center mb-4">
            <div className="text-2xl font-bold text-warning">{timers.active}</div>
            <div className="text-xs text-text-muted">Active Timers</div>
          </div>
          <div role="list" aria-label="Running timers">
            {timers.recent.slice(0, 2).map((timer) => {
              const TimerIcon = TIMER_TYPE_ICONS[timer.timer_type] || Clock;
              const remaining = formatTimerRemaining(timer.end_time);
              const isExpired = remaining === "Expired";

              return (
                <div
                  key={timer.id}
                  className="p-3 bg-bg-tertiary rounded-lg flex items-center gap-3 mb-2 last:mb-0"
                  role="listitem"
                  aria-label={`${timer.name}: ${remaining}`}
                >
                  <TimerIcon className={`w-5 h-5 ${isExpired ? "text-text-muted" : "text-accent"}`} aria-hidden="true" />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{timer.name}</div>
                    <div className={`text-xs font-mono ${isExpired ? "text-danger" : "text-warning"}`}>
                      {remaining}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="text-center py-6">
          <Timer className="w-10 h-10 text-text-muted/30 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No active timers</p>
          <Link
            href="/timers"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Create a timer
          </Link>
        </div>
      )}
    </section>
  );
}
