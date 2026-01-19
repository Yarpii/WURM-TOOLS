"use client";

import { useState, useEffect } from "react";
import type { BulkActivationStats } from "@/lib/types";
import { BulkProgressModal } from "./components";

interface ActivateContentProps {
  bulkStats: BulkActivationStats | null;
  skills: string[];
  recipeTypes: Array<{ value: string; label: string }>;
  selectedBulkSkill: string;
  selectedBulkType: string;
  bulkActivating: boolean;
  bulkProgress: { current: number; total: number; status: string } | null;
  onSkillChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onBulkActivate: () => void;
  onProgressClose: () => void;
}

export default function ActivateContent({
  bulkStats,
  skills,
  recipeTypes,
  selectedBulkSkill,
  selectedBulkType,
  bulkActivating,
  bulkProgress,
  onSkillChange,
  onTypeChange,
  onBulkActivate,
  onProgressClose,
}: ActivateContentProps) {
  const [filteredCount, setFilteredCount] = useState<number | null>(null);
  const [loadingCount, setLoadingCount] = useState(false);

  // Load filtered count when filters change
  useEffect(() => {
    const loadFilteredCount = async () => {
      if (!selectedBulkSkill && !selectedBulkType) {
        setFilteredCount(null);
        return;
      }

      setLoadingCount(true);
      try {
        const params = new URLSearchParams({
          has_materials: "true",
          activated: "false",
        });
        if (selectedBulkSkill) params.set("skill", selectedBulkSkill);
        if (selectedBulkType) params.set("recipe_type", selectedBulkType);
        params.set("limit", "1"); // We only need the count

        const res = await fetch(`/api/admin/wurmpedia-recipes?${params}`);
        if (res.ok) {
          const data = await res.json();
          setFilteredCount(data.total || 0);
        }
      } catch (err) {
        console.error("Failed to load filtered count:", err);
      } finally {
        setLoadingCount(false);
      }
    };

    loadFilteredCount();
  }, [selectedBulkSkill, selectedBulkType]);

  if (!bulkStats || bulkStats.with_materials === 0) {
    return (
      <div className="bg-bg-secondary border border-border p-8 rounded-xl text-center">
        <div className="text-5xl mb-4 opacity-20">&#128214;</div>
        <h3 className="text-lg text-text-secondary mb-2">No Recipes to Activate</h3>
        <p className="text-text-muted text-sm">
          Import Wurmpedia recipes first, then you can bulk activate them here.
        </p>
      </div>
    );
  }

  const displayCount = filteredCount !== null ? filteredCount : bulkStats.not_activated;
  const hasFilters = selectedBulkSkill || selectedBulkType;

  return (
    <>
      {/* Progress Modal */}
      {bulkProgress && (
        <BulkProgressModal
          isOpen={true}
          current={bulkProgress.current}
          total={bulkProgress.total}
          status={bulkProgress.status}
          onClose={bulkProgress.current >= bulkProgress.total ? onProgressClose : undefined}
        />
      )}

      {/* Bulk Activation */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-green-400 text-xl font-semibold mb-4">Bulk Activate Recipes</h2>
        <p className="text-text-secondary mb-4">
          Activate multiple Wurmpedia recipes at once to add them to the crafting calculator. Only
          recipes with materials can be activated.
        </p>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">Filter by Skill</label>
            <select
              value={selectedBulkSkill}
              onChange={(e) => onSkillChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent"
              disabled={bulkActivating}
            >
              <option value="">All Skills</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-text-secondary text-sm mb-2">Filter by Type</label>
            <select
              value={selectedBulkType}
              onChange={(e) => onTypeChange(e.target.value)}
              className="w-full px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent"
              disabled={bulkActivating}
            >
              {recipeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action */}
        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
          <div className="flex items-center justify-between mb-3">
            <span className="text-green-400 font-medium">
              {loadingCount ? (
                <span className="flex items-center gap-2">
                  <span className="animate-spin text-sm">&#9881;</span>
                  Counting...
                </span>
              ) : (
                <>
                  <span className="text-2xl font-bold">{displayCount}</span>
                  {" "}recipes ready to activate
                  {hasFilters && filteredCount !== null && (
                    <span className="text-text-muted text-sm ml-2">
                      (filtered from {bulkStats.not_activated} total)
                    </span>
                  )}
                </>
              )}
            </span>
          </div>
          <button
            onClick={onBulkActivate}
            disabled={bulkActivating || displayCount === 0}
            className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-medium rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {bulkActivating ? (
              <>
                <span className="animate-spin">&#9881;</span>
                <span>Activating...</span>
              </>
            ) : (
              <>
                <span>&#9889;</span>
                <span>
                  Activate {hasFilters ? `${displayCount} Filtered` : "All"} Recipes
                </span>
              </>
            )}
          </button>
          {displayCount > 100 && (
            <p className="text-text-muted text-xs text-center mt-2">
              This may take a while for large numbers of recipes
            </p>
          )}
        </div>
      </div>

      {/* By Skill Breakdown */}
      {bulkStats.by_skill.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h3 className="text-accent text-lg font-semibold mb-4">Progress by Skill</h3>
          <div className="space-y-3 max-h-[300px] overflow-y-auto">
            {bulkStats.by_skill.map(({ skill, total, activated }) => {
              const remaining = total - activated;
              const isSelected = selectedBulkSkill === skill;
              return (
                <button
                  key={skill}
                  onClick={() => onSkillChange(isSelected ? "" : skill)}
                  className={`w-full flex items-center gap-3 p-2 rounded-lg transition-colors ${
                    isSelected ? "bg-accent/20 border border-accent" : "hover:bg-bg-tertiary"
                  }`}
                  disabled={bulkActivating}
                >
                  <span className="text-text-secondary w-32 truncate text-left">{skill}</span>
                  <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent rounded-full"
                      style={{ width: `${(activated / total) * 100}%` }}
                    />
                  </div>
                  <span className="text-text-muted text-sm w-20 text-right">
                    {activated}/{total}
                    {remaining > 0 && (
                      <span className="text-amber-400 ml-1">({remaining})</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* By Type Breakdown */}
      {bulkStats.by_type.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h3 className="text-accent text-lg font-semibold mb-4">Progress by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bulkStats.by_type.map(({ recipe_type, total, activated }) => {
              const remaining = total - activated;
              const isSelected = selectedBulkType === recipe_type;
              return (
                <button
                  key={recipe_type}
                  onClick={() => onTypeChange(isSelected ? "" : recipe_type)}
                  className={`p-3 rounded-lg text-left transition-colors ${
                    isSelected
                      ? "bg-accent/20 border border-accent"
                      : "bg-bg-tertiary hover:bg-bg-hover"
                  }`}
                  disabled={bulkActivating}
                >
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-text-primary capitalize">{recipe_type}</span>
                    <span
                      className={`text-sm font-medium ${
                        activated === total ? "text-success" : "text-accent"
                      }`}
                    >
                      {Math.round((activated / total) * 100)}%
                    </span>
                  </div>
                  <div className="text-text-muted text-xs">
                    {activated} / {total}
                    {remaining > 0 && (
                      <span className="text-amber-400 ml-1">({remaining} left)</span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </>
  );
}
