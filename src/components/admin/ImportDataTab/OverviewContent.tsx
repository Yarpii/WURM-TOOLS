"use client";

import type { WurmpediaStats, BulkActivationStats } from "@/lib/types";
import type { DataStats } from "../types";
import { StatCard, ProgressBar } from "./components";

interface OverviewContentProps {
  dataStats: DataStats | null;
  wurmpediaStats: WurmpediaStats | null;
  bulkStats: BulkActivationStats | null;
  reloading: boolean;
  onReloadExtended: () => void;
}

export default function OverviewContent({
  dataStats,
  wurmpediaStats,
  bulkStats,
  reloading,
  onReloadExtended,
}: OverviewContentProps) {
  const activationPercentage =
    bulkStats && bulkStats.with_materials > 0
      ? Math.round((bulkStats.activated / bulkStats.with_materials) * 100)
      : 0;

  return (
    <>
      {/* Summary Header */}
      <div className="bg-gradient-to-r from-accent/20 to-purple-500/20 border border-accent/30 p-6 rounded-xl">
        <h2 className="text-xl font-semibold text-white mb-2">Data Import System</h2>
        <p className="text-text-secondary">
          Import and activate Wurmpedia recipes for the crafting calculator. Wurmpedia has over
          1500 crafting and cooking recipes that can be imported here.
        </p>
      </div>

      {/* Current Calculator Data */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h3 className="text-accent text-lg font-semibold mb-4">Calculator Data</h3>
        {dataStats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <StatCard label="Total Items" value={dataStats.items} />
            <StatCard label="Craftable" value={dataStats.craftable} color="text-accent" />
            <StatCard label="Base Materials" value={dataStats.base_materials} color="text-success" />
            <StatCard label="Recipes" value={dataStats.recipes} />
            <StatCard label="Categories" value={dataStats.categories} />
          </div>
        )}
        <div className="mt-4 pt-4 border-t border-border flex items-center gap-4">
          <button
            onClick={onReloadExtended}
            disabled={reloading}
            className="px-4 py-2 bg-bg-tertiary border border-border hover:border-accent rounded-lg text-sm transition-colors disabled:opacity-50 flex items-center gap-2"
          >
            {reloading && <span className="animate-spin">&#9881;</span>}
            Reload Extended Data
          </button>
          <a
            href="/api/data?action=export"
            download="wurm-data-export.json"
            className="px-4 py-2 bg-bg-tertiary border border-border hover:border-accent rounded-lg text-sm transition-colors"
          >
            Export JSON
          </a>
        </div>
      </div>

      {/* Wurmpedia Import Status */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h3 className="text-purple-400 text-lg font-semibold mb-4">Wurmpedia Import Status</h3>
        {wurmpediaStats && wurmpediaStats.total_recipes > 0 ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard
                label="Imported Recipes"
                value={wurmpediaStats.total_recipes}
                color="text-purple-400"
              />
              <StatCard
                label="With Materials"
                value={wurmpediaStats.recipes_with_materials}
                color="text-blue-400"
              />
              <StatCard
                label="Cooking"
                value={wurmpediaStats.cooking_recipes}
                color="text-orange-400"
              />
              <StatCard
                label="Skills"
                value={wurmpediaStats.unique_skills}
                color="text-cyan-400"
              />
            </div>

            {Object.keys(wurmpediaStats.by_type).length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <h4 className="text-text-secondary text-sm mb-2">By Type</h4>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(wurmpediaStats.by_type).map(([type, count]) => (
                    <span
                      key={type}
                      className="px-3 py-1 bg-bg-tertiary rounded-full text-sm"
                    >
                      {type}: <span className="text-accent font-medium">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 opacity-20">&#128214;</div>
            <p className="text-text-muted">
              No Wurmpedia recipes imported yet. Go to the Import tab to get started.
            </p>
          </div>
        )}
      </div>

      {/* Activation Progress */}
      {bulkStats && bulkStats.with_materials > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h3 className="text-green-400 text-lg font-semibold mb-4">Activation Progress</h3>

          <ProgressBar
            current={bulkStats.activated}
            total={bulkStats.with_materials}
            label={`${bulkStats.activated} / ${bulkStats.with_materials} recipes activated`}
          />

          {bulkStats.not_activated > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400">
                <span className="font-bold">{bulkStats.not_activated}</span> recipes ready to
                activate. Go to the Activate tab for bulk activation.
              </p>
            </div>
          )}

          {activationPercentage === 100 && (
            <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <p className="text-green-400">
                &#10003; All recipes with materials have been activated!
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
