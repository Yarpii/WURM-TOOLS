"use client";

import type { Stable } from "@/lib/types";

interface StableCardProps {
  stable: Stable;
  isSelected: boolean;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function StableCard({ stable, isSelected, onClick, onEdit, onDelete }: StableCardProps) {
  return (
    <div
      onClick={onClick}
      className={`p-4 bg-bg-secondary rounded-lg cursor-pointer border-2 transition-colors ${
        isSelected ? "border-accent" : "border-transparent hover:border-border"
      }`}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-semibold text-text-primary">{stable.name}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={(e) => { e.stopPropagation(); onEdit(); }}
            className="p-1 text-text-muted hover:text-accent transition-colors"
            title="Edit stable"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
            className="p-1 text-text-muted hover:text-danger transition-colors"
            title="Delete stable"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      </div>
      <div className="text-sm text-text-secondary">
        {stable.server}
      </div>
      <div className="text-xs text-text-muted mt-1">
        {stable.animal_count || 0} / {stable.capacity} animals
      </div>
      {stable.notes && (
        <div className="text-xs text-text-muted mt-2 line-clamp-2">{stable.notes}</div>
      )}
    </div>
  );
}
