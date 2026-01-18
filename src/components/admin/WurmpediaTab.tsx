"use client";

import { useState, useEffect, useRef, useCallback } from "react";
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

type SubTab = "import" | "browser";

export default function WurmpediaTab({ showMessage }: WurmpediaTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("import");
  const [stats, setStats] = useState<WurmpediaStats | null>(null);
  const [importLogs, setImportLogs] = useState<WurmpediaImportLog[]>([]);
  const [recipes, setRecipes] = useState<WurmpediaRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [hasMaterials, setHasMaterials] = useState<boolean | null>(null);
  const [skills, setSkills] = useState<string[]>([]);
  const [previewData, setPreviewData] = useState<{
    count: number;
    sample: Array<{ id: number; name: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // Browser state
  const [selectedRecipe, setSelectedRecipe] = useState<WurmpediaRecipe | null>(null);
  const [activating, setActivating] = useState<number | null>(null);

  const ITEMS_PER_PAGE = 20;
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    loadImportLogs();
    loadSkills();
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [currentPage, selectedSkill, selectedType, hasMaterials]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      loadRecipes();
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

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

  const loadRecipes = useCallback(async () => {
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (searchTerm) params.set("search", searchTerm);
      if (selectedSkill) params.set("skill", selectedSkill);
      if (selectedType) params.set("recipe_type", selectedType);
      if (hasMaterials !== null) params.set("has_materials", hasMaterials.toString());

      const res = await fetch(`/api/admin/wurmpedia-recipes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.data || []);
        setTotalRecipes(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load recipes:", err);
    }
  }, [currentPage, searchTerm, selectedSkill, selectedType, hasMaterials]);

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
        if (selectedRecipe?.id === id) {
          setSelectedRecipe(null);
        }
      } else {
        const result = await res.json();
        showMessage("error", result.error || "Failed to delete recipe");
      }
    } catch (err) {
      showMessage("error", "Failed to delete recipe: " + String(err));
    }
  };

  const handleActivateRecipe = async (
    recipe: WurmpediaRecipe,
    materials?: Array<{ name: string; quantity: number; optional?: boolean }>
  ) => {
    setActivating(recipe.id);

    try {
      const res = await fetch("/api/wurmpedia/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipeId: recipe.id,
          // Send custom materials if provided (for edits)
          materials: materials || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage("success", result.message || `"${recipe.name}" activated for calculator!`);
      } else {
        showMessage("error", result.error || "Failed to activate recipe");
      }
    } catch (err) {
      showMessage("error", "Failed to activate recipe: " + String(err));
    } finally {
      setActivating(null);
    }
  };

  const totalPages = Math.ceil(totalRecipes / ITEMS_PER_PAGE);

  const recipeTypes = [
    { value: "", label: "All Types" },
    { value: "misc", label: "Misc" },
    { value: "cooking", label: "Cooking" },
    { value: "smithing", label: "Smithing" },
    { value: "carpentry", label: "Carpentry" },
    { value: "tailoring", label: "Tailoring" },
    { value: "masonry", label: "Masonry" },
  ];

  return (
    <div className="space-y-6">
      {/* Sub-Tab Navigation */}
      <div className="flex gap-2 bg-bg-tertiary p-1 rounded-lg w-fit">
        <button
          onClick={() => setActiveSubTab("import")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeSubTab === "import"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Import Recipes
        </button>
        <button
          onClick={() => setActiveSubTab("browser")}
          className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
            activeSubTab === "browser"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary"
          }`}
        >
          Browse & Activate
        </button>
      </div>

      {/* Stats Cards - Always visible */}
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

      {/* Import Sub-Tab Content */}
      {activeSubTab === "import" && (
        <>
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
        </>
      )}

      {/* Browser Sub-Tab Content */}
      {activeSubTab === "browser" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column - Filters & List */}
          <div className="lg:col-span-2 space-y-4">
            {/* Search & Filters */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Search */}
                <div className="sm:col-span-2">
                  <input
                    type="text"
                    placeholder="Search recipes..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
                  />
                </div>

                {/* Skill Filter */}
                <select
                  value={selectedSkill}
                  onChange={(e) => {
                    setSelectedSkill(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent"
                >
                  <option value="">All Skills</option>
                  {skills.map((skill) => (
                    <option key={skill} value={skill}>
                      {skill}
                    </option>
                  ))}
                </select>

                {/* Type Filter */}
                <select
                  value={selectedType}
                  onChange={(e) => {
                    setSelectedType(e.target.value);
                    setCurrentPage(1);
                  }}
                  className="px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent"
                >
                  {recipeTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quick Filters */}
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  onClick={() => {
                    setHasMaterials(hasMaterials === true ? null : true);
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    hasMaterials === true
                      ? "bg-accent text-white"
                      : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  Has Materials
                </button>
                <button
                  onClick={() => {
                    setSelectedType(selectedType === "cooking" ? "" : "cooking");
                    setCurrentPage(1);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    selectedType === "cooking"
                      ? "bg-orange-500 text-white"
                      : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
                  }`}
                >
                  Cooking Only
                </button>
              </div>
            </div>

            {/* Recipe List */}
            <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
              <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
                {recipes.map((recipe) => (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`p-4 cursor-pointer transition-colors hover:bg-bg-hover ${
                      selectedRecipe?.id === recipe.id ? "bg-accent/10 border-l-2 border-l-accent" : ""
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-text-primary">{recipe.name}</span>
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
                          {recipe.can_improve && (
                            <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                              Improvable
                            </span>
                          )}
                          {recipe.has_materials && (
                            <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                              {(recipe.materials?.length || 0)} materials
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {recipe.has_materials && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              // Quick activate uses original materials - for edits, use the detail panel
                              handleActivateRecipe(recipe);
                            }}
                            disabled={activating === recipe.id}
                            className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                            title="Quick activate with original quantities"
                          >
                            {activating === recipe.id ? "..." : "Activate"}
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteRecipe(recipe.id);
                          }}
                          className="text-red-400 hover:text-red-300 p-1"
                          title="Delete recipe"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {recipes.length === 0 && (
                  <div className="p-12 text-center">
                    <div className="text-5xl mb-4 opacity-20">&#128214;</div>
                    <h3 className="text-lg text-text-secondary mb-2">No Recipes Found</h3>
                    <p className="text-text-muted text-sm">
                      {stats?.total_recipes === 0
                        ? "No Wurmpedia recipes have been imported yet. Use the Import tab to get started."
                        : "Try adjusting your search filters."}
                    </p>
                  </div>
                )}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between p-4 border-t border-border">
                  <span className="text-text-muted text-sm">
                    {totalRecipes} recipes
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm disabled:opacity-50 hover:border-accent transition-colors"
                    >
                      Prev
                    </button>
                    <span className="text-text-secondary text-sm px-2">
                      {currentPage} / {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm disabled:opacity-50 hover:border-accent transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Right Column - Recipe Detail */}
          <div className="space-y-4">
            {selectedRecipe ? (
              <RecipeDetail
                recipe={selectedRecipe}
                onActivate={(materials) => handleActivateRecipe(selectedRecipe, materials)}
                activating={activating === selectedRecipe.id}
                onDelete={() => handleDeleteRecipe(selectedRecipe.id)}
              />
            ) : (
              <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
                <div className="text-5xl mb-4 opacity-20">&#128270;</div>
                <h3 className="text-lg text-text-secondary mb-2">Select a Recipe</h3>
                <p className="text-text-muted text-sm">
                  Click on a recipe to see its details and activate it for the calculator
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Recipe Detail Component with editable materials
function RecipeDetail({
  recipe,
  onActivate,
  activating,
  onDelete,
}: {
  recipe: WurmpediaRecipe;
  onActivate: (materials: Array<{ name: string; quantity: number; optional?: boolean }>) => void;
  activating: boolean;
  onDelete: () => void;
}) {
  // Local state for editable materials
  const [editedMaterials, setEditedMaterials] = useState<Array<{ name: string; quantity: number; optional?: boolean }>>(
    recipe.materials?.map(m => ({
      name: m.name,
      quantity: m.quantity || 1,
      optional: m.optional
    })) || []
  );

  // Update materials when recipe changes
  useEffect(() => {
    setEditedMaterials(
      recipe.materials?.map(m => ({
        name: m.name,
        quantity: m.quantity || 1,
        optional: m.optional
      })) || []
    );
  }, [recipe.id, recipe.materials]);

  const updateQuantity = (index: number, quantity: number) => {
    setEditedMaterials(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], quantity: Math.max(1, quantity) };
      return updated;
    });
  };

  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-lg font-semibold text-text-primary">{recipe.name}</h3>
          <button
            onClick={onDelete}
            className="text-red-400 hover:text-red-300 p-1"
            title="Delete recipe"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
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
            <h4 className="text-sm font-medium text-text-primary">Materials ({editedMaterials.length})</h4>
            <span className="text-xs text-text-muted">Click quantity to edit</span>
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

      {/* Notes */}
      {recipe.notes && recipe.notes.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Notes</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            {recipe.notes.map((note, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-text-muted">&#8226;</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Properties */}
      {recipe.properties && recipe.properties.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Properties</h4>
          <div className="flex flex-wrap gap-2">
            {recipe.properties.map((prop, idx) => (
              <span key={idx} className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded">
                {prop}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activate Button */}
      {recipe.has_materials && (
        <div className="p-4">
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
            This will add the recipe to the crafting calculator so you can calculate materials
          </p>
        </div>
      )}
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
