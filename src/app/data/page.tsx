"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Stats {
  items: number;
  recipes: number;
  base_materials: number;
  craftable: number;
  categories: number;
}

export default function DataPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);
  const [importPreview, setImportPreview] = useState<string | null>(null);
  const [importData, setImportData] = useState<object | null>(null);
  const [replaceData, setReplaceData] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadStats();
  }, []);

  const loadStats = async () => {
    const res = await fetch("/api/data?action=stats");
    const data = await res.json();
    setStats(data);
  };

  const showMessage = (type: "success" | "error" | "info", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // Export JSON
  const handleExport = async () => {
    try {
      const res = await fetch("/api/data?action=export");
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `wurmcalc-backup-${new Date().toISOString().split("T")[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showMessage("success", "Data exported successfully!");
    } catch (error) {
      showMessage("error", "Failed to export data: " + String(error));
    }
  };

  // Handle file selection
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        // Validate structure
        if (!data.items || !Array.isArray(data.items)) {
          throw new Error("Invalid file: missing 'items' array");
        }
        if (!data.recipes || !Array.isArray(data.recipes)) {
          throw new Error("Invalid file: missing 'recipes' array");
        }

        setImportData(data);
        setImportPreview(
          `Found ${data.items.length} items and ${data.recipes.length} recipes`
        );
      } catch (error) {
        showMessage("error", "Invalid JSON file: " + String(error));
        setImportData(null);
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  // Import JSON
  const handleImport = async () => {
    if (!importData) return;

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          data: importData,
          replace: replaceData,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage(
          "success",
          `Imported ${result.items_added} items and ${result.recipes_added} recipes!`
        );
        setImportData(null);
        setImportPreview(null);
        setReplaceData(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
        loadStats();
      } else {
        showMessage("error", result.error || "Import failed");
      }
    } catch (error) {
      showMessage("error", "Import failed: " + String(error));
    }
  };

  // Clear all data
  const handleClearAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL data? This cannot be undone!"
      )
    ) {
      return;
    }
    if (
      !confirm(
        "This will remove all items and recipes. Are you absolutely sure?"
      )
    ) {
      return;
    }

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });

      if (res.ok) {
        showMessage("success", "All data cleared!");
        loadStats();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to clear data");
      }
    } catch (error) {
      showMessage("error", "Failed to clear data: " + String(error));
    }
  };

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">
          <span className="text-accent">Data</span>
          <span>Management</span>
        </h1>
        <p className="text-gray-400 mt-2">
          Import, export, and manage your calculator data
        </p>
      </header>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-success/20 text-success"
              : message.type === "error"
              ? "bg-red-500/20 text-red-400"
              : "bg-accent/20 text-accent"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="bg-dark-card p-6 rounded-xl mb-6">
          <h2 className="text-accent text-xl font-semibold mb-4">
            Database Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-3xl font-bold text-white">{stats.items}</div>
              <div className="text-gray-400 text-sm">Total Items</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-3xl font-bold text-success">
                {stats.base_materials}
              </div>
              <div className="text-gray-400 text-sm">Base Materials</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-3xl font-bold text-accent">
                {stats.craftable}
              </div>
              <div className="text-gray-400 text-sm">Craftable</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-3xl font-bold text-white">
                {stats.recipes}
              </div>
              <div className="text-gray-400 text-sm">Recipe Links</div>
            </div>
            <div className="text-center p-4 bg-white/5 rounded-lg">
              <div className="text-3xl font-bold text-white">
                {stats.categories}
              </div>
              <div className="text-gray-400 text-sm">Categories</div>
            </div>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-6">
        {/* Export */}
        <div className="bg-dark-card p-6 rounded-xl">
          <h2 className="text-accent text-xl font-semibold mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
              />
            </svg>
            Export Data
          </h2>
          <p className="text-gray-400 mb-4">
            Download all items and recipes as a JSON file for backup or
            transfer.
          </p>
          <button
            onClick={handleExport}
            className="w-full px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
          >
            Download JSON Backup
          </button>
        </div>

        {/* Import */}
        <div className="bg-dark-card p-6 rounded-xl">
          <h2 className="text-accent text-xl font-semibold mb-4 flex items-center gap-2">
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
            Import Data
          </h2>
          <p className="text-gray-400 mb-4">
            Import items and recipes from a JSON backup file.
          </p>

          <div className="space-y-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleFileSelect}
              className="w-full px-4 py-3 bg-dark-input rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-accent file:text-white file:cursor-pointer"
            />

            {importPreview && (
              <div className="p-3 bg-white/5 rounded-lg text-gray-300">
                {importPreview}
              </div>
            )}

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={replaceData}
                onChange={(e) => setReplaceData(e.target.checked)}
                className="rounded"
              />
              <span className="text-gray-400">
                Replace existing data (clear before import)
              </span>
            </label>

            <button
              onClick={handleImport}
              disabled={!importData}
              className={`w-full px-4 py-3 rounded-lg font-medium transition-colors ${
                importData
                  ? "bg-accent hover:bg-accent-hover"
                  : "bg-gray-600 cursor-not-allowed text-gray-400"
              }`}
            >
              Import Data
            </button>
          </div>
        </div>
      </div>

      {/* Danger Zone */}
      <div className="bg-dark-card p-6 rounded-xl mt-6 border border-red-500/30">
        <h2 className="text-red-400 text-xl font-semibold mb-4 flex items-center gap-2">
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Danger Zone
        </h2>
        <p className="text-gray-400 mb-4">
          Permanently delete all data from the database. This action cannot be
          undone!
        </p>
        <button
          onClick={handleClearAll}
          className="px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 rounded-lg font-medium transition-colors"
        >
          Clear All Data
        </button>
      </div>

      {/* JSON Format Info */}
      <div className="bg-dark-card p-6 rounded-xl mt-6">
        <h2 className="text-accent text-xl font-semibold mb-4">
          JSON Format Reference
        </h2>
        <p className="text-gray-400 mb-4">
          The import/export JSON uses the following structure:
        </p>
        <pre className="bg-dark-input p-4 rounded-lg overflow-x-auto text-sm text-gray-300">
{`{
  "items": [
    {
      "id": 1,
      "name": "Iron Ore",
      "category": "ore",
      "is_base_material": 1,
      "description": null
    },
    ...
  ],
  "recipes": [
    {
      "result_item_id": 5,
      "ingredient_item_id": 1,
      "quantity": 2
    },
    ...
  ]
}`}
        </pre>
      </div>

      {/* Navigation */}
      <div className="fixed bottom-5 right-5 flex gap-3">
        <Link
          href="/"
          className="px-5 py-2.5 bg-dark-card text-gray-400 hover:bg-accent hover:text-white rounded-lg transition-colors"
        >
          Calculator
        </Link>
        <Link
          href="/admin"
          className="px-5 py-2.5 bg-dark-card text-gray-400 hover:bg-accent hover:text-white rounded-lg transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
