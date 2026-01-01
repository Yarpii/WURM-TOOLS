"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { UserTimer, TimerPreset, TimerType } from "@/lib/types";

const TIMER_TYPES: { value: TimerType; label: string; icon: string; color: string }[] = [
  { value: "sleep_bonus", label: "Sleep Bonus", icon: "🌙", color: "#22c55e" },
  { value: "fatigue", label: "Fatigue", icon: "🔋", color: "#3b82f6" },
  { value: "crop", label: "Crop", icon: "🌾", color: "#eab308" },
  { value: "animal", label: "Animal", icon: "🐴", color: "#a855f7" },
  { value: "sermon", label: "Sermon", icon: "📖", color: "#ef4444" },
  { value: "meditation", label: "Meditation", icon: "🧘", color: "#6366f1" },
  { value: "cooldown", label: "Cooldown", icon: "⏱️", color: "#14b8a6" },
  { value: "bulk", label: "Bulk", icon: "📦", color: "#f97316" },
  { value: "custom", label: "Custom", icon: "⚙️", color: "#6b7280" },
];

function formatTimeRemaining(endTime: string): { text: string; percentage: number; isExpired: boolean } {
  const end = new Date(endTime).getTime();
  const now = Date.now();
  const diff = end - now;

  if (diff <= 0) {
    return { text: "Completed!", percentage: 100, isExpired: true };
  }

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  let text = "";
  if (hours > 0) {
    text = `${hours}h ${minutes}m`;
  } else if (minutes > 0) {
    text = `${minutes}m ${seconds}s`;
  } else {
    text = `${seconds}s`;
  }

  return { text, percentage: 0, isExpired: false };
}

function getTimerProgress(startTime: string, endTime: string): number {
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();
  const now = Date.now();

  if (now >= end) return 100;
  if (now <= start) return 0;

  return ((now - start) / (end - start)) * 100;
}

export default function TimersPage() {
  const { user } = useAuth();
  const [timers, setTimers] = useState<UserTimer[]>([]);
  const [presets, setPresets] = useState<TimerPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddForm, setShowAddForm] = useState(false);
  const [, setTick] = useState(0);

  // Add timer form
  const [addForm, setAddForm] = useState({
    name: "",
    description: "",
    timer_type: "custom" as TimerType,
    duration_minutes: 60,
    is_recurring: false,
    color: "#3b82f6",
  });
  const [formError, setFormError] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [timersRes, presetsRes] = await Promise.all([
        user ? fetch("/api/timers") : Promise.resolve({ json: () => [] }),
        fetch("/api/timers?presets=true"),
      ]);

      if (user) {
        const timersData = await (timersRes as Response).json();
        if (Array.isArray(timersData)) setTimers(timersData);
      }

      const presetsData = await presetsRes.json();
      if (Array.isArray(presetsData)) setPresets(presetsData);
    } catch (err) {
      console.error("Failed to fetch timers:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Update timer display every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTick((t) => t + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddTimer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    try {
      const res = await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create",
          ...addForm,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || "Failed to create timer");
        return;
      }

      setShowAddForm(false);
      setAddForm({ name: "", description: "", timer_type: "custom", duration_minutes: 60, is_recurring: false, color: "#3b82f6" });
      fetchData();
    } catch {
      setFormError("Connection error");
    }
  };

  const handleStartFromPreset = async (preset: TimerPreset) => {
    try {
      await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create_from_preset",
          preset_id: preset.id,
        }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to start timer:", err);
    }
  };

  const handleRestartTimer = async (timerId: number) => {
    try {
      await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restart", timer_id: timerId }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to restart timer:", err);
    }
  };

  const handleDeleteTimer = async (timerId: number) => {
    try {
      await fetch("/api/timers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", timer_id: timerId }),
      });
      fetchData();
    } catch (err) {
      console.error("Failed to delete timer:", err);
    }
  };

  const activeTimers = timers.filter((t) => !formatTimeRemaining(t.end_time).isExpired);
  const expiredTimers = timers.filter((t) => formatTimeRemaining(t.end_time).isExpired);

  const groupedPresets = TIMER_TYPES.map((type) => ({
    ...type,
    presets: presets.filter((p) => p.timer_type === type.value),
  })).filter((g) => g.presets.length > 0);

  return (
    <div className="min-h-screen bg-bg-primary py-8">
      <div className="max-w-6xl mx-auto px-4">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold text-text-primary">Timer Dashboard</h1>
            <p className="text-text-muted mt-1">Track your Wurm timers and cooldowns</p>
          </div>

          {user && (
            <button
              onClick={() => setShowAddForm(!showAddForm)}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                showAddForm
                  ? "bg-danger text-white"
                  : "bg-accent text-white hover:bg-accent-hover"
              }`}
            >
              {showAddForm ? "Cancel" : "Create Custom Timer"}
            </button>
          )}
        </div>

        {/* Add Timer Form */}
        {showAddForm && user && (
          <div className="bg-bg-secondary rounded-lg border border-border p-6 mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Create Custom Timer</h2>
            <form onSubmit={handleAddTimer} className="space-y-4">
              {formError && (
                <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Timer Name
                  </label>
                  <input
                    type="text"
                    value={addForm.name}
                    onChange={(e) => setAddForm({ ...addForm, name: e.target.value })}
                    placeholder="e.g., My Wheat Field"
                    required
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Timer Type
                  </label>
                  <select
                    value={addForm.timer_type}
                    onChange={(e) => {
                      const type = TIMER_TYPES.find((t) => t.value === e.target.value);
                      setAddForm({
                        ...addForm,
                        timer_type: e.target.value as TimerType,
                        color: type?.color || "#3b82f6",
                      });
                    }}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  >
                    {TIMER_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>
                        {t.icon} {t.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Duration (minutes)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={addForm.duration_minutes}
                    onChange={(e) => setAddForm({ ...addForm, duration_minutes: parseInt(e.target.value) || 60 })}
                    className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-text-secondary mb-1">
                    Color
                  </label>
                  <input
                    type="color"
                    value={addForm.color}
                    onChange={(e) => setAddForm({ ...addForm, color: e.target.value })}
                    className="w-full h-10 rounded-lg border border-border cursor-pointer"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2 text-text-secondary">
                    <input
                      type="checkbox"
                      checked={addForm.is_recurring}
                      onChange={(e) => setAddForm({ ...addForm, is_recurring: e.target.checked })}
                      className="rounded"
                    />
                    Auto-restart when done
                  </label>
                </div>
              </div>

              <button
                type="submit"
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
              >
                Start Timer
              </button>
            </form>
          </div>
        )}

        {/* Active Timers */}
        {user && activeTimers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Active Timers</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {activeTimers.map((timer) => {
                const { text } = formatTimeRemaining(timer.end_time);
                const progress = getTimerProgress(timer.start_time, timer.end_time);
                const typeInfo = TIMER_TYPES.find((t) => t.value === timer.timer_type);

                return (
                  <div
                    key={timer.id}
                    className="bg-bg-secondary rounded-lg border border-border p-4"
                    style={{ borderLeftColor: timer.color, borderLeftWidth: "4px" }}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{typeInfo?.icon || "⏱️"}</span>
                        <h3 className="font-medium text-text-primary">{timer.name}</h3>
                      </div>
                      <button
                        onClick={() => handleDeleteTimer(timer.id)}
                        className="text-text-muted hover:text-danger transition-colors"
                        title="Delete timer"
                      >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>

                    <div className="text-3xl font-bold text-text-primary mb-2">{text}</div>

                    <div className="w-full bg-bg-tertiary rounded-full h-2 mb-2">
                      <div
                        className="h-2 rounded-full transition-all"
                        style={{ width: `${progress}%`, backgroundColor: timer.color }}
                      />
                    </div>

                    <div className="flex justify-between text-xs text-text-muted">
                      <span>{typeInfo?.label}</span>
                      {timer.is_recurring && <span className="text-accent">Recurring</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Expired Timers */}
        {user && expiredTimers.length > 0 && (
          <div className="mb-8">
            <h2 className="text-xl font-semibold text-text-primary mb-4">Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {expiredTimers.map((timer) => {
                const typeInfo = TIMER_TYPES.find((t) => t.value === timer.timer_type);

                return (
                  <div
                    key={timer.id}
                    className="bg-bg-secondary rounded-lg border border-success/50 p-4"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{typeInfo?.icon || "⏱️"}</span>
                        <h3 className="font-medium text-text-primary">{timer.name}</h3>
                      </div>
                      <span className="px-2 py-0.5 bg-success/20 text-success text-xs rounded-full">
                        Done!
                      </span>
                    </div>

                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => handleRestartTimer(timer.id)}
                        className="flex-1 px-3 py-1.5 bg-accent/20 text-accent rounded-lg hover:bg-accent/30 transition-colors text-sm"
                      >
                        Restart
                      </button>
                      <button
                        onClick={() => handleDeleteTimer(timer.id)}
                        className="px-3 py-1.5 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Quick Start Presets */}
        <div>
          <h2 className="text-xl font-semibold text-text-primary mb-4">Quick Start Presets</h2>
          {loading ? (
            <div className="text-center py-8 text-text-muted">Loading presets...</div>
          ) : (
            <div className="space-y-6">
              {groupedPresets.map((group) => (
                <div key={group.value}>
                  <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
                    <span>{group.icon}</span>
                    {group.label}
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                    {group.presets.map((preset) => (
                      <button
                        key={preset.id}
                        onClick={() => user && handleStartFromPreset(preset)}
                        disabled={!user}
                        className="p-3 bg-bg-secondary rounded-lg border border-border hover:border-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                        style={{ borderLeftColor: preset.color, borderLeftWidth: "3px" }}
                      >
                        <div className="font-medium text-text-primary text-sm">{preset.name}</div>
                        <div className="text-xs text-text-muted mt-1">
                          {preset.duration_minutes >= 60
                            ? `${(preset.duration_minutes / 60).toFixed(1)}h`
                            : `${preset.duration_minutes}m`}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Not logged in message */}
        {!user && (
          <div className="mt-8 bg-bg-secondary rounded-lg border border-border p-6 text-center">
            <p className="text-text-secondary mb-4">
              Log in to create and track your personal timers.
            </p>
            <a
              href="/login"
              className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
            >
              Log In
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
