"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import type { TimerPreset } from "@/lib/types";
import type { TimerTypeInfo } from "./constants";
import { formatDuration } from "./utils";

interface PresetGroupProps {
  group: TimerTypeInfo & { presets: TimerPreset[] };
  disabled: boolean;
  onStart: (preset: TimerPreset) => Promise<void>;
}

export default function PresetGroup({ group, disabled, onStart }: PresetGroupProps) {
  const [startingId, setStartingId] = useState<number | null>(null);
  const Icon = group.icon;

  const handleStart = async (preset: TimerPreset) => {
    if (disabled) return;
    setStartingId(preset.id);
    try {
      await onStart(preset);
    } finally {
      setStartingId(null);
    }
  };

  return (
    <div role="region" aria-label={`${group.label} presets`}>
      <h3 className="text-sm font-medium text-text-secondary mb-3 flex items-center gap-2">
        <Icon className="w-4 h-4" style={{ color: group.color }} aria-hidden="true" />
        {group.label}
      </h3>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3" role="list">
        {group.presets.map((preset) => {
          const isStarting = startingId === preset.id;
          return (
            <button
              key={preset.id}
              onClick={() => handleStart(preset)}
              disabled={disabled || isStarting}
              className="p-3 bg-bg-secondary rounded-lg border border-border hover:border-accent transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
              style={{ borderLeftColor: preset.color, borderLeftWidth: "3px" }}
              role="listitem"
              aria-label={`Start ${preset.name} timer (${formatDuration(preset.duration_minutes)})`}
            >
              <div className="flex items-start justify-between">
                <div className="min-w-0">
                  <div className="font-medium text-text-primary text-sm truncate">{preset.name}</div>
                  <div className="text-xs text-text-muted mt-1">{formatDuration(preset.duration_minutes)}</div>
                </div>
                <Play
                  className={`w-4 h-4 text-text-muted group-hover:text-accent transition-colors flex-shrink-0 ml-2 ${
                    isStarting ? "animate-pulse" : ""
                  }`}
                  aria-hidden="true"
                />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
