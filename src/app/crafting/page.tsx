"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { Item, CraftingNode, MaterialResult } from "@/lib/types";

type Tab = "calculator" | "advanced" | "optimizer";
type CalcMode = "calculate" | "reverse";
type MaterialMode = "easy" | "full"; // easy = recipe ingredients, full = all base materials
type ViewMode = "expected" | "base" | "worstCase";

interface AdvancedMaterialResult extends MaterialResult {
  expectedQuantity: number;
  expectedFormatted: string;
  worstCaseQuantity: number;
  worstCaseFormatted: string;
}

interface CraftingPrediction {
  successChance: number;
  successLabel: string;
  averageQL: number;
  minQL: number;
  maxQL: number;
  totalTimeFormatted: string;
  timePerItem: number;
  failureRate: number;
  wasteMultiplier: number;
  repairsNeeded: number;
  totalSkillGain: number;
  newSkillLevel: number;
  actionsToNextLevel: number;
  isOptimalDifficulty: boolean;
}

interface AdvancedResult {
  item: Item;
  quantity: number;
  baseMaterials: AdvancedMaterialResult[];
  expectedMaterials: AdvancedMaterialResult[];
  prediction: CraftingPrediction;
  skillPath?: SkillGrindStep[];
}

interface SkillGrindStep {
  skillFrom: number;
  skillTo: number;
  targetQL: number;
  actionsNeeded: number;
  successRate: number;
  description: string;
  materialsNeeded: number;
  timeEstimate: string;
}

interface SkillMetrics {
  effectiveSkill: number;
  maxCreationQL: number;
  sweetSpotQL: number;
  sweetSpotRange: { min: number; max: number };
}

interface OptimalItem {
  id: number;
  name: string;
  category: string;
  difficulty: number;
  successChance: number;
  isInSweetSpot: boolean;
}

interface SkillPathStep {
  from: number;
  to: number;
  targetQL: number;
  actionsNeeded: number;
  successRate: number;
  description: string;
}

interface OptimizerResult {
  currentSkill: number;
  targetSkill: number;
  metrics: SkillMetrics;
  optimalItems: OptimalItem[];
  skillPath: SkillPathStep[];
  summary: {
    totalActions: number;
    totalTime: string;
    skillGain: number;
  };
}

export default function CraftingPage() {
  const [activeTab, setActiveTab] = useState<Tab>("calculator");

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-text-primary mb-2">Crafting</h1>
          <p className="text-text-secondary">
            Calculate materials, predict outcomes, and optimize your skill training
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 bg-bg-secondary p-1 rounded-lg border border-border w-fit">
          {[
            { id: "calculator" as Tab, label: "Calculator" },
            { id: "advanced" as Tab, label: "Advanced" },
            { id: "optimizer" as Tab, label: "Optimizer" },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        {activeTab === "calculator" && <BasicCalculator />}
        {activeTab === "advanced" && <AdvancedCalculator />}
        {activeTab === "optimizer" && <SkillOptimizer />}
      </div>
    </div>
  );
}

// ============================================
// BASIC CALCULATOR TAB
// ============================================
function BasicCalculator() {
  const [mode, setMode] = useState<CalcMode>("calculate");
  const [materialMode, setMaterialMode] = useState<MaterialMode>("easy"); // easy = recipe, full = all base
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [materials, setMaterials] = useState<MaterialResult[]>([]);
  const [tree, setTree] = useState<CraftingNode | null>(null);
  const [craftable, setCraftable] = useState<{ id: number; name: string; category: string; formatted: string }[]>([]);
  const [includeIndirect, setIncludeIndirect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/items").then((r) => r.json()).then(setItems);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter((item) => {
    const matchesQuery = item.name.toLowerCase().includes(query.toLowerCase());
    if (mode === "calculate") return matchesQuery && !item.is_base_material;
    return matchesQuery;
  });

  const handleSelect = (item: Item) => {
    setSelectedItem(item);
    setQuery(item.name);
    setShowDropdown(false);
    doAction(item);
  };

  const doAction = async (item: Item = selectedItem!, matMode: MaterialMode = materialMode) => {
    if (!item) return;
    setIsLoading(true);
    try {
      if (mode === "calculate") {
        const res = await fetch(`/api/calculate?item=${item.id}&qty=${quantity}&mode=${matMode}`);
        const data = await res.json();
        setMaterials(data.materials || []);
        setTree(data.tree || null);
      } else {
        const res = await fetch(`/api/reverse?item=${item.id}&all=${includeIndirect ? "1" : "0"}`);
        const data = await res.json();
        setCraftable(data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedItem && mode === "reverse") doAction();
  }, [includeIndirect]);

  useEffect(() => {
    if (selectedItem && mode === "calculate") doAction();
  }, [quantity]);

  useEffect(() => {
    if (selectedItem && mode === "calculate") doAction(selectedItem, materialMode);
  }, [materialMode]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showDropdown || filteredItems.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((i) => Math.min(i + 1, filteredItems.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (selectedIndex >= 0) handleSelect(filteredItems[selectedIndex]);
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const renderTree = (node: CraftingNode): React.ReactNode => (
    <div key={`${node.id}-${node.depth}`} className="relative">
      <div className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-bg-hover transition-colors ${node.is_base ? "text-success" : "text-text-primary"}`}>
        <span className={`category-dot category-${node.category}`} />
        <span className="font-medium">{node.name}</span>
        <span className="text-text-muted text-sm ml-auto">
          x{node.quantity % 1 === 0 ? node.quantity : node.quantity.toFixed(2)}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="pl-6 border-l border-border ml-3">
          {node.children.map(renderTree)}
        </div>
      )}
    </div>
  );

  const materialsByCategory = materials.reduce((acc, mat) => {
    if (!acc[mat.category]) acc[mat.category] = [];
    acc[mat.category].push(mat);
    return acc;
  }, {} as Record<string, MaterialResult[]>);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column */}
      <div className="space-y-4">
        {/* Mode Toggle */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <div className="flex gap-1 bg-bg-tertiary p-1 rounded-lg">
            {[
              { value: "calculate" as CalcMode, label: "Calculate" },
              { value: "reverse" as CalcMode, label: "Reverse" },
            ].map((m) => (
              <button
                key={m.value}
                onClick={() => {
                  setMode(m.value);
                  setQuery("");
                  setSelectedItem(null);
                  setMaterials([]);
                  setTree(null);
                  setCraftable([]);
                }}
                className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                  mode === m.value ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>
        </div>

        {/* Search */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <label className="block text-sm font-medium text-text-primary mb-2">Search Item</label>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowDropdown(true); setSelectedIndex(-1); }}
              onFocus={() => setShowDropdown(true)}
              onKeyDown={handleKeyDown}
              placeholder={mode === "calculate" ? "Search craftable items..." : "Search any item..."}
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
            />
            {showDropdown && query && filteredItems.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary rounded-lg border border-border shadow-xl z-50 max-h-60 overflow-y-auto">
                {filteredItems.slice(0, 10).map((item, index) => (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item)}
                    className={`w-full px-4 py-2.5 text-left flex items-center gap-3 transition-colors border-b border-border last:border-0 ${
                      index === selectedIndex ? "bg-accent/10 text-accent" : "hover:bg-bg-hover text-text-primary"
                    }`}
                  >
                    <span className={`category-dot category-${item.category}`} />
                    <span className="flex-1 truncate">{item.name}</span>
                    <span className="text-xs text-text-muted capitalize">{item.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {mode === "calculate" && (
            <>
              <div className="mt-4">
                <label className="block text-sm text-text-secondary mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary text-center border border-border focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(1000, quantity + 1))}
                    className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary hover:border-accent transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>

              {/* Material Mode Toggle */}
              <div className="mt-4">
                <label className="block text-sm text-text-secondary mb-2">Show Materials</label>
                <div className="flex gap-1 bg-bg-tertiary p-1 rounded-lg">
                  <button
                    onClick={() => setMaterialMode("easy")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      materialMode === "easy" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    Recipe
                  </button>
                  <button
                    onClick={() => setMaterialMode("full")}
                    className={`flex-1 py-2 rounded-md text-sm font-medium transition-colors ${
                      materialMode === "full" ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                    }`}
                  >
                    All Base
                  </button>
                </div>
                <p className="text-xs text-text-muted mt-2">
                  {materialMode === "easy"
                    ? "Shows direct ingredients (like in-game recipe)"
                    : "Shows all raw materials needed"}
                </p>
              </div>
            </>
          )}

          {mode === "reverse" && (
            <label className="flex items-center gap-3 mt-4 cursor-pointer">
              <input
                type="checkbox"
                checked={includeIndirect}
                onChange={(e) => setIncludeIndirect(e.target.checked)}
                className="w-5 h-5 rounded border-border bg-bg-tertiary accent-accent"
              />
              <span className="text-sm text-text-secondary">Include indirect uses</span>
            </label>
          )}
        </div>

        {/* Item Info - Show crafting details when item is selected */}
        {selectedItem && mode === "calculate" && (
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Item Info</h3>

            {/* Warning if difficulty is unknown */}
            {!selectedItem.difficulty && (
              <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-lg">
                <p className="text-xs text-warning flex items-center gap-2">
                  <span>⚠</span>
                  <span>Difficulty unknown - using estimated values</span>
                </p>
              </div>
            )}

            <div className="space-y-2 text-sm">
              <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Difficulty</span>
                <span className={`font-semibold ${selectedItem.difficulty ? 'text-text-primary' : 'text-text-muted italic'}`}>
                  {selectedItem.difficulty ?? 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Skill Type</span>
                <span className={`font-semibold capitalize ${selectedItem.skill_type ? 'text-text-primary' : 'text-text-muted italic'}`}>
                  {selectedItem.skill_type?.replace(/_/g, ' ') ?? 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Base Time</span>
                <span className={`font-semibold ${selectedItem.base_time ? 'text-text-primary' : 'text-text-muted italic'}`}>
                  {selectedItem.base_time ? `${selectedItem.base_time}s` : 'Unknown'}
                </span>
              </div>
              <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Tool</span>
                <span className={`font-semibold capitalize ${selectedItem.tool_type ? 'text-text-primary' : 'text-text-muted italic'}`}>
                  {selectedItem.tool_type?.replace(/_/g, ' ') ?? 'Unknown'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Summary */}
        {selectedItem && mode === "calculate" && materials.length > 0 && (
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Summary</h3>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-accent">{materials.length}</div>
                <div className="text-xs text-text-muted">Materials</div>
              </div>
              <div className="bg-bg-tertiary rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-accent">
                  {materials.reduce((sum, m) => sum + m.quantity, 0).toFixed(0)}
                </div>
                <div className="text-xs text-text-muted">Total Items</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Right Column - Results */}
      <div className="lg:col-span-2 space-y-4">
        {isLoading && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 flex items-center justify-center">
            <div className="animate-spin text-4xl">⚙</div>
          </div>
        )}

        {!isLoading && !selectedItem && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4 opacity-20">🔍</div>
            <h3 className="text-lg text-text-secondary mb-2">Select an Item</h3>
            <p className="text-text-muted text-sm">
              {mode === "calculate"
                ? "Choose an item to calculate its material requirements"
                : "Choose a material to see what can be crafted from it"}
            </p>
          </div>
        )}

        {!isLoading && mode === "calculate" && selectedItem && materials.length > 0 && (
          <>
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-text-primary">
                  {materialMode === "easy" ? "Recipe" : "Base Materials"} for {quantity}x {selectedItem.name}
                </h3>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  materialMode === "easy"
                    ? "bg-accent/20 text-accent"
                    : "bg-success/20 text-success"
                }`}>
                  {materialMode === "easy" ? "Direct Ingredients" : "All Raw Materials"}
                </span>
              </div>
              <div className="space-y-4">
                {Object.entries(materialsByCategory).map(([category, mats]) => (
                  <div key={category}>
                    <h4 className="text-xs uppercase text-text-muted mb-2 flex items-center gap-2">
                      <span className={`category-dot category-${category}`} />
                      {category}
                    </h4>
                    <div className="grid gap-2">
                      {mats.map((mat) => (
                        <div
                          key={mat.id}
                          className="flex items-center justify-between bg-bg-tertiary rounded-lg px-4 py-2.5 border border-border"
                        >
                          <span className="text-text-primary">{mat.name}</span>
                          <span className="text-accent font-mono font-semibold">x{mat.formatted}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {tree && (
              <div className="bg-bg-secondary rounded-xl border border-border p-4">
                <h3 className="text-lg font-semibold text-text-primary mb-4">Crafting Tree</h3>
                <div className="max-h-96 overflow-y-auto">{renderTree(tree)}</div>
              </div>
            )}
          </>
        )}

        {!isLoading && mode === "reverse" && selectedItem && (
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h3 className="text-lg font-semibold text-text-primary mb-4">
              Items using {selectedItem.name}
            </h3>
            {craftable.length > 0 ? (
              <div className="grid gap-2">
                {craftable.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-bg-tertiary rounded-lg px-4 py-3 border border-border hover:border-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`category-dot category-${item.category}`} />
                      <span className="text-text-primary">{item.name}</span>
                    </div>
                    <span className="text-text-muted text-sm">needs x{item.formatted}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-text-muted">No items use this material</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// ADVANCED CALCULATOR TAB
// ============================================
function AdvancedCalculator() {
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [playerSkill, setPlayerSkill] = useState(50);
  const [toolQL, setToolQL] = useState(50);
  const [materialQL, setMaterialQL] = useState(50);
  const [hasSleepBonus, setHasSleepBonus] = useState(false);
  const [parentSkill, setParentSkill] = useState(0);
  const [windOfAges, setWindOfAges] = useState(0);
  const [circleOfCunning, setCircleOfCunning] = useState(0);
  const [showSkillPath, setShowSkillPath] = useState(false);

  const [result, setResult] = useState<AdvancedResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("expected");

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => {
        const craftable = data.filter((i: Item & { is_base_material: number }) => !i.is_base_material);
        setItems(craftable);
      });
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const calculate = useCallback(async () => {
    if (!selectedItem) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        item: selectedItem.id.toString(),
        qty: quantity.toString(),
        skill: playerSkill.toString(),
        toolQL: toolQL.toString(),
        materialQL: materialQL.toString(),
        sleepBonus: hasSleepBonus.toString(),
        parentSkill: parentSkill.toString(),
        woa: windOfAges.toString(),
        coc: circleOfCunning.toString(),
        includeSkillPath: showSkillPath.toString(),
      });
      const response = await fetch(`/api/advanced-calculate?${params}`);
      const data = await response.json();
      if (!data.error) setResult(data);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, quantity, playerSkill, toolQL, materialQL, hasSleepBonus, parentSkill, windOfAges, circleOfCunning, showSkillPath]);

  useEffect(() => {
    if (selectedItem) {
      const timer = setTimeout(calculate, 300);
      return () => clearTimeout(timer);
    }
  }, [calculate, selectedItem]);

  const handleItemSelect = (item: Item) => {
    setSelectedItem(item);
    setSearchQuery(item.name);
    setShowDropdown(false);
  };

  const getQuantityDisplay = (mat: AdvancedMaterialResult) => {
    switch (viewMode) {
      case "base": return mat.formatted;
      case "worstCase": return mat.worstCaseFormatted;
      default: return mat.expectedFormatted;
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Panel */}
      <div className="space-y-4">
        {/* Item Selection */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <label className="block text-sm font-medium text-text-primary mb-2">Item Selection</label>
          <div className="relative" ref={dropdownRef}>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              placeholder="Search items..."
              className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
            />
            {showDropdown && filteredItems.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-bg-secondary border border-border rounded-lg max-h-60 overflow-auto">
                {filteredItems.slice(0, 10).map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleItemSelect(item)}
                    className="w-full px-4 py-2.5 text-left hover:bg-bg-hover text-text-primary flex justify-between items-center border-b border-border last:border-0"
                  >
                    <span className="truncate">{item.name}</span>
                    <span className="text-text-muted text-xs capitalize ml-2">{item.category}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-4">
            <label className="block text-sm text-text-secondary mb-2">Quantity</label>
            <div className="flex items-center gap-2">
              <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary">-</button>
              <input
                type="number" min="1" max="10000" value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="flex-1 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary text-center border border-border focus:border-accent [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
              />
              <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-bg-tertiary border border-border text-text-secondary hover:text-text-primary">+</button>
            </div>
          </div>

          {/* Item Info - Show when item is selected */}
          {selectedItem && (
            <div className="mt-4 pt-4 border-t border-border">
              {/* Warning if difficulty is unknown */}
              {!selectedItem.difficulty && (
                <div className="mb-3 p-2 bg-warning/10 border border-warning/30 rounded-lg">
                  <p className="text-xs text-warning flex items-center gap-2">
                    <span>⚠</span>
                    <span>Difficulty unknown - using estimated values</span>
                  </p>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded">
                  <span className="text-text-muted">Difficulty</span>
                  <span className={selectedItem.difficulty ? 'text-text-primary font-medium' : 'text-text-muted italic'}>
                    {selectedItem.difficulty ?? '?'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded">
                  <span className="text-text-muted">Base Time</span>
                  <span className={selectedItem.base_time ? 'text-text-primary font-medium' : 'text-text-muted italic'}>
                    {selectedItem.base_time ? `${selectedItem.base_time}s` : '?'}
                  </span>
                </div>
                <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded col-span-2">
                  <span className="text-text-muted">Skill</span>
                  <span className={`capitalize ${selectedItem.skill_type ? 'text-text-primary font-medium' : 'text-text-muted italic'}`}>
                    {selectedItem.skill_type?.replace(/_/g, ' ') ?? 'Unknown'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Player Settings */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Player Settings</h3>
          <div className="space-y-4">
            <SliderInput label="Skill Level" value={playerSkill} onChange={setPlayerSkill} min={1} max={100} />
            <SliderInput label="Tool QL" value={toolQL} onChange={setToolQL} min={1} max={100} />
            <SliderInput label="Material QL" value={materialQL} onChange={setMaterialQL} min={1} max={100} />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={hasSleepBonus} onChange={(e) => setHasSleepBonus(e.target.checked)} className="w-5 h-5 rounded border-border bg-bg-tertiary accent-accent" />
              <span className="text-sm text-text-secondary">Sleep Bonus Active</span>
            </label>
          </div>
        </div>

        {/* Advanced Settings */}
        <details className="group">
          <summary className="bg-bg-secondary rounded-xl border border-border p-4 cursor-pointer text-text-primary font-medium list-none flex justify-between items-center">
            <span>Advanced Settings</span>
            <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
          </summary>
          <div className="bg-bg-secondary rounded-b-xl border border-t-0 border-border p-4 space-y-4 -mt-2">
            <SliderInput label="Parent Skill" value={parentSkill} onChange={setParentSkill} min={0} max={100} />
            <SliderInput label="Wind of Ages" value={windOfAges} onChange={setWindOfAges} min={0} max={100} />
            <SliderInput label="Circle of Cunning" value={circleOfCunning} onChange={setCircleOfCunning} min={0} max={100} />
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={showSkillPath} onChange={(e) => setShowSkillPath(e.target.checked)} className="w-5 h-5 rounded border-border bg-bg-tertiary accent-accent" />
              <span className="text-sm text-text-secondary">Show Skill Path</span>
            </label>
          </div>
        </details>
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-2 space-y-4">
        {loading && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 flex items-center justify-center">
            <div className="animate-spin text-4xl">⚙</div>
          </div>
        )}

        {!loading && result && (
          <>
            {/* Prediction Summary */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Crafting {quantity}x {result.item.name}
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <StatBox label="Success Rate" value={`${Math.round(result.prediction.successChance)}%`} sub={result.prediction.successLabel} color={result.prediction.successChance >= 70 ? "success" : result.prediction.successChance >= 40 ? "warning" : "danger"} />
                <StatBox label="Avg Quality" value={result.prediction.averageQL.toFixed(1)} sub={`${result.prediction.minQL.toFixed(0)} - ${result.prediction.maxQL.toFixed(0)}`} />
                <StatBox label="Total Time" value={result.prediction.totalTimeFormatted} sub={`~${result.prediction.timePerItem.toFixed(1)}s/action`} />
                <StatBox label="Extra Materials" value={`${((result.prediction.wasteMultiplier - 1) * 100).toFixed(0)}%`} sub={`${result.prediction.failureRate.toFixed(1)}% fail rate`} />
              </div>

              <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
                <div className="text-center">
                  <div className="text-lg font-semibold text-text-primary">{result.prediction.repairsNeeded}</div>
                  <div className="text-xs text-text-muted">Tool Repairs</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-semibold text-success">+{result.prediction.totalSkillGain.toFixed(3)}</div>
                  <div className="text-xs text-text-muted">Skill → {result.prediction.newSkillLevel.toFixed(2)}</div>
                </div>
                <div className="text-center">
                  <div className={`text-lg font-semibold ${result.prediction.isOptimalDifficulty ? 'text-success' : 'text-warning'}`}>
                    {result.prediction.isOptimalDifficulty ? '✓ Optimal' : '△ Suboptimal'}
                  </div>
                  <div className="text-xs text-text-muted">{result.prediction.actionsToNextLevel} to next lvl</div>
                </div>
              </div>
            </div>

            {/* Materials */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                <h3 className="text-lg font-semibold text-text-primary">Required Materials</h3>
                <div className="flex gap-1 bg-bg-tertiary p-1 rounded-lg">
                  {[
                    { value: "base" as ViewMode, label: "Base" },
                    { value: "expected" as ViewMode, label: "Expected" },
                    { value: "worstCase" as ViewMode, label: "Worst" },
                  ].map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setViewMode(m.value)}
                      className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                        viewMode === m.value ? "bg-accent text-white" : "text-text-secondary hover:text-text-primary"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                {result.expectedMaterials.map((mat) => (
                  <div key={mat.id} className="flex items-center justify-between bg-bg-tertiary rounded-lg px-4 py-2.5 border border-border">
                    <div className="flex items-center gap-3">
                      <span className={`category-dot category-${mat.category}`} />
                      <span className="text-text-primary">{mat.name}</span>
                    </div>
                    <span className="text-accent font-mono font-semibold">{getQuantityDisplay(mat)}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !result && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4 opacity-20">⚙</div>
            <h3 className="text-lg text-text-secondary mb-2">Select an Item</h3>
            <p className="text-text-muted text-sm">Choose an item to see advanced crafting predictions</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// SKILL OPTIMIZER TAB
// ============================================
function SkillOptimizer() {
  const [currentSkill, setCurrentSkill] = useState(50);
  const [targetSkill, setTargetSkill] = useState(70);
  const [toolQL, setToolQL] = useState(50);
  const [category, setCategory] = useState<string>("");
  const [categories, setCategories] = useState<string[]>([]);
  const [result, setResult] = useState<OptimizerResult | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetch("/api/items?categories=true")
      .then((r) => r.json())
      .then((data) => { if (Array.isArray(data)) setCategories(data); });
  }, []);

  const optimize = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        skill: currentSkill.toString(),
        targetSkill: targetSkill.toString(),
        toolQL: toolQL.toString(),
      });
      if (category) params.set("category", category);
      const response = await fetch(`/api/skill-optimizer?${params}`);
      const data = await response.json();
      if (!data.error) setResult(data);
    } finally {
      setLoading(false);
    }
  }, [currentSkill, targetSkill, toolQL, category]);

  useEffect(() => {
    if (currentSkill < targetSkill) {
      const timer = setTimeout(optimize, 300);
      return () => clearTimeout(timer);
    }
  }, [currentSkill, targetSkill, toolQL, category, optimize]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Settings Panel */}
      <div className="space-y-4">
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <h3 className="text-sm font-medium text-text-primary mb-4">Training Settings</h3>
          <div className="space-y-5">
            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Current Skill</span>
                <span className="text-accent font-bold text-lg">{currentSkill}</span>
              </div>
              <input
                type="range" min="1" max="99" value={currentSkill}
                onChange={(e) => setCurrentSkill(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-text-secondary">Target Skill</span>
                <span className="text-success font-bold text-lg">{targetSkill}</span>
              </div>
              <input
                type="range" min={currentSkill + 1} max="100" value={targetSkill}
                onChange={(e) => setTargetSkill(parseInt(e.target.value))}
                className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-success"
              />
            </div>

            <SliderInput label="Tool QL" value={toolQL} onChange={setToolQL} min={1} max={100} />

            <div>
              <label className="block text-sm text-text-secondary mb-2">Category Filter</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent"
              >
                <option value="">All Categories</option>
                {categories.map((c) => (
                  <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {result && (
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <h3 className="text-sm font-medium text-text-primary mb-3">Skill Metrics</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Effective Skill</span>
                <span className="text-text-primary font-semibold">{result.metrics.effectiveSkill}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Max Creation QL</span>
                <span className="text-info font-semibold">{result.metrics.maxCreationQL}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-bg-tertiary rounded-lg">
                <span className="text-text-muted">Sweet Spot QL</span>
                <span className="text-success font-semibold">{result.metrics.sweetSpotRange.min} - {result.metrics.sweetSpotRange.max}</span>
              </div>
              <div className="p-3 bg-success/10 rounded-lg border border-success/20">
                <p className="text-success text-sm">
                  <strong>Tip:</strong> Improve items in QL range {result.metrics.sweetSpotRange.min}-{result.metrics.sweetSpotRange.max} for double skill gain!
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results Panel */}
      <div className="lg:col-span-2 space-y-4">
        {loading && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 flex items-center justify-center">
            <div className="animate-spin text-4xl">⚙</div>
          </div>
        )}

        {!loading && result && (
          <>
            {/* Summary */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">
                Training Plan: {currentSkill} → {targetSkill}
              </h3>
              <div className="grid grid-cols-3 gap-3">
                <StatBox label="Total Actions" value={result.summary.totalActions.toLocaleString()} />
                <StatBox label="Est. Time" value={result.summary.totalTime} />
                <StatBox label="Skill Gain" value={`+${result.summary.skillGain}`} color="success" />
              </div>

              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex justify-between text-sm text-text-muted mb-1">
                  <span>Current: {currentSkill}</span>
                  <span>Target: {targetSkill}</span>
                </div>
                <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-accent to-success rounded-full transition-all"
                    style={{ width: `${((currentSkill - 1) / 99) * 100}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Optimal Items */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Best Items to Craft</h3>
              <div className="space-y-2">
                {result.optimalItems.slice(0, 5).map((item, index) => (
                  <div
                    key={item.id}
                    className={`flex items-center justify-between rounded-lg p-4 transition-all ${
                      item.isInSweetSpot
                        ? "bg-success/10 border border-success/30"
                        : "bg-bg-tertiary border border-border"
                    }`}
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-2xl font-bold text-text-muted">#{index + 1}</span>
                      <div>
                        <span className="text-text-primary font-semibold">{item.name}</span>
                        <span className="text-xs text-text-muted capitalize ml-2">{item.category}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className={`text-lg font-semibold ${item.successChance >= 45 && item.successChance <= 55 ? "text-success" : "text-warning"}`}>
                          {item.successChance}%
                        </div>
                        <div className="text-xs text-text-muted">Success</div>
                      </div>
                      {item.isInSweetSpot && (
                        <span className="px-2 py-1 bg-success text-white text-xs rounded font-bold">2x</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Skill Path */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <h3 className="text-lg font-semibold text-text-primary mb-4">Progression Path</h3>
              <div className="space-y-3">
                {result.skillPath.map((step, index) => (
                  <div key={index} className="relative">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-border rounded">
                      <div
                        className="absolute top-0 w-full bg-accent rounded"
                        style={{ height: `${((step.to - currentSkill) / (targetSkill - currentSkill)) * 100}%` }}
                      />
                    </div>
                    <div className="ml-4 bg-bg-tertiary rounded-lg p-4 border border-border">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-text-primary font-semibold">Level {step.from} → {step.to}</span>
                        <span className="text-accent text-sm">{step.actionsNeeded.toLocaleString()} actions</span>
                      </div>
                      <p className="text-sm text-text-muted">{step.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}

        {!loading && !result && (
          <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
            <div className="text-6xl mb-4 opacity-20">📈</div>
            <h3 className="text-lg text-text-secondary mb-2">Ready to Optimize</h3>
            <p className="text-text-muted text-sm">Adjust skill levels to see training recommendations</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================
// HELPER COMPONENTS
// ============================================
function SliderInput({ label, value, onChange, min, max }: { label: string; value: number; onChange: (v: number) => void; min: number; max: number }) {
  return (
    <div>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-text-secondary">{label}</span>
        <span className="text-accent font-semibold">{value}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(parseInt(e.target.value))}
        className="w-full h-2 bg-bg-tertiary rounded-lg appearance-none cursor-pointer accent-accent"
      />
    </div>
  );
}

function StatBox({ label, value, sub, color }: { label: string; value: string; sub?: string; color?: "success" | "warning" | "danger" }) {
  const colorClass = color === "success" ? "text-success" : color === "warning" ? "text-warning" : color === "danger" ? "text-danger" : "text-accent";
  return (
    <div className="bg-bg-tertiary rounded-lg p-3 text-center">
      <div className={`text-xl font-bold ${colorClass}`}>{value}</div>
      <div className="text-xs text-text-muted">{label}</div>
      {sub && <div className="text-xs text-text-muted mt-1">{sub}</div>}
    </div>
  );
}
