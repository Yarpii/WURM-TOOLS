"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import type { Item } from "@/lib/types";

interface RecipeMaterial {
  id: number;
  item_id: number;
  material_id: number | null;
  material_name: string;
  material_slug: string | null;
  quantity: number;
  unit: string;
  sort_order: number;
}

interface RecipeStep {
  id: number;
  step_order: number;
  action: string;
  target_name: string;
  target_slug: string | null;
  target_quantity: number | null;
  target_unit: string | null;
  submenu_path: string | null;
  raw_text: string | null;
}

interface RecipeTool {
  id: number;
  tool_id: number | null;
  tool_name: string;
  tool_slug: string | null;
  is_workstation: boolean;
}

interface RecipeData {
  materials: RecipeMaterial[];
  steps: RecipeStep[];
  tools: RecipeTool[];
}

/** Format quantity: 12.00 -> "12", 1.50 -> "1.5", 0.20 -> "0.2" */
function formatQty(qty: number | string): string {
  const n = typeof qty === "string" ? parseFloat(qty) : qty;
  if (isNaN(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  return parseFloat(n.toFixed(2)).toString();
}

interface RecipesTabProps {
  items: Item[];
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

const ITEMS_PER_PAGE = 50;

export default function RecipesTab({ items, onDataChange, showMessage }: RecipesTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [filterType, setFilterType] = useState<"all" | "base" | "crafted" | "no-recipe" | "has-recipe">("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [expandedItem, setExpandedItem] = useState<number | null>(null);
  const [recipeData, setRecipeData] = useState<Record<number, RecipeData>>({});
  const [materialCounts, setMaterialCounts] = useState<Record<number, number>>({});
  const [loadingRecipe, setLoadingRecipe] = useState<number | null>(null);

  // Load material counts for all items
  useEffect(() => {
    loadMaterialCounts();
  }, []);

  const loadMaterialCounts = async () => {
    try {
      const res = await fetch("/api/admin/recipe-counts");
      if (res.ok) {
        const data = await res.json();
        const counts: Record<number, number> = {};
        data.forEach((row: { item_id: number; count: number }) => {
          counts[row.item_id] = row.count;
        });
        setMaterialCounts(counts);
      }
    } catch {
      // Counts are optional, fail silently
    }
  };

  const skills = useMemo(() => {
    const skillSet = new Set(items.map(i => i.skill).filter((s): s is string => Boolean(s)));
    return Array.from(skillSet).sort();
  }, [items]);

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkill = !filterSkill || item.skill === filterSkill;

      let matchesType = true;
      if (filterType === "base") matchesType = Boolean(item.is_base_material);
      else if (filterType === "crafted") matchesType = !item.is_base_material;
      else if (filterType === "no-recipe") matchesType = !item.is_base_material && (materialCounts[item.id] || 0) === 0;
      else if (filterType === "has-recipe") matchesType = (materialCounts[item.id] || 0) > 0;

      return matchesSearch && matchesSkill && matchesType;
    });
  }, [items, searchQuery, filterSkill, filterType, materialCounts]);

  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSkill, filterType]);

  const loadRecipeData = useCallback(async (itemId: number) => {
    setLoadingRecipe(itemId);
    try {
      const res = await fetch(`/api/items/${itemId}/recipes`);
      if (res.ok) {
        const data = await res.json();
        setRecipeData(prev => ({ ...prev, [itemId]: {
          materials: data.materials || [],
          steps: data.steps || [],
          tools: data.tools || [],
        }}));
      }
    } catch {
      showMessage("error", "Failed to load recipe data");
    }
    setLoadingRecipe(null);
  }, [showMessage]);

  const toggleExpand = useCallback((itemId: number) => {
    if (expandedItem === itemId) {
      setExpandedItem(null);
    } else {
      setExpandedItem(itemId);
      if (!recipeData[itemId]) {
        loadRecipeData(itemId);
      }
    }
  }, [expandedItem, recipeData, loadRecipeData]);

  const craftedWithoutRecipe = useMemo(() => {
    return items.filter(i => !i.is_base_material && (materialCounts[i.id] || 0) === 0).length;
  }, [items, materialCounts]);

  const totalRecipes = useMemo(() => {
    return Object.values(materialCounts).filter(c => c > 0).length;
  }, [materialCounts]);

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-accent">{items.length}</div>
          <div className="text-sm text-text-secondary">Total Items</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-400">{totalRecipes}</div>
          <div className="text-sm text-text-secondary">Items with Recipes</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-400">{items.filter(i => !i.is_base_material).length}</div>
          <div className="text-sm text-text-secondary">Craftable Items</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-success">{items.filter(i => i.is_base_material).length}</div>
          <div className="text-sm text-text-secondary">Base Materials</div>
        </div>
        <button
          onClick={() => setFilterType("no-recipe")}
          className="bg-bg-secondary border border-border p-4 rounded-xl text-center hover:border-orange-500 transition-colors"
        >
          <div className="text-2xl font-bold text-orange-400">{craftedWithoutRecipe}</div>
          <div className="text-sm text-text-secondary">Missing Recipes</div>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-bg-secondary border border-border p-4 rounded-xl">
        <div className="flex flex-wrap gap-3 items-center">
          <input
            type="text"
            placeholder="Search items..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent w-full md:w-64"
          />

          <select
            value={filterSkill}
            onChange={(e) => setFilterSkill(e.target.value)}
            className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white text-sm"
          >
            <option value="">All Skills</option>
            {skills.map((skill) => (
              <option key={skill} value={skill}>{skill}</option>
            ))}
          </select>

          <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
            {[
              { value: "all", label: "All" },
              { value: "crafted", label: "Crafted" },
              { value: "base", label: "Base" },
              { value: "has-recipe", label: "Has Recipe" },
              { value: "no-recipe", label: "Missing Recipe" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setFilterType(opt.value as typeof filterType)}
                className={`px-3 py-1 rounded text-sm transition-colors whitespace-nowrap ${
                  filterType === opt.value
                    ? opt.value === "no-recipe" ? "bg-orange-500 text-white" : "bg-accent text-white"
                    : "text-text-secondary hover:text-white"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <span className="text-text-secondary text-sm ml-auto">
            {filteredItems.length} items
          </span>
        </div>
      </div>

      {/* Items List with Expandable Recipe Editor */}
      <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
        <div className="max-h-[700px] overflow-y-auto">
          <table className="w-full">
            <thead className="sticky top-0 bg-bg-secondary z-10">
              <tr className="text-left text-text-secondary text-sm border-b border-border">
                <th className="px-4 py-3 w-8"></th>
                <th className="px-4 py-3">Item</th>
                <th className="px-4 py-3">Skill</th>
                <th className="px-4 py-3 text-center">Difficulty</th>
                <th className="px-4 py-3 text-center">Type</th>
                <th className="px-4 py-3 text-center">Ingredients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {paginatedItems.map((item) => (
                <ItemRow
                  key={item.id}
                  item={item}
                  materialCount={materialCounts[item.id] || 0}
                  isExpanded={expandedItem === item.id}
                  isLoading={loadingRecipe === item.id}
                  recipe={recipeData[item.id]}
                  allItems={items}
                  onToggle={() => toggleExpand(item.id)}
                  onRecipeChange={(recipe) => {
                    setRecipeData(prev => ({ ...prev, [item.id]: recipe }));
                    setMaterialCounts(prev => ({ ...prev, [item.id]: recipe.materials.length }));
                  }}
                  showMessage={showMessage}
                />
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-border">
            <div className="text-sm text-text-secondary">
              Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length}
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(1)}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                First
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Prev
              </button>
              <span className="text-text-secondary text-sm">
                Page {currentPage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
              <button
                onClick={() => setCurrentPage(totalPages)}
                disabled={currentPage === totalPages}
                className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Last
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Individual Item Row with expandable recipe editor
function ItemRow({
  item,
  materialCount,
  isExpanded,
  isLoading,
  recipe,
  allItems,
  onToggle,
  onRecipeChange,
  showMessage,
}: {
  item: Item;
  materialCount: number;
  isExpanded: boolean;
  isLoading: boolean;
  recipe: RecipeData | undefined;
  allItems: Item[];
  onToggle: () => void;
  onRecipeChange: (recipe: RecipeData) => void;
  showMessage: (type: "success" | "error", text: string) => void;
}) {
  return (
    <>
      <tr
        className={`hover:bg-white/5 cursor-pointer transition-colors ${isExpanded ? "bg-accent/5" : ""}`}
        onClick={onToggle}
      >
        <td className="px-4 py-3">
          <span className={`text-text-secondary transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`}>
            &#9654;
          </span>
        </td>
        <td className="px-4 py-3">
          <div className="flex items-center gap-2">
            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${item.visible ? "bg-green-500" : "bg-gray-500"}`} />
            <span className="font-medium">{item.name}</span>
          </div>
        </td>
        <td className="px-4 py-3 text-text-secondary text-sm">
          {item.skill || "-"}
        </td>
        <td className="px-4 py-3 text-center text-sm">
          {item.difficulty || "-"}
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={`text-xs px-2 py-0.5 rounded ${
              item.is_base_material ? "bg-success/20 text-success" : "bg-accent/20 text-accent"
            }`}
          >
            {item.is_base_material ? "Base" : "Crafted"}
          </span>
        </td>
        <td className="px-4 py-3 text-center">
          {materialCount > 0 ? (
            <span className="text-xs px-2 py-0.5 rounded bg-green-500/20 text-green-400">
              {materialCount} ingredient{materialCount !== 1 ? "s" : ""}
            </span>
          ) : item.is_base_material ? (
            <span className="text-xs text-text-muted">-</span>
          ) : (
            <span className="text-xs px-2 py-0.5 rounded bg-orange-500/20 text-orange-400">
              No recipe
            </span>
          )}
        </td>
      </tr>
      {isExpanded && (
        <tr>
          <td colSpan={6} className="px-0 py-0">
            <RecipeEditor
              itemId={item.id}
              itemName={item.name}
              itemSkill={item.skill}
              isLoading={isLoading}
              recipe={recipe || { materials: [], steps: [], tools: [] }}
              allItems={allItems}
              onRecipeChange={onRecipeChange}
              showMessage={showMessage}
            />
          </td>
        </tr>
      )}
    </>
  );
}

// Recipe Editor - inline editor for an item's ingredients, steps, and tools
function RecipeEditor({
  itemId,
  itemName,
  itemSkill,
  isLoading,
  recipe,
  allItems,
  onRecipeChange,
  showMessage,
}: {
  itemId: number;
  itemName: string;
  itemSkill?: string | null;
  isLoading: boolean;
  recipe: RecipeData;
  allItems: Item[];
  onRecipeChange: (recipe: RecipeData) => void;
  showMessage: (type: "success" | "error", text: string) => void;
}) {
  const { materials, steps, tools } = recipe;
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [newQuantity, setNewQuantity] = useState("1");
  const [newUnit, setNewUnit] = useState("piece");
  const [editingMaterial, setEditingMaterial] = useState<number | null>(null);
  const [editQuantity, setEditQuantity] = useState("");
  const [editUnit, setEditUnit] = useState("piece");
  const [saving, setSaving] = useState(false);
  const [copySearch, setCopySearch] = useState("");
  const [showCopyResults, setShowCopyResults] = useState(false);
  const [showCopySection, setShowCopySection] = useState(false);
  // Step form
  const [newStepAction, setNewStepAction] = useState("activate");
  const [newStepTarget, setNewStepTarget] = useState("");
  const [newStepSubmenu, setNewStepSubmenu] = useState("");
  // Tool form
  const [newToolSearch, setNewToolSearch] = useState("");
  const [showToolResults, setShowToolResults] = useState(false);
  const [newToolIsWorkstation, setNewToolIsWorkstation] = useState(false);

  const reloadRecipe = async () => {
    const res = await fetch(`/api/items/${itemId}/recipes`);
    if (res.ok) {
      const data = await res.json();
      onRecipeChange({
        materials: data.materials || [],
        steps: data.steps || [],
        tools: data.tools || [],
      });
    }
  };

  const searchResults = useMemo(() => {
    if (!ingredientSearch || ingredientSearch.length < 2) return [];
    const query = ingredientSearch.toLowerCase();
    return allItems
      .filter(i => i.id !== itemId && i.name.toLowerCase().includes(query))
      .slice(0, 15);
  }, [ingredientSearch, allItems, itemId]);

  const copySearchResults = useMemo(() => {
    if (!copySearch || copySearch.length < 2) return [];
    const q = copySearch.toLowerCase();
    return allItems
      .filter(i => i.id !== itemId && !i.is_base_material && i.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [copySearch, allItems, itemId]);

  const toolSearchResults = useMemo(() => {
    if (!newToolSearch || newToolSearch.length < 2) return [];
    const q = newToolSearch.toLowerCase();
    return allItems
      .filter(i => i.name.toLowerCase().includes(q))
      .slice(0, 10);
  }, [newToolSearch, allItems]);

  const copyRecipeFrom = async (sourceItem: Item) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ copy_from: sourceItem.id }),
      });

      if (res.ok) {
        const data = await res.json();
        showMessage("success", `Copied ${data.copied} ingredient${data.copied !== 1 ? "s" : ""} from ${data.source}${data.skipped ? ` (${data.skipped} skipped, already existed)` : ""}`);
        setCopySearch("");
        setShowCopyResults(false);
        setShowCopySection(false);
        await reloadRecipe();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to copy recipe");
      }
    } catch {
      showMessage("error", "Failed to copy recipe");
    }
    setSaving(false);
  };

  const addIngredient = async (materialItem: Item) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/recipes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          material_id: materialItem.id,
          material_name: materialItem.name,
          material_slug: materialItem.slug,
          quantity: parseFloat(newQuantity) || 1,
          unit: newUnit,
        }),
      });

      if (res.ok) {
        showMessage("success", `Added ${materialItem.name} to ${itemName}`);
        setIngredientSearch("");
        setShowSearchResults(false);
        setNewQuantity("1");
        await reloadRecipe();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to add ingredient");
      }
    } catch {
      showMessage("error", "Failed to add ingredient");
    }
    setSaving(false);
  };

  const updateIngredient = async (recipeId: number) => {
    setSaving(true);
    try {
      const res = await fetch(`/api/items/${itemId}/recipes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recipe_id: recipeId,
          quantity: parseFloat(editQuantity) || 1,
          unit: editUnit,
        }),
      });

      if (res.ok) {
        showMessage("success", "Ingredient updated");
        setEditingMaterial(null);
        await reloadRecipe();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to update ingredient");
      }
    } catch {
      showMessage("error", "Failed to update ingredient");
    }
    setSaving(false);
  };

  const removeIngredient = async (recipeId: number, materialName: string) => {
    if (!confirm(`Remove ${materialName} from ${itemName}?`)) return;

    try {
      const res = await fetch(`/api/items/${itemId}/recipes?recipe_id=${recipeId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", `Removed ${materialName}`);
        onRecipeChange({ ...recipe, materials: materials.filter(m => m.id !== recipeId) });
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to remove ingredient");
      }
    } catch {
      showMessage("error", "Failed to remove ingredient");
    }
  };

  if (isLoading) {
    return (
      <div className="bg-bg-tertiary/50 border-t border-b border-accent/20 px-6 py-8 text-center">
        <div className="text-text-secondary animate-pulse">Loading recipe...</div>
      </div>
    );
  }

  return (
    <div className="bg-bg-tertiary/50 border-t border-b border-accent/20 px-6 py-4">
      <div className="max-w-3xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-accent">
            Recipe for {itemName}
          </h3>
          <div className="flex items-center gap-3">
            <span className="text-xs text-text-muted">
              {materials.length} ingredient{materials.length !== 1 ? "s" : ""}
            </span>
            <button
              onClick={() => setShowCopySection(!showCopySection)}
              className={`px-2 py-1 rounded text-xs transition-colors ${
                showCopySection
                  ? "bg-purple-500/30 text-purple-300"
                  : "bg-purple-500/20 text-purple-400 hover:bg-purple-500/30"
              }`}
            >
              Copy from...
            </button>
          </div>
        </div>

        {/* Copy Recipe From Another Item */}
        {showCopySection && (
          <div className="p-3 rounded-lg bg-purple-500/10 border border-purple-500/20 space-y-2">
            <div className="text-xs text-purple-300 font-medium">Copy recipe from another item</div>
            <p className="text-xs text-text-muted">
              Search for a similar item and copy all its ingredients. Duplicates are automatically skipped.
            </p>
            <div className="relative">
              <input
                type="text"
                placeholder="Search for an item to copy from..."
                value={copySearch}
                onChange={(e) => {
                  setCopySearch(e.target.value);
                  setShowCopyResults(true);
                }}
                onFocus={() => setShowCopyResults(true)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
              {showCopyResults && copySearchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bg-secondary border border-purple-500/30 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {copySearchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => copyRecipeFrom(result)}
                      disabled={saving}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-purple-500/20 transition-colors flex items-center justify-between disabled:opacity-50"
                    >
                      <span>{result.name}</span>
                      <span className="text-xs text-text-muted">{result.skill || "Crafted"}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {copySearch.length > 0 && copySearch.length < 2 && (
              <p className="text-xs text-text-muted">Type at least 2 characters to search...</p>
            )}
          </div>
        )}

        {/* Current Ingredients */}
        {materials.length > 0 ? (
          <div className="space-y-1">
            {materials.map((mat) => (
              <div
                key={mat.id}
                className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary group"
              >
                {editingMaterial === mat.id ? (
                  <>
                    <span className="text-sm text-white flex-1">{mat.material_name}</span>
                    <input
                      type="number"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(e.target.value)}
                      min="0.01"
                      step="0.01"
                      className="w-20 px-2 py-1 bg-bg-tertiary border border-border rounded text-sm text-white text-center"
                    />
                    <select
                      value={editUnit}
                      onChange={(e) => setEditUnit(e.target.value)}
                      className="px-2 py-1 bg-bg-tertiary border border-border rounded text-sm text-white"
                    >
                      <option value="piece">piece</option>
                      <option value="kg">kg</option>
                    </select>
                    <button
                      onClick={() => updateIngredient(mat.id)}
                      disabled={saving}
                      className="px-2 py-1 bg-success/20 text-success hover:bg-success/30 rounded text-xs disabled:opacity-50"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => setEditingMaterial(null)}
                      className="px-2 py-1 bg-bg-tertiary border border-border hover:bg-white/10 rounded text-xs"
                    >
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${mat.material_id ? "bg-green-500" : "bg-yellow-500"}`}
                      title={mat.material_id ? "Linked to item" : "Unlinked (name only)"}
                    />
                    <span className="text-sm text-white flex-1">{mat.material_name}</span>
                    <span className="text-sm text-text-secondary">
                      {formatQty(mat.quantity)}x {mat.unit === "kg" ? "kg" : ""}
                    </span>
                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingMaterial(mat.id);
                          setEditQuantity(String(mat.quantity));
                          setEditUnit(mat.unit);
                        }}
                        className="px-2 py-1 bg-accent/20 text-accent hover:bg-accent/30 rounded text-xs"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => removeIngredient(mat.id, mat.material_name)}
                        className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs"
                      >
                        Remove
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-4 text-text-muted text-sm border border-dashed border-border rounded-lg">
            No ingredients defined yet. Add ingredients below.
          </div>
        )}

        {/* Add Ingredient */}
        <div className="border-t border-border/50 pt-4">
          <div className="text-xs text-text-secondary mb-2 font-medium">Add Ingredient</div>
          <div className="flex gap-2 items-start">
            <div className="flex-1 relative">
              <input
                type="text"
                placeholder="Search for an item..."
                value={ingredientSearch}
                onChange={(e) => {
                  setIngredientSearch(e.target.value);
                  setShowSearchResults(true);
                }}
                onFocus={() => setShowSearchResults(true)}
                className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              {showSearchResults && searchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-xl max-h-48 overflow-y-auto">
                  {searchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={() => addIngredient(result)}
                      disabled={saving}
                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-accent/20 transition-colors flex items-center justify-between disabled:opacity-50"
                    >
                      <span>{result.name}</span>
                      <span className="text-xs text-text-muted">
                        {result.is_base_material ? "Base" : result.skill || "Crafted"}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <input
              type="number"
              value={newQuantity}
              onChange={(e) => setNewQuantity(e.target.value)}
              min="0.01"
              step="0.01"
              placeholder="Qty"
              className="w-20 px-2 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-white text-center"
            />
            <select
              value={newUnit}
              onChange={(e) => setNewUnit(e.target.value)}
              className="px-2 py-2 bg-bg-tertiary border border-border rounded-lg text-sm text-white"
            >
              <option value="piece">piece</option>
              <option value="kg">kg</option>
            </select>
          </div>
          {ingredientSearch.length > 0 && ingredientSearch.length < 2 && (
            <p className="text-xs text-text-muted mt-1">Type at least 2 characters to search...</p>
          )}
        </div>

        {/* ========== CREATION STEPS ========== */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-secondary font-medium">Creation Steps</div>
            <span className="text-xs text-text-muted">{steps.length} step{steps.length !== 1 ? "s" : ""}</span>
          </div>

          {steps.length > 0 ? (
            <div className="space-y-1 mb-3">
              {steps.map((step) => (
                <div
                  key={step.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary group"
                >
                  <span className="text-xs font-mono text-text-muted w-5 text-right flex-shrink-0">{step.step_order}.</span>
                  <StepDisplay step={step} />
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/items/${itemId}/recipes?step_id=${step.id}`, { method: "DELETE" });
                      if (res.ok) {
                        onRecipeChange({ ...recipe, steps: steps.filter(s => s.id !== step.id) });
                        showMessage("success", "Step removed");
                      }
                    }}
                    className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-text-muted text-xs border border-dashed border-border rounded-lg mb-3">
              No creation steps defined.
            </div>
          )}

          {/* Add Step */}
          <div className="flex gap-2 items-center">
            <select
              value={newStepAction}
              onChange={(e) => setNewStepAction(e.target.value)}
              className="px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs text-white"
            >
              <option value="activate">Activate</option>
              <option value="right-click">Right-click</option>
              <option value="submenu">Open submenu</option>
              <option value="unknown">Other/Unknown</option>
            </select>
            <input
              type="text"
              value={newStepTarget}
              onChange={(e) => setNewStepTarget(e.target.value)}
              placeholder={newStepAction === "submenu" ? "e.g. Create > Carts" : "e.g. plank, anvil..."}
              className="flex-1 px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs text-white"
            />
            {newStepAction === "submenu" && (
              <input
                type="text"
                value={newStepSubmenu}
                onChange={(e) => setNewStepSubmenu(e.target.value)}
                placeholder="Submenu path"
                className="w-40 px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs text-white"
              />
            )}
            <button
              onClick={async () => {
                if (!newStepTarget.trim()) return;
                setSaving(true);
                const res = await fetch(`/api/items/${itemId}/recipes`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    type: "step",
                    action: newStepAction,
                    target_name: newStepTarget.trim(),
                    submenu_path: newStepAction === "submenu" ? (newStepSubmenu.trim() || newStepTarget.trim()) : null,
                    raw_text: newStepAction === "activate" ? `Activate ${newStepTarget.trim()}`
                      : newStepAction === "right-click" ? `Right-click ${newStepTarget.trim()}`
                      : newStepAction === "submenu" ? `Open submenu "${newStepSubmenu.trim() || newStepTarget.trim()}"`
                      : newStepTarget.trim(),
                  }),
                });
                if (res.ok) {
                  setNewStepTarget("");
                  setNewStepSubmenu("");
                  await reloadRecipe();
                  showMessage("success", "Step added");
                }
                setSaving(false);
              }}
              disabled={saving || !newStepTarget.trim()}
              className="px-3 py-1.5 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg text-xs disabled:opacity-50 flex-shrink-0"
            >
              Add
            </button>
          </div>
        </div>

        {/* ========== TOOLS ========== */}
        <div className="border-t border-border/50 pt-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-xs text-text-secondary font-medium">Required Tools</div>
            <span className="text-xs text-text-muted">{tools.length} tool{tools.length !== 1 ? "s" : ""}</span>
          </div>

          {tools.length > 0 ? (
            <div className="space-y-1 mb-3">
              {tools.map((tool) => (
                <div
                  key={tool.id}
                  className="flex items-center gap-3 p-2 rounded-lg bg-bg-secondary/50 hover:bg-bg-secondary group"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${tool.is_workstation ? "bg-yellow-500" : "bg-blue-500"}`}
                    title={tool.is_workstation ? "Workstation" : "Hand tool"}
                  />
                  <span className="text-sm text-white flex-1">{tool.tool_name}</span>
                  <span className="text-xs text-text-muted">
                    {tool.is_workstation ? "Workstation" : "Tool"}
                  </span>
                  <button
                    onClick={async () => {
                      const res = await fetch(`/api/items/${itemId}/recipes?tool_id=${tool.id}`, { method: "DELETE" });
                      if (res.ok) {
                        onRecipeChange({ ...recipe, tools: tools.filter(t => t.id !== tool.id) });
                        showMessage("success", `Removed ${tool.tool_name}`);
                      }
                    }}
                    className="px-2 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-3 text-text-muted text-xs border border-dashed border-border rounded-lg mb-3">
              No tools defined.
            </div>
          )}

          {/* Add Tool */}
          <div className="flex gap-2 items-center">
            <div className="flex-1 relative">
              <input
                type="text"
                value={newToolSearch}
                onChange={(e) => {
                  setNewToolSearch(e.target.value);
                  setShowToolResults(true);
                }}
                onFocus={() => setShowToolResults(true)}
                placeholder="Search for a tool..."
                className="w-full px-2 py-1.5 bg-bg-tertiary border border-border rounded-lg text-xs text-white"
              />
              {showToolResults && toolSearchResults.length > 0 && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-bg-secondary border border-border rounded-lg shadow-xl max-h-36 overflow-y-auto">
                  {toolSearchResults.map((result) => (
                    <button
                      key={result.id}
                      onClick={async () => {
                        setSaving(true);
                        const res = await fetch(`/api/items/${itemId}/recipes`, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            type: "tool",
                            tool_id: result.id,
                            tool_name: result.name,
                            tool_slug: result.slug,
                            is_workstation: newToolIsWorkstation,
                          }),
                        });
                        if (res.ok) {
                          setNewToolSearch("");
                          setShowToolResults(false);
                          await reloadRecipe();
                          showMessage("success", `Added tool: ${result.name}`);
                        } else {
                          const data = await res.json();
                          showMessage("error", data.error || "Failed to add tool");
                        }
                        setSaving(false);
                      }}
                      disabled={saving}
                      className="w-full text-left px-3 py-1.5 text-xs text-white hover:bg-accent/20 transition-colors disabled:opacity-50"
                    >
                      {result.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <label className="flex items-center gap-1 text-xs text-text-secondary cursor-pointer select-none">
              <input
                type="checkbox"
                checked={newToolIsWorkstation}
                onChange={(e) => setNewToolIsWorkstation(e.target.checked)}
                className="rounded"
              />
              Workstation
            </label>
          </div>
        </div>

        {/* ========== SKILL INFO ========== */}
        {itemSkill && (
          <div className="border-t border-border/50 pt-3">
            <div className="text-xs text-text-muted">
              Uses <span className="text-accent font-medium">{itemSkill}</span> skill
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

/** Display a creation step in human-readable format */
function StepDisplay({ step }: { step: RecipeStep }) {
  let text = "";
  let colorClass = "text-text-secondary";

  switch (step.action) {
    case "activate":
      text = `Activate ${step.target_name}`;
      colorClass = "text-green-400";
      if (step.target_quantity) text += ` (${formatQty(step.target_quantity)} ${step.target_unit || "kg"})`;
      break;
    case "right-click":
      text = `Right-click ${step.target_name}`;
      colorClass = "text-blue-400";
      if (step.target_quantity) text += ` (${formatQty(step.target_quantity)} ${step.target_unit || "kg"})`;
      break;
    case "submenu":
      text = `Open submenu "${step.submenu_path || step.target_name}"`;
      colorClass = "text-yellow-400";
      break;
    default:
      text = step.raw_text || step.target_name;
      colorClass = "text-text-muted";
  }

  return <span className={`text-sm flex-1 ${colorClass}`}>{text}</span>;
}
