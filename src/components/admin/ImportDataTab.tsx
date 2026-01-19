"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  WurmpediaRecipe,
  WurmpediaImportResult,
  WurmpediaImportLog,
} from "@/lib/types";
import type { DataStats } from "./types";

interface ImportDataTabProps {
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

interface WurmpediaStats {
  total_recipes: number;
  cooking_recipes: number;
  improvable_recipes: number;
  recipes_with_materials: number;
  unique_skills: number;
  unique_categories: number;
  by_type: Record<string, number>;
}

interface BulkActivationStats {
  total_recipes: number;
  with_materials: number;
  activated: number;
  not_activated: number;
  by_skill: Array<{ skill: string; total: number; activated: number }>;
  by_type: Array<{ recipe_type: string; total: number; activated: number }>;
}

type SubTab = "overview" | "import" | "browse" | "activate";

export default function ImportDataTab({
  onDataChange,
  showMessage,
}: ImportDataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview");

  // Calculator data stats
  const [dataStats, setDataStats] = useState<DataStats | null>(null);

  // Wurmpedia stats
  const [wurmpediaStats, setWurmpediaStats] = useState<WurmpediaStats | null>(null);
  const [importLogs, setImportLogs] = useState<WurmpediaImportLog[]>([]);
  const [skills, setSkills] = useState<string[]>([]);

  // Bulk activation
  const [bulkStats, setBulkStats] = useState<BulkActivationStats | null>(null);
  const [bulkActivating, setBulkActivating] = useState(false);
  const [selectedBulkSkill, setSelectedBulkSkill] = useState<string>("");
  const [selectedBulkType, setSelectedBulkType] = useState<string>("");

  // Import state
  const [importing, setImporting] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [previewData, setPreviewData] = useState<{
    count: number;
    sample: Array<{ id: number; name: string }>;
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);

  // Browser state
  const [recipes, setRecipes] = useState<WurmpediaRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState<string>("");
  const [selectedType, setSelectedType] = useState<string>("");
  const [hasMaterials, setHasMaterials] = useState<boolean | null>(null);
  const [showActivated, setShowActivated] = useState<boolean | null>(null);
  const [selectedRecipe, setSelectedRecipe] = useState<WurmpediaRecipe | null>(null);
  const [activating, setActivating] = useState<number | null>(null);

  // Extended data reload
  const [reloading, setReloading] = useState(false);

  const ITEMS_PER_PAGE = 20;
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadAllStats();
  }, []);

  useEffect(() => {
    if (activeSubTab === "browse") {
      loadRecipes();
    }
  }, [currentPage, selectedSkill, selectedType, hasMaterials, showActivated, activeSubTab]);

  // Debounced search
  useEffect(() => {
    if (activeSubTab !== "browse") return;

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
  }, [searchTerm, activeSubTab]);

  const loadAllStats = async () => {
    await Promise.all([
      loadDataStats(),
      loadWurmpediaStats(),
      loadImportLogs(),
      loadSkills(),
      loadBulkStats(),
    ]);
  };

  const loadDataStats = async () => {
    try {
      const res = await fetch("/api/data?action=stats");
      const data = await res.json();
      setDataStats(data);
    } catch (err) {
      console.error("Failed to load data stats:", err);
    }
  };

  const loadWurmpediaStats = async () => {
    try {
      const res = await fetch("/api/admin/wurmpedia-recipes?action=stats");
      if (res.ok) {
        const data = await res.json();
        setWurmpediaStats(data);
      }
    } catch (err) {
      console.error("Failed to load wurmpedia stats:", err);
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

  const loadBulkStats = async () => {
    try {
      const res = await fetch("/api/wurmpedia/activate/bulk");
      if (res.ok) {
        const data = await res.json();
        setBulkStats(data);
      }
    } catch (err) {
      console.error("Failed to load bulk stats:", err);
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
      if (showActivated !== null) params.set("activated", showActivated.toString());

      const res = await fetch(`/api/admin/wurmpedia-recipes?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.data || []);
        setTotalRecipes(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load recipes:", err);
    }
  }, [currentPage, searchTerm, selectedSkill, selectedType, hasMaterials, showActivated]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const content = await file.text();
      setFileContent(content);

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

        loadAllStats();
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
        loadAllStats();
      } else {
        showMessage("error", result.error || "Failed to clear recipes");
      }
    } catch (err) {
      showMessage("error", "Failed to clear recipes: " + String(err));
    } finally {
      setClearing(false);
    }
  };

  const handleBulkActivate = async () => {
    if (
      !confirm(
        `This will activate all${selectedBulkSkill ? ` ${selectedBulkSkill}` : ""}${selectedBulkType ? ` ${selectedBulkType}` : ""} recipes that have materials. Continue?`
      )
    ) {
      return;
    }

    setBulkActivating(true);
    try {
      const res = await fetch("/api/wurmpedia/activate/bulk", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          skill: selectedBulkSkill || undefined,
          recipe_type: selectedBulkType || undefined,
          only_not_activated: true,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage(
          "success",
          `Bulk activation: ${result.activated} activated, ${result.items_created} items created, ${result.skipped} skipped`
        );
        loadAllStats();
        onDataChange();
      } else {
        showMessage("error", result.error || "Bulk activation failed");
      }
    } catch (err) {
      showMessage("error", "Bulk activation failed: " + String(err));
    } finally {
      setBulkActivating(false);
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
          materials: materials || undefined,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage(
          "success",
          result.message || `"${recipe.name}" activated for calculator!`
        );
        loadBulkStats();
        onDataChange();
      } else {
        showMessage("error", result.error || "Failed to activate recipe");
      }
    } catch (err) {
      showMessage("error", "Failed to activate recipe: " + String(err));
    } finally {
      setActivating(null);
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
        loadAllStats();
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

  const reloadExtendedData = async () => {
    setReloading(true);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reload-extended" }),
      });
      const data = await res.json();
      if (res.ok) {
        showMessage("success", `Extended data reloaded (v${data.version})`);
        loadDataStats();
        onDataChange();
      } else {
        showMessage("error", data.error || "Failed to reload data");
      }
    } catch (err) {
      showMessage("error", "Failed to reload data: " + String(err));
    } finally {
      setReloading(false);
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
      <div className="flex gap-2 bg-bg-tertiary p-1 rounded-lg w-fit flex-wrap">
        <SubTabButton
          active={activeSubTab === "overview"}
          onClick={() => setActiveSubTab("overview")}
        >
          Overview
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "import"}
          onClick={() => setActiveSubTab("import")}
        >
          Import
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "browse"}
          onClick={() => setActiveSubTab("browse")}
        >
          Browse
        </SubTabButton>
        <SubTabButton
          active={activeSubTab === "activate"}
          onClick={() => setActiveSubTab("activate")}
          badge={bulkStats?.not_activated}
        >
          Activate
        </SubTabButton>
      </div>

      {/* Overview Tab */}
      {activeSubTab === "overview" && (
        <OverviewContent
          dataStats={dataStats}
          wurmpediaStats={wurmpediaStats}
          bulkStats={bulkStats}
          reloading={reloading}
          onReloadExtended={reloadExtendedData}
        />
      )}

      {/* Import Tab */}
      {activeSubTab === "import" && (
        <ImportContent
          wurmpediaStats={wurmpediaStats}
          importLogs={importLogs}
          importing={importing}
          clearing={clearing}
          previewData={previewData}
          fileInputRef={fileInputRef}
          onFileSelect={handleFileSelect}
          onImport={handleImport}
          onClearAll={handleClearAll}
        />
      )}

      {/* Browse Tab */}
      {activeSubTab === "browse" && (
        <BrowseContent
          recipes={recipes}
          totalRecipes={totalRecipes}
          currentPage={currentPage}
          totalPages={totalPages}
          searchTerm={searchTerm}
          selectedSkill={selectedSkill}
          selectedType={selectedType}
          hasMaterials={hasMaterials}
          showActivated={showActivated}
          skills={skills}
          recipeTypes={recipeTypes}
          selectedRecipe={selectedRecipe}
          activating={activating}
          onSearchChange={setSearchTerm}
          onSkillChange={(v) => {
            setSelectedSkill(v);
            setCurrentPage(1);
          }}
          onTypeChange={(v) => {
            setSelectedType(v);
            setCurrentPage(1);
          }}
          onHasMaterialsChange={(v) => {
            setHasMaterials(v);
            setCurrentPage(1);
          }}
          onShowActivatedChange={(v) => {
            setShowActivated(v);
            setCurrentPage(1);
          }}
          onPageChange={setCurrentPage}
          onSelectRecipe={setSelectedRecipe}
          onActivateRecipe={handleActivateRecipe}
          onDeleteRecipe={handleDeleteRecipe}
        />
      )}

      {/* Activate Tab */}
      {activeSubTab === "activate" && (
        <ActivateContent
          bulkStats={bulkStats}
          skills={skills}
          recipeTypes={recipeTypes}
          selectedBulkSkill={selectedBulkSkill}
          selectedBulkType={selectedBulkType}
          bulkActivating={bulkActivating}
          onSkillChange={setSelectedBulkSkill}
          onTypeChange={setSelectedBulkType}
          onBulkActivate={handleBulkActivate}
        />
      )}
    </div>
  );
}

// Sub-components

function SubTabButton({
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

function StatCard({
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

function OverviewContent({
  dataStats,
  wurmpediaStats,
  bulkStats,
  reloading,
  onReloadExtended,
}: {
  dataStats: DataStats | null;
  wurmpediaStats: WurmpediaStats | null;
  bulkStats: BulkActivationStats | null;
  reloading: boolean;
  onReloadExtended: () => void;
}) {
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
        {wurmpediaStats && (
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
        )}
        {!wurmpediaStats || wurmpediaStats.total_recipes === 0 ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4 opacity-20">&#128214;</div>
            <p className="text-text-muted">
              No Wurmpedia recipes imported yet. Go to the Import tab to get started.
            </p>
          </div>
        ) : null}
      </div>

      {/* Activation Progress */}
      {bulkStats && bulkStats.with_materials > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h3 className="text-green-400 text-lg font-semibold mb-4">Activation Progress</h3>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-text-secondary">
                {bulkStats.activated} / {bulkStats.with_materials} recipes activated
              </span>
              <span
                className={`font-bold ${activationPercentage === 100 ? "text-success" : "text-accent"}`}
              >
                {activationPercentage}%
              </span>
            </div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-green-500 rounded-full transition-all duration-500"
                style={{ width: `${activationPercentage}%` }}
              />
            </div>
          </div>

          {bulkStats.not_activated > 0 && (
            <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-amber-400">
                <span className="font-bold">{bulkStats.not_activated}</span> recipes ready to
                activate. Go to the Activate tab for bulk activation.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}

function ImportContent({
  wurmpediaStats,
  importLogs,
  importing,
  clearing,
  previewData,
  fileInputRef,
  onFileSelect,
  onImport,
  onClearAll,
}: {
  wurmpediaStats: WurmpediaStats | null;
  importLogs: WurmpediaImportLog[];
  importing: boolean;
  clearing: boolean;
  previewData: { count: number; sample: Array<{ id: number; name: string }> } | null;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onImport: () => void;
  onClearAll: () => void;
}) {
  return (
    <>
      {/* Import Section */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">Import Wurmpedia Recipes</h2>
        <p className="text-text-secondary mb-4">
          Upload a JSON file exported from Wurmpedia containing recipe data. The import will add
          new recipes and update existing ones (by wurmpedia_id).
        </p>

        <div className="space-y-4">
          {/* File Input */}
          <div className="p-4 bg-white/5 rounded-lg">
            <label className="block text-white font-medium mb-2">Select JSON File</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              onChange={onFileSelect}
              className="block w-full text-sm text-text-secondary
                file:mr-4 file:py-2 file:px-4
                file:rounded-lg file:border-0
                file:text-sm file:font-medium
                file:bg-accent file:text-white
                hover:file:bg-accent-hover
                file:cursor-pointer cursor-pointer"
            />
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
                  <div className="text-text-tertiary">...and {previewData.count - 5} more</div>
                )}
              </div>
              <button
                onClick={onImport}
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

      {/* Import Logs */}
      {importLogs.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h2 className="text-accent text-xl font-semibold mb-4">Recent Imports</h2>
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

      {/* Danger Zone */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-red-400 text-xl font-semibold mb-4">Danger Zone</h2>
        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg">
          <h3 className="font-medium text-white mb-2">Clear All Wurmpedia Recipes</h3>
          <p className="text-text-secondary text-sm mb-3">
            Delete all imported Wurmpedia recipes. This does NOT delete activated calculator items.
            Use this before re-importing to avoid duplicates.
          </p>
          <button
            onClick={onClearAll}
            disabled={clearing || (wurmpediaStats?.total_recipes || 0) === 0}
            className="px-4 py-2 bg-red-600 hover:bg-red-700 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {clearing && <span className="animate-spin">&#9881;</span>}
            {clearing ? "Clearing..." : "Clear All Recipes"}
          </button>
        </div>
      </div>
    </>
  );
}

function BrowseContent({
  recipes,
  totalRecipes,
  currentPage,
  totalPages,
  searchTerm,
  selectedSkill,
  selectedType,
  hasMaterials,
  showActivated,
  skills,
  recipeTypes,
  selectedRecipe,
  activating,
  onSearchChange,
  onSkillChange,
  onTypeChange,
  onHasMaterialsChange,
  onShowActivatedChange,
  onPageChange,
  onSelectRecipe,
  onActivateRecipe,
  onDeleteRecipe,
}: {
  recipes: WurmpediaRecipe[];
  totalRecipes: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  selectedSkill: string;
  selectedType: string;
  hasMaterials: boolean | null;
  showActivated: boolean | null;
  skills: string[];
  recipeTypes: Array<{ value: string; label: string }>;
  selectedRecipe: WurmpediaRecipe | null;
  activating: number | null;
  onSearchChange: (v: string) => void;
  onSkillChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onHasMaterialsChange: (v: boolean | null) => void;
  onShowActivatedChange: (v: boolean | null) => void;
  onPageChange: (v: number) => void;
  onSelectRecipe: (r: WurmpediaRecipe | null) => void;
  onActivateRecipe: (
    r: WurmpediaRecipe,
    m?: Array<{ name: string; quantity: number; optional?: boolean }>
  ) => void;
  onDeleteRecipe: (id: number) => void;
}) {
  return (
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
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
              />
            </div>

            {/* Skill Filter */}
            <select
              value={selectedSkill}
              onChange={(e) => onSkillChange(e.target.value)}
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
              onChange={(e) => onTypeChange(e.target.value)}
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
            <QuickFilterButton
              active={hasMaterials === true}
              onClick={() => onHasMaterialsChange(hasMaterials === true ? null : true)}
            >
              Has Materials
            </QuickFilterButton>
            <QuickFilterButton
              active={showActivated === false}
              onClick={() => onShowActivatedChange(showActivated === false ? null : false)}
              color="amber"
            >
              Not Activated
            </QuickFilterButton>
            <QuickFilterButton
              active={showActivated === true}
              onClick={() => onShowActivatedChange(showActivated === true ? null : true)}
              color="green"
            >
              Activated
            </QuickFilterButton>
            <QuickFilterButton
              active={selectedType === "cooking"}
              onClick={() => onTypeChange(selectedType === "cooking" ? "" : "cooking")}
              color="orange"
            >
              Cooking Only
            </QuickFilterButton>
          </div>
        </div>

        {/* Recipe List */}
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto">
            {recipes.map((recipe) => (
              <RecipeListItem
                key={recipe.id}
                recipe={recipe}
                selected={selectedRecipe?.id === recipe.id}
                activating={activating === recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                onActivate={() => onActivateRecipe(recipe)}
                onDelete={() => onDeleteRecipe(recipe.id)}
              />
            ))}

            {recipes.length === 0 && (
              <div className="p-12 text-center">
                <div className="text-5xl mb-4 opacity-20">&#128214;</div>
                <h3 className="text-lg text-text-secondary mb-2">No Recipes Found</h3>
                <p className="text-text-muted text-sm">
                  {totalRecipes === 0
                    ? "No Wurmpedia recipes have been imported yet."
                    : "Try adjusting your search filters."}
                </p>
              </div>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-text-muted text-sm">{totalRecipes} recipes</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm disabled:opacity-50 hover:border-accent transition-colors"
                >
                  Prev
                </button>
                <span className="text-text-secondary text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
            onActivate={(materials) => onActivateRecipe(selectedRecipe, materials)}
            activating={activating === selectedRecipe.id}
            onDelete={() => onDeleteRecipe(selectedRecipe.id)}
          />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <div className="text-5xl mb-4 opacity-20">&#128270;</div>
            <h3 className="text-lg text-text-secondary mb-2">Select a Recipe</h3>
            <p className="text-text-muted text-sm">
              Click on a recipe to see details and activate it
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivateContent({
  bulkStats,
  skills,
  recipeTypes,
  selectedBulkSkill,
  selectedBulkType,
  bulkActivating,
  onSkillChange,
  onTypeChange,
  onBulkActivate,
}: {
  bulkStats: BulkActivationStats | null;
  skills: string[];
  recipeTypes: Array<{ value: string; label: string }>;
  selectedBulkSkill: string;
  selectedBulkType: string;
  bulkActivating: boolean;
  onSkillChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onBulkActivate: () => void;
}) {
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

  return (
    <>
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
              {bulkStats.not_activated} recipes ready to activate
            </span>
          </div>
          <button
            onClick={onBulkActivate}
            disabled={bulkActivating || bulkStats.not_activated === 0}
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
                  Activate{" "}
                  {selectedBulkSkill || selectedBulkType ? "Filtered" : "All"} Recipes
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* By Skill Breakdown */}
      {bulkStats.by_skill.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h3 className="text-accent text-lg font-semibold mb-4">Progress by Skill</h3>
          <div className="space-y-3">
            {bulkStats.by_skill.map(({ skill, total, activated }) => (
              <div key={skill} className="flex items-center gap-3">
                <span className="text-text-secondary w-32 truncate">{skill}</span>
                <div className="flex-1 h-2 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-accent rounded-full"
                    style={{ width: `${(activated / total) * 100}%` }}
                  />
                </div>
                <span className="text-text-muted text-sm w-16 text-right">
                  {activated}/{total}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By Type Breakdown */}
      {bulkStats.by_type.length > 0 && (
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h3 className="text-accent text-lg font-semibold mb-4">Progress by Type</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {bulkStats.by_type.map(({ recipe_type, total, activated }) => (
              <div key={recipe_type} className="p-3 bg-bg-tertiary rounded-lg">
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
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

// Helper components

function QuickFilterButton({
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

function RecipeListItem({
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

      {/* Activate Button */}
      {recipe.has_materials && !isActivated && (
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
            Add this recipe to the crafting calculator
          </p>
        </div>
      )}

      {isActivated && (
        <div className="p-4">
          <div className="p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-center">
            <span className="text-green-400">&#10003; Already activated</span>
          </div>
        </div>
      )}
    </div>
  );
}
