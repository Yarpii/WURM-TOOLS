"use client";

import { useState, useEffect } from "react";
import type { WurmpediaRecipe } from "@/lib/types";

// ========== Shared UI Components ==========

export function SubTabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors relative ${
        active
          ? "bg-accent text-white"
          : "text-text-secondary hover:text-text-primary"
      }`}
    >
      {children}
      {badge !== undefined && badge > 0 && (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge > 99 ? "99+" : badge}
        </span>
      )}
    </button>
  );
}

export function StatCard({
  label,
  value,
  color = "text-white",
  subtext,
}: {
  label: string;
  value: number | string;
  color?: string;
  subtext?: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border p-4 rounded-xl">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-text-secondary text-sm">{label}</div>
      {subtext && <div className="text-text-muted text-xs mt-1">{subtext}</div>}
    </div>
  );
}

export function QuickFilterButton({
  active,
  onClick,
  children,
  color = "accent",
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  color?: "accent" | "amber" | "green" | "orange";
}) {
  const colors = {
    accent: active ? "bg-accent text-white" : "",
    amber: active ? "bg-amber-500 text-white" : "",
    green: active ? "bg-green-500 text-white" : "",
    orange: active ? "bg-orange-500 text-white" : "",
  };

  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
        active
          ? colors[color]
          : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
      }`}
    >
      {children}
    </button>
  );
}

export function LoadingSpinner({ text = "Loading..." }: { text?: string }) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex items-center gap-3 text-text-secondary">
        <span className="animate-spin text-2xl">&#9881;</span>
        <span className="text-lg">{text}</span>
      </div>
    </div>
  );
}

export function EmptyState({
  icon = "&#128214;",
  title,
  message,
}: {
  icon?: string;
  title: string;
  message: string;
}) {
  return (
    <div className="p-12 text-center">
      <div
        className="text-5xl mb-4 opacity-20"
        dangerouslySetInnerHTML={{ __html: icon }}
      />
      <h3 className="text-lg text-text-secondary mb-2">{title}</h3>
      <p className="text-text-muted text-sm">{message}</p>
    </div>
  );
}

// ========== Recipe Components ==========

export function RecipeListItem({
  recipe,
  selected,
  activating,
  onClick,
  onActivate,
  onDelete,
}: {
  recipe: WurmpediaRecipe;
  selected: boolean;
  activating: boolean;
  onClick: () => void;
  onActivate: () => void;
  onDelete: () => void;
}) {
  const isActivated = !!recipe.activated_at;

  return (
    <div
      onClick={onClick}
      className={`p-4 cursor-pointer transition-colors hover:bg-bg-hover ${
        selected ? "bg-accent/10 border-l-2 border-l-accent" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-text-primary">{recipe.name}</span>
            {isActivated && (
              <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                Activated
              </span>
            )}
            {recipe.difficulty !== null && (
              <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded">
                Diff: {recipe.difficulty}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            {recipe.skill && (
              <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                {recipe.skill}
              </span>
            )}
            {recipe.is_cooking && (
              <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                Cooking
              </span>
            )}
            {recipe.has_materials && (
              <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                {recipe.materials?.length || 0} materials
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {recipe.has_materials && !isActivated && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onActivate();
              }}
              disabled={activating}
              className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
            >
              {activating ? "..." : "Activate"}
            </button>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete();
            }}
            className="text-red-400 hover:text-red-300 p-1"
            title="Delete recipe"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecipeDetail({
  recipe,
  onActivate,
  onDeactivate,
  activating,
  onDelete,
}: {
  recipe: WurmpediaRecipe;
  onActivate: (materials: Array<{ name: string; quantity: number; optional?: boolean }>) => void;
  onDeactivate?: () => void;
  activating: boolean;
  onDelete: () => void;
}) {
  const [editedMaterials, setEditedMaterials] = useState<
    Array<{ name: string; quantity: number; optional?: boolean }>
  >(
    recipe.materials?.map((m) => ({
      name: m.name,
      quantity: m.quantity || 1,
      optional: m.optional,
    })) || []
  );

  useEffect(() => {
    setEditedMaterials(
      recipe.materials?.map((m) => ({
        name: m.name,
        quantity: m.quantity || 1,
        optional: m.optional,
      })) || []
    );
  }, [recipe.id, recipe.materials]);

  const updateQuantity = (index: number, quantity: number) => {
    setEditedMaterials((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(1, quantity) };
      return updated;
    });
  };

  const isActivated = !!recipe.activated_at;

  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">{recipe.name}</h3>
            {isActivated && (
              <span className="text-green-400 text-sm">
                Activated {new Date(recipe.activated_at!).toLocaleDateString()}
              </span>
            )}
          </div>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 p-1"
            title="Delete recipe"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
              />
            </svg>
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {recipe.skill && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
              {recipe.skill}
            </span>
          )}
          {recipe.difficulty !== null && (
            <span className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded">
              Difficulty: {recipe.difficulty}
            </span>
          )}
          {recipe.recipe_type !== "misc" && (
            <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded capitalize">
              {recipe.recipe_type}
            </span>
          )}
        </div>
      </div>

      {/* Creation Info */}
      {(recipe.creation_target || recipe.creation_tools?.length) && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Creation</h4>
          <div className="space-y-2 text-sm">
            {recipe.creation_target && (
              <div className="flex justify-between">
                <span className="text-text-muted">Target</span>
                <span className="text-text-primary">{recipe.creation_target}</span>
              </div>
            )}
            {recipe.creation_tools && recipe.creation_tools.length > 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Tools</span>
                <span className="text-text-primary">{recipe.creation_tools.join(", ")}</span>
              </div>
            )}
            {recipe.creation_menu && (
              <div className="flex justify-between">
                <span className="text-text-muted">Menu</span>
                <span className="text-text-primary text-right">{recipe.creation_menu}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Materials - Editable */}
      {editedMaterials.length > 0 && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-sm font-medium text-text-primary">
              Materials ({editedMaterials.length})
            </h4>
            {!isActivated && <span className="text-xs text-text-muted">Edit quantities</span>}
          </div>
          <div className="space-y-2">
            {editedMaterials.map((mat, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  mat.optional ? "bg-bg-tertiary/50" : "bg-bg-tertiary"
                }`}
              >
                <span className={mat.optional ? "text-text-muted italic" : "text-text-primary"}>
                  {mat.name}
                  {mat.optional && " (optional)"}
                </span>
                {!isActivated ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateQuantity(idx, mat.quantity - 1)}
                      className="w-6 h-6 rounded bg-bg-secondary hover:bg-bg-hover text-text-secondary hover:text-white flex items-center justify-center text-sm"
                    >
                      -
                    </button>
                    <input
                      type="number"
                      min="1"
                      value={mat.quantity}
                      onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                      className="w-12 text-center bg-bg-secondary border border-border rounded px-1 py-0.5 text-accent font-mono font-medium text-sm focus:border-accent focus:outline-none"
                    />
                    <button
                      onClick={() => updateQuantity(idx, mat.quantity + 1)}
                      className="w-6 h-6 rounded bg-bg-secondary hover:bg-bg-hover text-text-secondary hover:text-white flex items-center justify-center text-sm"
                    >
                      +
                    </button>
                  </div>
                ) : (
                  <span className="text-accent font-mono">{mat.quantity}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {recipe.result_name && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Result</h4>
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <span className="text-success font-medium">{recipe.result_name}</span>
            {recipe.result_quantity > 1 && (
              <span className="text-success/70 ml-2">x{recipe.result_quantity}</span>
            )}
            {recipe.result_weight && (
              <span className="text-success/70 ml-2">({recipe.result_weight}kg)</span>
            )}
          </div>
        </div>
      )}

      {/* Improvement */}
      {recipe.can_improve && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Improvement</h4>
          <div className="flex items-center gap-2">
            <span className="text-green-400">&#10003; Can be improved</span>
            {recipe.improve_with && (
              <span className="text-text-muted">with {recipe.improve_with}</span>
            )}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="p-4">
        {recipe.has_materials && !isActivated && (
          <>
            <button
              onClick={() => onActivate(editedMaterials)}
              disabled={activating}
              className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {activating ? (
                <>
                  <span className="animate-spin">&#9881;</span>
                  <span>Activating...</span>
                </>
              ) : (
                <>
                  <span>&#9889;</span>
                  <span>Activate for Calculator</span>
                </>
              )}
            </button>
            <p className="text-text-muted text-xs text-center mt-2">
              Add this recipe to the crafting calculator
            </p>
          </>
        )}

        {isActivated && (
          <div className="space-y-3">
            <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
              <span className="text-green-400">&#10003; Already activated</span>
            </div>
            {onDeactivate && (
              <button
                onClick={onDeactivate}
                disabled={activating}
                className="w-full py-2 bg-bg-tertiary border border-border hover:border-red-500 text-text-secondary hover:text-red-400 text-sm rounded-lg transition-colors disabled:opacity-50"
              >
                {activating ? "Processing..." : "Deactivate (Undo)"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ========== Progress Components ==========

export function ProgressBar({
  current,
  total,
  label,
  showPercentage = true,
}: {
  current: number;
  total: number;
  label?: string;
  showPercentage?: boolean;
}) {
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;

  return (
    <div className="mb-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-text-secondary">
          {label || `${current} / ${total}`}
        </span>
        {showPercentage && (
          <span
            className={`font-bold ${percentage === 100 ? "text-success" : "text-accent"}`}
          >
            {percentage}%
          </span>
        )}
      </div>
      <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

export function BulkProgressModal({
  isOpen,
  current,
  total,
  status,
  onClose,
}: {
  isOpen: boolean;
  current: number;
  total: number;
  status: string;
  onClose?: () => void;
}) {
  if (!isOpen) return null;

  const percentage = total > 0 ? Math.round((current / total) * 100) : 0;
  const isComplete = current >= total;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-bg-secondary border border-border rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold text-white mb-4">
          {isComplete ? "Bulk Activation Complete" : "Activating Recipes..."}
        </h3>

        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-text-secondary">{status}</span>
            <span className="text-accent font-bold">{percentage}%</span>
          </div>
          <div className="h-4 bg-bg-tertiary rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                isComplete
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-accent to-purple-500"
              }`}
              style={{ width: `${percentage}%` }}
            />
          </div>
          <div className="text-text-muted text-sm mt-2 text-center">
            {current} / {total} recipes processed
          </div>
        </div>

        {isComplete && onClose && (
          <button
            onClick={onClose}
            className="w-full py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
