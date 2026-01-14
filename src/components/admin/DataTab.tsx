"use client";

import { useState, useEffect } from "react";
import type { DataStats } from "./types";

interface DataTabProps {
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

export default function DataTab({ onDataChange, showMessage }: DataTabProps) {
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [reloading, setReloading] = useState(false);
  const [reloadMessage, setReloadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    loadDataStats();
  }, []);

  const loadDataStats = async () => {
    try {
      const res = await fetch("/api/data?action=stats");
      const data = await res.json();
      setDataStats(data);
    } catch (err) {
      console.error("Failed to load data stats:", err);
    }
  };

  const reloadExtendedData = async () => {
    setReloading(true);
    setReloadMessage(null);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reload-extended" }),
      });
      const data = await res.json();
      if (res.ok) {
        setReloadMessage({ type: "success", text: `Data reloaded successfully (v${data.version})` });
        loadDataStats();
        onDataChange();
      } else {
        setReloadMessage({ type: "error", text: data.error || "Failed to reload data" });
      }
    } catch (err) {
      setReloadMessage({ type: "error", text: "Failed to reload data: " + String(err) });
    } finally {
      setReloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Reload Message */}
      {reloadMessage && (
        <div
          className={`p-4 rounded-lg ${
            reloadMessage.type === "success"
              ? "bg-success/20 text-success"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {reloadMessage.text}
        </div>
      )}

      {/* Stats Cards */}
      {dataStats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-white">{dataStats.items}</div>
              <div className="text-text-secondary text-sm">Total Items</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-accent">{dataStats.craftable}</div>
              <div className="text-text-secondary text-sm">Craftable</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-success">{dataStats.base_materials}</div>
              <div className="text-text-secondary text-sm">Base Materials</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-white">{dataStats.recipes}</div>
              <div className="text-text-secondary text-sm">Recipes</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-white">{dataStats.categories}</div>
              <div className="text-text-secondary text-sm">Categories</div>
            </div>
          </div>

          {/* Extended Data Stats */}
          <div className="bg-bg-secondary border border-border p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">Extended Data Coverage</h2>
            <p className="text-text-secondary text-sm mb-4">
              Items with crafting metadata (difficulty, skill type, etc.)
            </p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatBar
                label="Difficulty"
                value={dataStats.with_difficulty}
                total={dataStats.craftable}
              />
              <StatBar
                label="Skill Type"
                value={dataStats.with_skill_type}
                total={dataStats.craftable}
              />
              <StatBar
                label="Base Time"
                value={dataStats.with_base_time}
                total={dataStats.craftable}
              />
              <StatBar
                label="Tool Type"
                value={dataStats.with_tool_type}
                total={dataStats.craftable}
              />
            </div>
          </div>
        </>
      )}

      {/* Actions */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">Data Management</h2>
        <div className="space-y-4">
          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="font-medium text-white mb-2">Reload Extended Data</h3>
            <p className="text-text-secondary text-sm mb-3">
              Reload item difficulty, skill types, and timing data from the extended data file.
            </p>
            <button
              onClick={reloadExtendedData}
              disabled={reloading}
              className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {reloading && <span className="animate-spin">&#9881;</span>}
              {reloading ? "Reloading..." : "Reload Extended Data"}
            </button>
          </div>

          <div className="p-4 bg-white/5 rounded-lg">
            <h3 className="font-medium text-white mb-2">Export Data</h3>
            <p className="text-text-secondary text-sm mb-3">
              Download all items and recipes as JSON.
            </p>
            <a
              href="/api/data?action=export"
              download="wurm-data-export.json"
              className="inline-block px-4 py-2 bg-bg-tertiary border border-border hover:border-accent rounded-lg font-medium transition-colors"
            >
              Export JSON
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatBar({ label, value, total }: { label: string; value: number; total: number }) {
  const percentage = total > 0 ? (value / total) * 100 : 0;
  const isComplete = value === total;

  return (
    <div className="p-4 bg-white/5 rounded-lg">
      <div className="flex justify-between items-center mb-2">
        <span className="text-text-secondary">{label}</span>
        <span className={`font-bold ${isComplete ? "text-success" : "text-warning"}`}>
          {value}/{total}
        </span>
      </div>
      <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
        <div
          className="h-full bg-accent rounded-full"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
