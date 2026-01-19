"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type {
  WurmpediaRecipe,
  WurmpediaImportResult,
  WurmpediaImportLog,
  WurmpediaStats,
  BulkActivationStats,
} from "@/lib/types";
import type { DataStats } from "../types";

import { SubTabButton, LoadingSpinner } from "./components";
import OverviewContent from "./OverviewContent";
import ImportContent from "./ImportContent";
import BrowseContent from "./BrowseContent";
import ActivateContent from "./ActivateContent";

interface ImportDataTabProps {
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

type SubTab = "overview" | "import" | "browse" | "activate";

export default function ImportDataTab({
  onDataChange,
  showMessage,
}: ImportDataTabProps) {
  const [activeSubTab, setActiveSubTab] = useState<SubTab>("overview");
  const [initialLoading, setInitialLoading] = useState(true);
  const [recipesLoading, setRecipesLoading] = useState(false);

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
  const [bulkProgress, setBulkProgress] = useState<{
    current: number;
    total: number;
    status: string;
  } | null>(null);

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
    setInitialLoading(true);
    try {
      await Promise.all([
        loadDataStats(),
        loadWurmpediaStats(),
        loadImportLogs(),
        loadSkills(),
        loadBulkStats(),
      ]);
    } finally {
      setInitialLoading(false);
    }
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
    setRecipesLoading(true);
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
    } finally {
      setRecipesLoading(false);
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
    // Get count of recipes to activate
    const params = new URLSearchParams({
      has_materials: "true",
      activated: "false",
      limit: "1",
    });
    if (selectedBulkSkill) params.set("skill", selectedBulkSkill);
    if (selectedBulkType) params.set("recipe_type", selectedBulkType);

    const countRes = await fetch(`/api/admin/wurmpedia-recipes?${params}`);
    const countData = await countRes.json();
    const totalToActivate = countData.total || 0;

    if (totalToActivate === 0) {
      showMessage("error", "No recipes to activate with current filters");
      return;
    }

    if (
      !confirm(
        `This will activate ${totalToActivate} recipes. Continue?`
      )
    ) {
      return;
    }

    setBulkActivating(true);
    setBulkProgress({ current: 0, total: totalToActivate, status: "Starting..." });

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
        setBulkProgress({
          current: result.activated,
          total: result.total_processed,
          status: `Completed! ${result.activated} activated, ${result.items_created} items created`,
        });
        showMessage(
          "success",
          `Bulk activation: ${result.activated} activated, ${result.items_created} items created`
        );
        loadAllStats();
        onDataChange();
      } else {
        setBulkProgress(null);
        showMessage("error", result.error || "Bulk activation failed");
      }
    } catch (err) {
      setBulkProgress(null);
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
        loadRecipes();
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

  const handleDeactivateRecipe = async (recipe: WurmpediaRecipe) => {
    if (!confirm(`Deactivate "${recipe.name}"? This will remove the activated_at timestamp but won't delete the calculator item.`)) {
      return;
    }

    setActivating(recipe.id);

    try {
      const res = await fetch("/api/wurmpedia/activate/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage("success", `"${recipe.name}" deactivated`);
        loadBulkStats();
        loadRecipes();
      } else {
        showMessage("error", result.error || "Failed to deactivate recipe");
      }
    } catch (err) {
      showMessage("error", "Failed to deactivate recipe: " + String(err));
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
        initialLoading ? (
          <LoadingSpinner text="Loading data..." />
        ) : (
          <OverviewContent
            dataStats={dataStats}
            wurmpediaStats={wurmpediaStats}
            bulkStats={bulkStats}
            reloading={reloading}
            onReloadExtended={reloadExtendedData}
          />
        )
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
          loading={recipesLoading}
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
          onDeactivateRecipe={handleDeactivateRecipe}
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
          bulkProgress={bulkProgress}
          onSkillChange={setSelectedBulkSkill}
          onTypeChange={setSelectedBulkType}
          onBulkActivate={handleBulkActivate}
          onProgressClose={() => setBulkProgress(null)}
        />
      )}
    </div>
  );
}
