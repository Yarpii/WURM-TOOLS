"use client";

import { useState, useEffect, useRef } from "react";
import type {
  WurmpediaRecipe,
  WurmpediaImportResult,
  WurmpediaImportLog,
} from "@/lib/types";

interface WurmpediaStats {
  total_recipes: number;
  cooking_recipes: number;
  improvable_recipes: number;
  recipes_with_materials: number;
  unique_skills: number;
  unique_categories: number;
  by_type: Record<string, number>;
}

interface WurmpediaTabProps {
  showMessage: (type: "success" | "error", text: string) => void;
}

export default function WurmpediaTab({ showMessage }: WurmpediaTabProps) {
  const [stats, setStats] = useState<WurmpediaStats | null>(null);
  const [importLogs, setImportLogs] = useState<WurmpediaImportLog[]>([]);
  const [recipes, setRecipes] = useState<WurmpediaRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [skills, setSkills] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<{
    count: number;
    sample: Array<{ id: number; name: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  const ITEMS_PER_PAGE = 20;

  useEffect(() => {
    loadStats();
    loadImportLogs();
    loadSkills();
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [currentPage, searchTerm, selectedSkill]);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/admin/wurmpedia-recipes?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadImportLogs = async () => {
    try {
      const res = await fetch("/api/admin/wurmpedia-recipes?action=logs&limit=5");
      if (res.ok) {
        const data = await res.json();
        setImportLogs(data);
      }
    } catch (err) {
      console.error("Failed to load import logs:", err);
    }
  };

  const loadSkills = async () => {
    try {
      const res = await fetch("/api/admin/wurmpedia-recipes?action=skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (err) {
      console.error("Failed to load skills:", err);
    }
  };

  const loadRecipes = async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (searchTerm) params.set("search", searchTerm);
      if (selectedSkill) params.set("skill", selectedSkill);

      const res = await fetch(`/api/admin/wurmpedia-recipes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.data || []);
        setTotalRecipes(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load recipes:", err);
    }
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setFileContent(content);

      // Parse and preview
      const data = JSON.parse(content);
      const recipes = Array.isArray(data) ? data : [];

      setPreviewData({
        count: recipes.length,
        sample: recipes.slice(0, 5).map((r: { id: number; name: string }) => ({
          id: r.id,
          name: r.name,
        })),
      });
    } catch (err) {
      showMessage("error", "Invalid JSON file: " + String(err));
      setPreviewData(null);
      setFileContent(null);
    }
  };

  const handleImport = async () => {
    if (!fileContent) {
      showMessage("error", "No file selected");
      return;
    }

    setImporting(true);
    try {
      const recipes = JSON.parse(fileContent);

      const res = await fetch("/api/admin/wurmpedia-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          recipes: Array.isArray(recipes) ? recipes : [],
        }),
      });

      const result: WurmpediaImportResult = await res.json();

      if (res.ok) {
        const summary = `Import complete: ${result.recipes_added} added, ${result.recipes_updated} updated`;
        if (result.recipes_failed > 0) {
          showMessage("error", `${summary}, ${result.recipes_failed} failed`);
        } else {
          showMessage("success", summary);
        }

        // Refresh data
        loadStats();
        loadImportLogs();
        loadRecipes();
        loadSkills();

        // Clear preview
        setPreviewData(null);
        setFileContent(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      } else {
        showMessage("error", result.errors?.[0] || "Import failed");
      }
    } catch (err) {
      showMessage("error", "Import failed: " + String(err));
    } finally {
      setImporting(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm(
        "Are you sure you want to delete ALL Wurmpedia recipes? This cannot be undone."
      )
    ) {
      return;
    }

    setClearing(true);
    try {
      const res = await fetch("/api/admin/wurmpedia-recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "clear" }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage("success", result.message);
        loadStats();
        loadRecipes();
      } else {
        showMessage("error", result.error || "Failed to clear recipes");
      }
    } catch (err) {
      showMessage("error", "Failed to clear recipes: " + String(err));
    } finally {
      setClearing(false);
    }
  };

  const handleDeleteRecipe = async (id: number) => {
    if (!confirm("Delete this recipe?")) return;

    try {
      const res = await fetch(`/api/admin/wurmpedia-recipes?id=${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", "Recipe deleted");
        loadStats();
        loadRecipes();
      } else {
        const result = await res.json();
        showMessage("error", result.error || "Failed to delete recipe");
      }
    } catch (err) {
      showMessage("error", "Failed to delete recipe: " + String(err));
    }
  };

  const totalPages = Math.ceil(totalRecipes / ITEMS_PER_PAGE);

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          <StatCard label="Total Recipes" value={stats.total_recipes} color="text-white" />
          <StatCard label="Cooking" value={stats.cooking_recipes} color="text-orange-400" />
          <StatCard label="Improvable" value={stats.improvable_recipes} color="text-green-400" />
          <StatCard label="With Materials" value={stats.recipes_with_materials} color="text-blue-400" />
          <StatCard label="Skills" value={stats.unique_skills} color="text-purple-400" />
          <StatCard label="Categories" value={stats.unique_categories} color="text-cyan-400" />
        </div>
      )}

      {/* By Type */}
      {stats && Object.keys(stats.by_type).length > 0 && (
        <div className="bg-bg-secondary border border-border p-4 rounded-xl">
          <h3 className="text-accent font-semibold mb-3">Recipes by Type</h3>
          <div className="flex flex-wrap gap-2">
            {Object.entries(stats.by_type).map(([type, count]) => (
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

      {/* Import Section */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">
          Import Wurmpedia Recipes
        </h2>

        <div className="space-y-4">
          {/* File Input */}
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2">
              Select JSON File
            </label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={handleFileSelect}
              className="block w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-accent file:text-white
                hover:file:bg-accent-hover
                file:cursor-pointer cursor-pointer"
            />
            <p className="text-text-secondary text-sm mt-2">
              Upload a JSON file with Wurmpedia recipe data. The file should be
              an array of recipe objects.
            </p>
          </div>

          {/* Preview */}
          {previewData && (
            <div className="p-4 bg-blue-500/10 border border-blue-500/30 rounded-lg">
              <h3 className="text-blue-400 font-medium mb-2">
                Preview: {previewData.count} recipes found
              </h3>
              <div className="text-sm text-text-secondary space-y-1">
                {previewData.sample.map((r) => (
                  <div key={r.id}>
                    #{r.id}: {r.name}
                  </div>
                ))}
                {previewData.count > 5 && (
                  <div className="text-text-tertiary">
                    ...and {previewData.count - 5} more
                  </div>
                )}
              </div>
              <button
                onClick={handleImport}
                disabled={importing}
                className="mt-4 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {importing && <span className="animate-spin">&#9881;</span>}
                {importing ? "Importing..." : `Import ${previewData.count} Recipes`}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Clear All */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-red-400 text-xl font-semibold mb-4">Danger Zone</h2>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="font-medium text-white mb-2">Clear All Recipes</h3>
          <p className="text-text-secondary text-sm mb-3">
            Delete all Wurmpedia recipes from the database. Use this before
            re-importing to avoid duplicates with different IDs.
          </p>
          <button
            onClick={handleClearAll}
            disabled={clearing || (stats?.total_recipes || 0) === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {clearing && <span className="animate-spin">&#9881;</span>}
            {clearing ? "Clearing..." : "Clear All Recipes"}
          </button>
        </div>
      </div>

      {/* Import Logs */}
      {importLogs.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h2 className="text-accent text-xl font-semibold mb-4">
            Recent Imports
          </h2>
          <div className="space-y-2">
            {importLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white/5 rounded-lg flex items-center justify-between"
              >
                <div>
                  <span className="text-green-400">+{log.recipes_added}</span>
                  <span className="text-text-secondary mx-2">/</span>
                  <span className="text-blue-400">~{log.recipes_updated}</span>
                  {log.recipes_failed > 0 && (
                    <>
                      <span className="text-text-secondary mx-2">/</span>
                      <span className="text-red-400">-{log.recipes_failed}</span>
                    </>
                  )}
                </div>
                <span className="text-text-secondary text-sm">
                  {new Date(log.imported_at).toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recipe Browser */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">
          Browse Recipes ({totalRecipes})
        </h2>

        {/* Filters */}
        <div className="flex flex-wrap gap-4 mb-4">
          <input
            type="text"
            placeholder="Search recipes..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none"
          />
          <select
            value={selectedSkill}
            onChange={(e) => {
              setSelectedSkill(e.target.value);
              setCurrentPage(1);
            }}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none"
          >
            <option value="">All Skills</option>
            {skills.map((skill) => (
              <option key={skill} value={skill}>
                {skill}
              </option>
            ))}
          </select>
        </div>

        {/* Recipe List */}
        <div className="space-y-2 max-h-[600px] overflow-y-auto">
          {recipes.map((recipe) => (
            <div
              key={recipe.id}
              className="p-4 bg-white/5 rounded-lg flex items-start justify-between gap-4"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-medium text-white">{recipe.name}</span>
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
                  {recipe.can_improve && (
                    <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                      Improvable
                    </span>
                  )}
                </div>
                {recipe.creation_target && (
                  <div className="text-text-secondary text-sm mt-1">
                    Target: {recipe.creation_target}
                    {recipe.creation_tools && recipe.creation_tools.length > 0 && (
                      <span> with {recipe.creation_tools.join(", ")}</span>
                    )}
                  </div>
                )}
                {recipe.result_name && (
                  <div className="text-text-secondary text-sm">
                    Result: {recipe.result_name}
                    {recipe.result_weight && ` (${recipe.result_weight}kg)`}
                  </div>
                )}
              </div>
              <button
                onClick={() => handleDeleteRecipe(recipe.id)}
                className="text-red-400 hover:text-red-300 p-1"
                title="Delete recipe"
              >
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
                    d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                  />
                </svg>
              </button>
            </div>
          ))}

          {recipes.length === 0 && (
            <div className="text-center text-text-secondary py-8">
              {stats?.total_recipes === 0
                ? "No recipes imported yet. Upload a JSON file to get started."
                : "No recipes match your search."}
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-4">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-1 bg-bg-tertiary border border-border rounded disabled:opacity-50"
            >
              Prev
            </button>
            <span className="text-text-secondary">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              className="px-3 py-1 bg-bg-tertiary border border-border rounded disabled:opacity-50"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-bg-secondary border border-border p-4 rounded-xl">
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
      <div className="text-text-secondary text-sm">{label}</div>
    </div>
  );
}
