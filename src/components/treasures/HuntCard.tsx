"use client";

import type { TreasureHunt } from "@/lib/types";
import { STATUS_LABELS, DIFFICULTY_LABELS } from "./constants";

interface HuntCardProps {
  hunt: TreasureHunt;
  isSelected: boolean;
  onClick: () => void;
}

export function HuntCard({ hunt, isSelected, onClick }: HuntCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 bg-bg-secondary rounded-lg cursor-pointer border-2 transition-colors ${
        isSelected ? "border-accent" : "border-transparent hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          {hunt.parent_hunt_id && (
            <span className="text-warning" title="Chained map">↳</span>
          )}
          <h3 className="font-semibold truncate">{hunt.name}</h3>
        </div>
        <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${STATUS_LABELS[hunt.status].color}`}>
          {STATUS_LABELS[hunt.status].label}
        </span>
      </div>
      <div className="flex items-center gap-4 text-sm text-text-secondary">
        <span>{hunt.server}</span>
        <span className={`px-2 py-0.5 rounded text-xs ${DIFFICULTY_LABELS[hunt.difficulty].color}`}>
          {DIFFICULTY_LABELS[hunt.difficulty].label}
        </span>
      </div>
      {hunt.x && hunt.y && (
        <div className="text-xs text-text-muted mt-1">
          Location: {hunt.x}, {hunt.y}
        </div>
      )}
    </div>
  );
}
