"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { Plus, Timer, RefreshCw, CheckCircle2, Clock, Zap } from "lucide-react";
import type { UserTimer, TimerPreset, TimerType } from "@/lib/types";
import { Skeleton } from "@/components/Skeleton";
import {
  ActiveTimerCard,
  CompletedTimerCard,
  CreateTimerForm,
  PresetGroup,
  TIMER_TYPES,
  formatTimeRemaining,
} from "@/components/timers";

export default function TimersPage() {
  const { user, loading: authLoading } = useAuth();
  const [timers, setTimers] = useState<UserTimer[]>([]);
  const [presets, setPresets] = useState<TimerPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [actionError, setActionError] = useState("");
  const [, setTick] = useState(0);

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const [timersRes, presetsRes] = await Promise.all([
        user ? fetch("/api/timers") : Promise.resolve(null),
        fetch("/api/timers?presets=true"),
      ]);

      if (user && timersRes) {
        const timersData = await timersRes.json();
        if (Array.isArray(timersData)) setTimers(timersData);
      }

      const presetsData = await presetsRes.json();
      if (Array.isArray(presetsData)) setPresets(presetsData);
    } catch (err) {
      console.error("Failed to fetch timers:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update timer display every second
  useEffect(() => {
    if (timers.length === 0) return;
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [timers.length]);

  // Clear action errors after 5 seconds
  useEffect(() => {
    if (!actionError) return;
    const timeout = setTimeout(() => setActionError(""), 5000);
    return () => clearTimeout(timeout);
  }, [actionError]);

  const handleAddTimer = async (data: {
    name: string;
    description: string;
    timer_type: TimerType;
    duration_minutes: number;
    is_recurring: boolean;
    color: string;
  }) => {
    const res = await fetch("/api/timers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "create", ...data }),
    });

    const result = await res.json();
    if (!res.ok) {
      throw new Error(result.error || "Failed to create timer");
    }

    setShowAddForm(false);
    fetchData();
  };

  const handleStartFromPreset = async (preset: TimerPreset) => {
    try {
      const res = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create_from_preset", preset_id: preset.id }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || "Failed to start timer from preset");
        return;
      }
      fetchData();
    } catch {
      setActionError("Connection error - could not start timer");
    }
  };

  const handleRestartTimer = async (timerId: number) => {
    try {
      const res = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", timer_id: timerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || "Failed to restart timer");
        return;
      }
      fetchData();
    } catch {
      setActionError("Connection error - could not restart timer");
    }
  };

  const handleDeleteTimer = async (timerId: number) => {
    try {
      const res = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", timer_id: timerId }),
      });
      if (!res.ok) {
        const data = await res.json();
        setActionError(data.error || "Failed to delete timer");
        return;
      }
      fetchData();
    } catch {
      setActionError("Connection error - could not delete timer");
    }
  };

  const activeTimers = timers.filter((t) => !formatTimeRemaining(t.end_time).isExpired);
  const expiredTimers = timers.filter((t) => formatTimeRemaining(t.end_time).isExpired);

  const groupedPresets = TIMER_TYPES.map((type) => ({
    ...type,
    presets: presets.filter((p) => p.timer_type === type.value),
  })).filter((g) => g.presets.length > 0);

  return (
    <main className="min-h-screen bg-bg-primary py-8" aria-label="Timer Dashboard">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary flex items-center gap-3">
              <Timer className="w-8 h-8 text-accent" aria-hidden="true" />
              Timer Dashboard
            </h1>
            <p className="text-text-muted mt-1">Track your Wurm timers and cooldowns</p>
          </div>

          <div className="flex items-center gap-3">
            {user && (
              <>
                <button
                  onClick={() => fetchData(true)}
                  disabled={refreshing || loading}
                  className="px-3 py-2 text-text-secondary hover:text-accent transition-colors rounded-lg border border-border hover:border-accent/50 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent inline-flex items-center gap-1.5 text-sm"
                  aria-label="Refresh timers"
                >
                  <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
                  Refresh
                </button>
                <button
                  onClick={() => setShowAddForm(!showAddForm)}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors inline-flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent ${
                    showAddForm
                      ? "bg-danger text-white hover:bg-danger/80"
                      : "bg-accent text-white hover:bg-accent-hover"
                  }`}
                >
                  {showAddForm ? (
                    "Cancel"
                  ) : (
                    <>
                      <Plus className="w-4 h-4" aria-hidden="true" />
                      Create Timer
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        </div>

        {/* Action Error Toast */}
        {actionError && (
          <div
            className="mb-6 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm flex items-center justify-between"
            role="alert"
          >
            <span>{actionError}</span>
            <button
              onClick={() => setActionError("")}
              className="text-danger/70 hover:text-danger ml-3 focus:outline-none"
              aria-label="Dismiss error"
            >
              &times;
            </button>
          </div>
        )}

        {/* Summary Stats (when logged in with timers) */}
        {user && !loading && timers.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8" role="region" aria-label="Timer statistics">
            <div className="bg-bg-secondary rounded-lg border border-border p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
                <Clock className="w-4 h-4 text-accent" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">{timers.length}</div>
                <div className="text-xs text-text-muted">Total</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-border p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-warning/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-warning" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg font-bold text-warning">{activeTimers.length}</div>
                <div className="text-xs text-text-muted">Active</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-border p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-success/20 flex items-center justify-center">
                <CheckCircle2 className="w-4 h-4 text-success" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg font-bold text-success">{expiredTimers.length}</div>
                <div className="text-xs text-text-muted">Completed</div>
              </div>
            </div>
            <div className="bg-bg-secondary rounded-lg border border-border p-3 flex items-center gap-3">
              <div className="w-9 h-9 rounded-lg bg-accent/20 flex items-center justify-center">
                <Timer className="w-4 h-4 text-accent" aria-hidden="true" />
              </div>
              <div>
                <div className="text-lg font-bold text-text-primary">{presets.length}</div>
                <div className="text-xs text-text-muted">Presets</div>
              </div>
            </div>
          </div>
        )}

        {/* Add Timer Form */}
        {showAddForm && user && (
          <CreateTimerForm
            onSubmit={handleAddTimer}
            onCancel={() => setShowAddForm(false)}
          />
        )}

        {/* Active Timers */}
        {user && (
          <section className="mb-8" aria-label="Active timers">
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <Zap className="w-5 h-5 text-warning" aria-hidden="true" />
              Active Timers
              {activeTimers.length > 0 && (
                <span className="text-sm font-normal text-text-muted">({activeTimers.length})</span>
              )}
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="bg-bg-secondary rounded-lg border border-border p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Skeleton className="w-5 h-5 rounded" />
                      <Skeleton className="h-5 w-32" />
                    </div>
                    <Skeleton className="h-9 w-24 mb-3" />
                    <Skeleton className="h-2 w-full rounded-full mb-2" />
                    <Skeleton className="h-3 w-20" />
                  </div>
                ))}
              </div>
            ) : activeTimers.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {activeTimers.map((timer) => (
                  <ActiveTimerCard
                    key={timer.id}
                    timer={timer}
                    onDelete={handleDeleteTimer}
                  />
                ))}
              </div>
            ) : (
              <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
                <Timer className="w-12 h-12 text-text-muted/30 mx-auto mb-3" aria-hidden="true" />
                <p className="text-text-muted mb-1">No active timers</p>
                <p className="text-sm text-text-muted mb-4">
                  Create a custom timer or start one from a preset below.
                </p>
                <button
                  onClick={() => setShowAddForm(true)}
                  className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline focus:outline-none"
                >
                  <Plus className="w-4 h-4" aria-hidden="true" />
                  Create a timer
                </button>
              </div>
            )}
          </section>
        )}

        {/* Completed Timers */}
        {user && expiredTimers.length > 0 && (
          <section className="mb-8" aria-label="Completed timers">
            <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-success" aria-hidden="true" />
              Completed
              <span className="text-sm font-normal text-text-muted">({expiredTimers.length})</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiredTimers.map((timer) => (
                <CompletedTimerCard
                  key={timer.id}
                  timer={timer}
                  onRestart={handleRestartTimer}
                  onDelete={handleDeleteTimer}
                />
              ))}
            </div>
          </section>
        )}

        {/* Quick Start Presets */}
        <section aria-label="Timer presets">
          <h2 className="text-xl font-semibold text-text-primary mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-accent" aria-hidden="true" />
            Quick Start Presets
          </h2>

          {loading ? (
            <div className="space-y-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i}>
                  <Skeleton className="h-4 w-24 mb-3" />
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, j) => (
                      <Skeleton key={j} className="h-16 w-full rounded-lg" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : groupedPresets.length > 0 ? (
            <div className="space-y-6">
              {groupedPresets.map((group) => (
                <PresetGroup
                  key={group.value}
                  group={group}
                  disabled={!user}
                  onStart={handleStartFromPreset}
                />
              ))}
            </div>
          ) : (
            <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
              <Clock className="w-12 h-12 text-text-muted/30 mx-auto mb-3" aria-hidden="true" />
              <p className="text-text-muted">No presets available</p>
            </div>
          )}
        </section>

        {/* Not logged in message */}
        {!authLoading && !user && (
          <div className="mt-8 bg-bg-secondary rounded-lg border border-border p-6 text-center" role="alert">
            <Timer className="w-10 h-10 text-text-muted/30 mx-auto mb-3" aria-hidden="true" />
            <p className="text-text-secondary mb-4">
              Log in to create and track your personal timers.
            </p>
            <Link
              href="/login"
              className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
            >
              Log In
            </Link>
          </div>
        )}
      </div>
    </main>
  );
}
