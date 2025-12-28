"use client";

import { useState, useEffect, useRef } from "react";
import AdminGuard from "@/components/AdminGuard";

interface Stats {
  items: number;
  recipes: number;
  base_materials: number;
  craftable: number;
  categories: number;
}

interface ScrapedItem {
  name: string;
  category: string;
  isBaseMaterial: boolean;
  description: string;
  ingredients: Array<{ name: string; quantity: number }>;
}

interface ScrapeResult {
  success: boolean;
  items_found: number;
  items_added: number;
  items_skipped: number;
  recipes_added: number;
  recipes_skipped: number;
  errors: string[];
  scraped_items: ScrapedItem[];
}

interface WikiCategory {
  key: string;
  name: string;
  dbCategory: string;
}

interface CsvPreviewItem {
  name: string;
  category: string;
  is_base_material: boolean;
  description: string;
}

interface CsvPreviewRecipe {
  result: string;
  ingredient: string;
  quantity: number;
}

interface CsvPreviewResult<T> {
  valid: T[];
  invalid: Array<{ row: number; data: string[]; error: string }>;
  duplicates: T[];
}

type TabType = "export" | "import" | "csv" | "scraper";

function DataContent() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<TabType>("export");
  const [message, setMessage] = useState<{
    type: "success" | "error" | "info";
    text: string;
  } | null>(null);

  // JSON Import state
  const [importPreview, setImportPreview] = useState<{
    items: number;
    recipes: number;
    data: object;
  } | null>(null);
  const [replaceData, setReplaceData] = useState(false);
  const jsonFileInputRef = useRef<HTMLInputElement>(null);

  // CSV Import state
  const [csvType, setCsvType] = useState<"items" | "recipes">("items");
  const [csvPreview, setCsvPreview] = useState<CsvPreviewResult<
    CsvPreviewItem | CsvPreviewRecipe
  > | null>(null);
  const csvFileInputRef = useRef<HTMLInputElement>(null);

  // Scraper state
  const [wikiCategories, setWikiCategories] = useState<WikiCategory[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [maxItems, setMaxItems] = useState(10);
  const [scrapePreview, setScrapePreview] = useState<ScrapeResult | null>(null);
  const [isScraping, setIsScraping] = useState(false);

  useEffect(() => {
    loadStats();
    loadWikiCategories();
  }, []);

  const loadStats = async () => {
    const res = await fetch("/api/data?action=stats");
    const data = await res.json();
    setStats(data);
  };

  const loadWikiCategories = async () => {
    try {
      const res = await fetch("/api/scraper?action=categories");
      const data = await res.json();
      setWikiCategories(data.categories || []);
      if (data.categories?.length > 0) {
        setSelectedCategory(data.categories[0].key);
      }
    } catch {
      // Scraper not available
    }
  };

  const showMessage = (type: "success" | "error" | "info", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  // ========== EXPORT ==========
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

  // ========== JSON IMPORT ==========
  const handleJsonFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const data = JSON.parse(content);

        if (!data.items || !Array.isArray(data.items)) {
          throw new Error("Invalid file: missing 'items' array");
        }
        if (!data.recipes || !Array.isArray(data.recipes)) {
          throw new Error("Invalid file: missing 'recipes' array");
        }

        setImportPreview({
          items: data.items.length,
          recipes: data.recipes.length,
          data,
        });
      } catch (error) {
        showMessage("error", "Invalid JSON file: " + String(error));
        setImportPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleJsonImport = async () => {
    if (!importPreview) return;

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "import",
          data: importPreview.data,
          replace: replaceData,
        }),
      });

      const result = await res.json();

      if (res.ok) {
        showMessage(
          "success",
          `Imported ${result.items_added} items and ${result.recipes_added} recipes! (${result.items_skipped} items, ${result.recipes_skipped} recipes skipped)`
        );
        setImportPreview(null);
        setReplaceData(false);
        if (jsonFileInputRef.current) {
          jsonFileInputRef.current.value = "";
        }
        loadStats();
      } else {
        showMessage("error", result.error || "Import failed");
      }
    } catch (error) {
      showMessage("error", "Import failed: " + String(error));
    }
  };

  // ========== CSV IMPORT ==========
  const handleCsvFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const content = event.target?.result as string;

        const res = await fetch("/api/data", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "csv-preview",
            csvContent: content,
            csvType,
          }),
        });

        const result = await res.json();
        if (res.ok) {
          setCsvPreview(result);
        } else {
          showMessage("error", result.error || "Failed to parse CSV");
          setCsvPreview(null);
        }
      } catch (error) {
        showMessage("error", "Failed to parse CSV: " + String(error));
        setCsvPreview(null);
      }
    };
    reader.readAsText(file);
  };

  const handleCsvImport = async () => {
    if (!csvPreview || csvPreview.valid.length === 0) return;

    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "csv-import",
          csvType,
          items: csvType === "items" ? csvPreview.valid : undefined,
          recipes: csvType === "recipes" ? csvPreview.valid : undefined,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(
          "success",
          `Imported ${result.added} ${csvType}!${result.errors.length > 0 ? ` (${result.errors.length} errors)` : ""}`
        );
        setCsvPreview(null);
        if (csvFileInputRef.current) {
          csvFileInputRef.current.value = "";
        }
        loadStats();
      } else {
        showMessage("error", result.error || "Import failed");
      }
    } catch (error) {
      showMessage("error", "Import failed: " + String(error));
    }
  };

  // ========== WIKI SCRAPER ==========
  const handleScrapePreview = async () => {
    if (!selectedCategory) return;

    setIsScraping(true);
    setScrapePreview(null);

    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scrape",
          category: selectedCategory,
          maxItems,
          preview: true,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        setScrapePreview(result);
      } else {
        showMessage("error", result.error || "Scraping failed");
      }
    } catch (error) {
      showMessage("error", "Scraping failed: " + String(error));
    } finally {
      setIsScraping(false);
    }
  };

  const handleScrapeImport = async () => {
    if (!selectedCategory) return;

    setIsScraping(true);

    try {
      const res = await fetch("/api/scraper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "scrape",
          category: selectedCategory,
          maxItems,
          preview: false,
        }),
      });

      const result = await res.json();
      if (res.ok) {
        showMessage(
          "success",
          `Scraped ${result.items_found} items! Added ${result.items_added} items, ${result.recipes_added} recipes.`
        );
        setScrapePreview(null);
        loadStats();
      } else {
        showMessage("error", result.error || "Scraping failed");
      }
    } catch (error) {
      showMessage("error", "Scraping failed: " + String(error));
    } finally {
      setIsScraping(false);
    }
  };

  // ========== CLEAR DATA ==========
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

  const tabs: { key: TabType; label: string; icon: React.ReactNode }[] = [
    {
      key: "export",
      label: "Export",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
      ),
    },
    {
      key: "import",
      label: "Import JSON",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
        </svg>
      ),
    },
    {
      key: "csv",
      label: "CSV Import",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      ),
    },
    {
      key: "scraper",
      label: "Wiki Scraper",
      icon: (
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
    },
  ];

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Data Management</h1>
        <p className="text-text-secondary">
          Import, export, and manage your crafting knowledge
        </p>
      </div>

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
        <div className="bg-bg-secondary p-6 rounded-xl border border-border mb-6">
          <h2 className="text-text-primary text-xl font-semibold mb-4">
            Database Statistics
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center p-4 bg-bg-tertiary rounded-lg border border-border">
              <div className="text-3xl font-bold text-text-primary">{stats.items}</div>
              <div className="text-text-muted text-sm">Total Items</div>
            </div>
            <div className="text-center p-4 bg-bg-tertiary rounded-lg border border-border">
              <div className="text-3xl font-bold text-success">
                {stats.base_materials}
              </div>
              <div className="text-text-muted text-sm">Base Materials</div>
            </div>
            <div className="text-center p-4 bg-bg-tertiary rounded-lg border border-border">
              <div className="text-3xl font-bold text-accent">
                {stats.craftable}
              </div>
              <div className="text-text-muted text-sm">Craftable</div>
            </div>
            <div className="text-center p-4 bg-bg-tertiary rounded-lg border border-border">
              <div className="text-3xl font-bold text-text-primary">
                {stats.recipes}
              </div>
              <div className="text-text-muted text-sm">Recipe Links</div>
            </div>
            <div className="text-center p-4 bg-bg-tertiary rounded-lg border border-border">
              <div className="text-3xl font-bold text-text-primary">
                {stats.categories}
              </div>
              <div className="text-text-muted text-sm">Categories</div>
            </div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === tab.key
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:text-text-primary hover:bg-bg-hover border border-border"
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="bg-bg-secondary p-6 rounded-xl border border-border">
        {/* Export Tab */}
        {activeTab === "export" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Export Data</h2>
            <p className="text-text-secondary mb-6">
              Download all items and recipes as a JSON file for backup or transfer.
            </p>
            <button
              onClick={handleExport}
              className="px-6 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
            >
              Download JSON Backup
            </button>

            <div className="mt-8 p-4 bg-white/5 rounded-lg">
              <h3 className="text-lg font-semibold mb-3">JSON Format Reference</h3>
              <pre className="text-sm text-text-secondary overflow-x-auto">
{`{
  "version": "1.0",
  "exported_at": "2024-01-01T12:00:00Z",
  "items": [
    { "name": "Iron Ore", "category": "ore", "is_base_material": true, "description": "..." }
  ],
  "recipes": [
    { "result": "Iron Lump", "ingredient": "Iron Ore", "quantity": 1 }
  ]
}`}
              </pre>
            </div>
          </div>
        )}

        {/* Import JSON Tab */}
        {activeTab === "import" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Import JSON</h2>
            <p className="text-text-secondary mb-6">
              Import items and recipes from a JSON backup file.
            </p>

            <div className="space-y-4">
              <input
                ref={jsonFileInputRef}
                type="file"
                accept=".json"
                onChange={handleJsonFileSelect}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-accent file:text-white file:cursor-pointer"
              />

              {importPreview && (
                <div className="p-4 bg-white/5 rounded-lg space-y-3">
                  <h3 className="font-semibold text-accent">Preview</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded">
                      <div className="text-2xl font-bold">{importPreview.items}</div>
                      <div className="text-text-secondary text-sm">Items</div>
                    </div>
                    <div className="text-center p-3 bg-white/5 rounded">
                      <div className="text-2xl font-bold">{importPreview.recipes}</div>
                      <div className="text-text-secondary text-sm">Recipes</div>
                    </div>
                  </div>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={replaceData}
                      onChange={(e) => setReplaceData(e.target.checked)}
                      className="rounded"
                    />
                    <span className="text-text-secondary">
                      Replace existing data (clear before import)
                    </span>
                  </label>

                  <button
                    onClick={handleJsonImport}
                    className="w-full px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
                  >
                    Import Data
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* CSV Import Tab */}
        {activeTab === "csv" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">CSV Import</h2>
            <p className="text-text-secondary mb-6">
              Bulk import items or recipes from a CSV file.
            </p>

            <div className="space-y-4">
              {/* CSV Type Selection */}
              <div className="flex gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="csvType"
                    checked={csvType === "items"}
                    onChange={() => {
                      setCsvType("items");
                      setCsvPreview(null);
                      if (csvFileInputRef.current) csvFileInputRef.current.value = "";
                    }}
                    className="accent-accent"
                  />
                  <span>Items</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="csvType"
                    checked={csvType === "recipes"}
                    onChange={() => {
                      setCsvType("recipes");
                      setCsvPreview(null);
                      if (csvFileInputRef.current) csvFileInputRef.current.value = "";
                    }}
                    className="accent-accent"
                  />
                  <span>Recipes</span>
                </label>
              </div>

              <input
                ref={csvFileInputRef}
                type="file"
                accept=".csv"
                onChange={handleCsvFileSelect}
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:bg-accent file:text-white file:cursor-pointer"
              />

              {/* CSV Format Help */}
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-semibold mb-2">
                  {csvType === "items" ? "Items CSV Format" : "Recipes CSV Format"}
                </h3>
                {csvType === "items" ? (
                  <pre className="text-sm text-text-secondary">
{`name,category,is_base_material,description
Iron Ore,ore,true,Mined from rock
Plank,wood,false,Sawn from logs`}
                  </pre>
                ) : (
                  <pre className="text-sm text-text-secondary">
{`result,ingredient,quantity
Iron Lump,Iron Ore,1
Plank,Log,1`}
                  </pre>
                )}
              </div>

              {/* CSV Preview */}
              {csvPreview && (
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-success/20 rounded">
                      <div className="text-2xl font-bold text-success">
                        {csvPreview.valid.length}
                      </div>
                      <div className="text-text-secondary text-sm">Valid</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-500/20 rounded">
                      <div className="text-2xl font-bold text-yellow-400">
                        {csvPreview.duplicates.length}
                      </div>
                      <div className="text-text-secondary text-sm">Duplicates</div>
                    </div>
                    <div className="text-center p-3 bg-red-500/20 rounded">
                      <div className="text-2xl font-bold text-red-400">
                        {csvPreview.invalid.length}
                      </div>
                      <div className="text-text-secondary text-sm">Invalid</div>
                    </div>
                  </div>

                  {/* Valid Items Preview */}
                  {csvPreview.valid.length > 0 && (
                    <div className="p-4 bg-success/10 rounded-lg">
                      <h4 className="font-semibold text-success mb-2">
                        Will be imported ({csvPreview.valid.length})
                      </h4>
                      <div className="max-h-40 overflow-auto">
                        <table className="w-full text-sm">
                          <tbody>
                            {csvPreview.valid.slice(0, 10).map((item, i) => (
                              <tr key={i} className="border-b border-white/10">
                                <td className="py-1">
                                  {"name" in item ? item.name : `${(item as CsvPreviewRecipe).result} <- ${(item as CsvPreviewRecipe).ingredient}`}
                                </td>
                              </tr>
                            ))}
                            {csvPreview.valid.length > 10 && (
                              <tr>
                                <td className="py-1 text-text-secondary">
                                  ... and {csvPreview.valid.length - 10} more
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Invalid Items */}
                  {csvPreview.invalid.length > 0 && (
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">
                        Errors ({csvPreview.invalid.length})
                      </h4>
                      <div className="max-h-40 overflow-auto text-sm">
                        {csvPreview.invalid.slice(0, 5).map((item, i) => (
                          <div key={i} className="py-1 border-b border-white/10">
                            <span className="text-text-secondary">Row {item.row}:</span>{" "}
                            {item.error}
                          </div>
                        ))}
                        {csvPreview.invalid.length > 5 && (
                          <div className="py-1 text-text-secondary">
                            ... and {csvPreview.invalid.length - 5} more errors
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {csvPreview.valid.length > 0 && (
                    <button
                      onClick={handleCsvImport}
                      className="w-full px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
                    >
                      Import {csvPreview.valid.length} {csvType}
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Wiki Scraper Tab */}
        {activeTab === "scraper" && (
          <div>
            <h2 className="text-xl font-semibold mb-4">Wurmpedia Scraper</h2>
            <p className="text-text-secondary mb-6">
              Scrape items and recipes from the official Wurm Online Wiki.
            </p>

            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">Category</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white"
                  >
                    {wikiCategories.map((cat) => (
                      <option key={cat.key} value={cat.key}>
                        {cat.name} ({cat.dbCategory})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Max Items to Scrape
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={50}
                    value={maxItems}
                    onChange={(e) => setMaxItems(parseInt(e.target.value) || 10)}
                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white"
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={handleScrapePreview}
                  disabled={isScraping || !selectedCategory}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isScraping || !selectedCategory
                      ? "bg-gray-600 cursor-not-allowed text-text-secondary"
                      : "bg-white/10 hover:bg-white/20 text-white"
                  }`}
                >
                  {isScraping ? "Scraping..." : "Preview"}
                </button>
                <button
                  onClick={handleScrapeImport}
                  disabled={isScraping || !selectedCategory}
                  className={`flex-1 px-4 py-3 rounded-lg font-medium transition-colors ${
                    isScraping || !selectedCategory
                      ? "bg-gray-600 cursor-not-allowed text-text-secondary"
                      : "bg-accent hover:bg-accent-hover text-white"
                  }`}
                >
                  {isScraping ? "Scraping..." : "Scrape & Import"}
                </button>
              </div>

              {/* Scrape Preview */}
              {scrapePreview && (
                <div className="space-y-4 mt-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-white/5 rounded">
                      <div className="text-2xl font-bold">{scrapePreview.items_found}</div>
                      <div className="text-text-secondary text-sm">Found</div>
                    </div>
                    <div className="text-center p-3 bg-success/20 rounded">
                      <div className="text-2xl font-bold text-success">
                        {scrapePreview.items_added}
                      </div>
                      <div className="text-text-secondary text-sm">Items Added</div>
                    </div>
                    <div className="text-center p-3 bg-accent/20 rounded">
                      <div className="text-2xl font-bold text-accent">
                        {scrapePreview.recipes_added}
                      </div>
                      <div className="text-text-secondary text-sm">Recipes Added</div>
                    </div>
                    <div className="text-center p-3 bg-yellow-500/20 rounded">
                      <div className="text-2xl font-bold text-yellow-400">
                        {scrapePreview.items_skipped}
                      </div>
                      <div className="text-text-secondary text-sm">Skipped</div>
                    </div>
                  </div>

                  {/* Scraped Items */}
                  {scrapePreview.scraped_items.length > 0 && (
                    <div className="p-4 bg-white/5 rounded-lg">
                      <h4 className="font-semibold mb-3">Scraped Items</h4>
                      <div className="max-h-60 overflow-auto space-y-2">
                        {scrapePreview.scraped_items.map((item, i) => (
                          <div
                            key={i}
                            className="p-3 bg-white/5 rounded border-l-4 border-accent"
                          >
                            <div className="font-semibold">{item.name}</div>
                            <div className="text-sm text-text-secondary">
                              {item.category} | {item.isBaseMaterial ? "Base Material" : "Craftable"}
                            </div>
                            {item.ingredients.length > 0 && (
                              <div className="text-sm mt-1 text-text-secondary">
                                Ingredients: {item.ingredients.map(i => `${i.quantity}x ${i.name}`).join(", ")}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Errors */}
                  {scrapePreview.errors.length > 0 && (
                    <div className="p-4 bg-red-500/10 rounded-lg">
                      <h4 className="font-semibold text-red-400 mb-2">
                        Errors ({scrapePreview.errors.length})
                      </h4>
                      <div className="max-h-32 overflow-auto text-sm">
                        {scrapePreview.errors.slice(0, 10).map((error, i) => (
                          <div key={i} className="py-1">{error}</div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              <div className="p-4 bg-yellow-500/10 rounded-lg text-sm">
                <p className="text-yellow-300 font-semibold mb-1">Note</p>
                <p className="text-text-secondary">
                  The scraper parses wiki pages which may have varying formats.
                  Recipe detection works best on pages with standard creation sections.
                  Review scraped data before importing.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Danger Zone */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl mt-6 border border-red-500/30">
        <h2 className="text-red-400 text-xl font-semibold mb-4 flex items-center gap-2">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Danger Zone
        </h2>
        <p className="text-text-secondary mb-4">
          Permanently delete all data from the database. This action cannot be undone!
        </p>
        <button
          onClick={handleClearAll}
          className="px-6 py-3 bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/50 rounded-lg font-medium transition-colors"
        >
          Clear All Data
        </button>
      </div>
    </div>
  );
}

export default function DataPage() {
  return (
    <AdminGuard>
      <DataContent />
    </AdminGuard>
  );
}
