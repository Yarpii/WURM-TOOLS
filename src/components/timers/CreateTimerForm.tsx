"use client";

import { useState } from "react";
import { Plus, AlertCircle } from "lucide-react";
import type { TimerType } from "@/lib/types";
import { TIMER_TYPES } from "./constants";

interface CreateTimerFormProps {
  onSubmit: (data: {
    name: string;
    description: string;
    timer_type: TimerType;
    duration_minutes: number;
    is_recurring: boolean;
    color: string;
  }) => Promise<void>;
  onCancel: () => void;
}

export default function CreateTimerForm({ onSubmit, onCancel }: CreateTimerFormProps) {
  const [form, setForm] = useState({
    name: "",
    description: "",
    timer_type: "custom" as TimerType,
    hours: 1,
    minutes: 0,
    is_recurring: false,
    color: "#3b82f6",
  });
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");

    const totalMinutes = form.hours * 60 + form.minutes;
    if (totalMinutes <= 0) {
      setFormError("Duration must be at least 1 minute");
      return;
    }

    setSubmitting(true);
    try {
      await onSubmit({
        name: form.name,
        description: form.description,
        timer_type: form.timer_type,
        duration_minutes: totalMinutes,
        is_recurring: form.is_recurring,
        color: form.color,
      });
    } catch {
      setFormError("Failed to create timer. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section
      className="bg-bg-secondary rounded-lg border border-border p-6 mb-8"
      aria-label="Create custom timer"
    >
      <h2 className="text-xl font-semibold text-text-primary mb-4">Create Custom Timer</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {formError && (
          <div className="p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm flex items-center gap-2" role="alert">
            <AlertCircle className="w-4 h-4 flex-shrink-0" aria-hidden="true" />
            {formError}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="timer-name" className="block text-sm font-medium text-text-secondary mb-1">
              Timer Name
            </label>
            <input
              id="timer-name"
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="e.g., My Wheat Field"
              required
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="timer-type" className="block text-sm font-medium text-text-secondary mb-1">
              Timer Type
            </label>
            <select
              id="timer-type"
              value={form.timer_type}
              onChange={(e) => {
                const type = TIMER_TYPES.find((t) => t.value === e.target.value);
                setForm({
                  ...form,
                  timer_type: e.target.value as TimerType,
                  color: type?.color || "#3b82f6",
                });
              }}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            >
              {TIMER_TYPES.map((t) => {
                return (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                );
              })}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label htmlFor="timer-hours" className="block text-sm font-medium text-text-secondary mb-1">
              Hours
            </label>
            <input
              id="timer-hours"
              type="number"
              min="0"
              max="999"
              value={form.hours}
              onChange={(e) => setForm({ ...form, hours: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="timer-minutes" className="block text-sm font-medium text-text-secondary mb-1">
              Minutes
            </label>
            <input
              id="timer-minutes"
              type="number"
              min="0"
              max="59"
              value={form.minutes}
              onChange={(e) => setForm({ ...form, minutes: parseInt(e.target.value) || 0 })}
              className="w-full px-3 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent"
            />
          </div>

          <div>
            <label htmlFor="timer-color" className="block text-sm font-medium text-text-secondary mb-1">
              Color
            </label>
            <div className="flex items-center gap-2">
              <input
                id="timer-color"
                type="color"
                value={form.color}
                onChange={(e) => setForm({ ...form, color: e.target.value })}
                className="w-10 h-10 rounded-lg border border-border cursor-pointer p-0.5"
                aria-label="Choose timer color"
              />
              <span className="text-xs text-text-muted font-mono">{form.color}</span>
            </div>
          </div>

          <div className="flex items-end">
            <label className="flex items-center gap-2 text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={form.is_recurring}
                onChange={(e) => setForm({ ...form, is_recurring: e.target.checked })}
                className="rounded border-border"
              />
              <span className="text-sm">Auto-restart when done</span>
            </label>
          </div>
        </div>

        {form.hours * 60 + form.minutes > 0 && (
          <p className="text-xs text-text-muted">
            Total duration: {form.hours * 60 + form.minutes} minutes
            {form.hours * 60 + form.minutes >= 60 && ` (${((form.hours * 60 + form.minutes) / 60).toFixed(1)} hours)`}
          </p>
        )}

        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={submitting}
            className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors inline-flex items-center gap-2 disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
          >
            <Plus className="w-4 h-4" aria-hidden="true" />
            {submitting ? "Creating..." : "Start Timer"}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded-lg"
          >
            Cancel
          </button>
        </div>
      </form>
    </section>
  );
}
