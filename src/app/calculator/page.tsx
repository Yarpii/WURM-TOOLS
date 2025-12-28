"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Item {
  id: number;
  name: string;
  category: string;
}

interface MaterialResult {
  id: number;
  name: string;
  category: string;
  quantity: number;
  formatted: string;
  expectedQuantity: number;
  expectedFormatted: string;
  worstCaseQuantity: number;
  worstCaseFormatted: string;
}

interface CraftingPrediction {
  successChance: number;
  successLabel: string;
  successColor: string;
  averageQL: number;
  minQL: number;
  maxQL: number;
  timePerItem: number;
  totalTime: number;
  totalTimeFormatted: string;
  failureRate: number;
  wasteMultiplier: number;
  toolDamagePerAction: number;
  repairsNeeded: number;
  skillGainPerAction: number;
  totalSkillGain: number;
  newSkillLevel: number;
  actionsToNextLevel: number;
  isOptimalDifficulty: boolean;
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

interface CalculationResult {
  item: Item;
  quantity: number;
  baseMaterials: MaterialResult[];
  expectedMaterials: MaterialResult[];
  prediction: CraftingPrediction;
  skillPath?: SkillGrindStep[];
}

export default function AdvancedCalculator() {
  // Item selection
  const [items, setItems] = useState<Item[]>([]);
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [quantity, setQuantity] = useState(1);

  // Crafting settings
  const [playerSkill, setPlayerSkill] = useState(50);
  const [toolQL, setToolQL] = useState(50);
  const [materialQL, setMaterialQL] = useState(50);
  const [hasSleepBonus, setHasSleepBonus] = useState(false);
  const [parentSkill, setParentSkill] = useState(0);
  const [windOfAges, setWindOfAges] = useState(0);
  const [circleOfCunning, setCircleOfCunning] = useState(0);

  // Results
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [showSkillPath, setShowSkillPath] = useState(false);

  // View mode
  const [viewMode, setViewMode] = useState<"expected" | "base" | "worstCase">("expected");

  // Fetch items on mount
  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then((data) => {
        const craftable = data.filter((i: Item & { is_base_material: number }) => !i.is_base_material);
        setItems(craftable);
      });
  }, []);

  // Filter items based on search
  const filteredItems = items.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate when settings change
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

      if (data.error) {
        console.error(data.error);
        return;
      }

      setResult(data);
    } catch (error) {
      console.error("Calculation failed:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedItem, quantity, playerSkill, toolQL, materialQL, hasSleepBonus, parentSkill, windOfAges, circleOfCunning, showSkillPath]);

  // Auto-calculate on changes
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

  // Get materials based on view mode
  const getMaterials = () => {
    if (!result) return [];
    return result.expectedMaterials;
  };

  const getQuantityDisplay = (mat: MaterialResult) => {
    switch (viewMode) {
      case "base":
        return mat.formatted;
      case "worstCase":
        return mat.worstCaseFormatted;
      default:
        return mat.expectedFormatted;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <header className="bg-gray-800/50 border-b border-amber-900/30">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <span className="text-2xl">&#9876;</span>
              <div>
                <h1 className="text-xl font-bold text-amber-500">Advanced Calculator</h1>
                <p className="text-xs text-gray-400">Skill-based predictions</p>
              </div>
            </Link>
            <nav className="flex gap-4">
              <Link href="/" className="text-gray-400 hover:text-amber-500 transition-colors text-sm">
                Basic Calculator
              </Link>
              <Link href="/skill-optimizer" className="text-gray-400 hover:text-amber-500 transition-colors text-sm">
                Skill Optimizer
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Settings Panel */}
          <div className="lg:col-span-1 space-y-6">
            {/* Item Selection */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-amber-500 mb-4">Item Selection</h2>

              {/* Search */}
              <div className="relative mb-4">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowDropdown(true);
                  }}
                  onFocus={() => setShowDropdown(true)}
                  placeholder="Search items..."
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                />
                {showDropdown && filteredItems.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg max-h-60 overflow-auto">
                    {filteredItems.slice(0, 10).map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleItemSelect(item)}
                        className="w-full px-4 py-2 text-left hover:bg-gray-600 text-white flex justify-between"
                      >
                        <span>{item.name}</span>
                        <span className="text-gray-400 text-sm">{item.category}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                <input
                  type="number"
                  min="1"
                  max="10000"
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-amber-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Player Settings */}
            <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
              <h2 className="text-lg font-semibold text-amber-500 mb-4">Player Settings</h2>

              {/* Skill Level */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Skill Level: <span className="text-amber-500">{playerSkill}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={playerSkill}
                  onChange={(e) => setPlayerSkill(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Tool QL */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Tool QL: <span className="text-amber-500">{toolQL}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={toolQL}
                  onChange={(e) => setToolQL(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Material QL */}
              <div className="mb-4">
                <label className="block text-sm text-gray-400 mb-2">
                  Material QL: <span className="text-amber-500">{materialQL}</span>
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={materialQL}
                  onChange={(e) => setMaterialQL(parseInt(e.target.value))}
                  className="w-full accent-amber-500"
                />
              </div>

              {/* Sleep Bonus */}
              <div className="mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={hasSleepBonus}
                    onChange={(e) => setHasSleepBonus(e.target.checked)}
                    className="w-4 h-4 accent-amber-500"
                  />
                  <span className="text-gray-300">Sleep Bonus Active</span>
                </label>
              </div>
            </div>

            {/* Advanced Settings (Collapsible) */}
            <details className="bg-gray-800/50 rounded-lg border border-gray-700">
              <summary className="p-4 cursor-pointer text-amber-500 font-semibold hover:bg-gray-700/50">
                Advanced Settings
              </summary>
              <div className="p-6 pt-2 space-y-4">
                {/* Parent Skill */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Parent Skill: <span className="text-amber-500">{parentSkill}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={parentSkill}
                    onChange={(e) => setParentSkill(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Wind of Ages */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Wind of Ages: <span className="text-amber-500">{windOfAges}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={windOfAges}
                    onChange={(e) => setWindOfAges(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Circle of Cunning */}
                <div>
                  <label className="block text-sm text-gray-400 mb-2">
                    Circle of Cunning: <span className="text-amber-500">{circleOfCunning}</span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={circleOfCunning}
                    onChange={(e) => setCircleOfCunning(parseInt(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>

                {/* Show Skill Path */}
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={showSkillPath}
                      onChange={(e) => setShowSkillPath(e.target.checked)}
                      className="w-4 h-4 accent-amber-500"
                    />
                    <span className="text-gray-300">Show Skill Grinding Path</span>
                  </label>
                </div>
              </div>
            </details>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-6">
            {loading && (
              <div className="bg-gray-800/50 rounded-lg p-8 border border-gray-700 text-center">
                <div className="animate-spin text-4xl mb-4">&#9876;</div>
                <p className="text-gray-400">Calculating...</p>
              </div>
            )}

            {!loading && result && (
              <>
                {/* Prediction Summary */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <h2 className="text-lg font-semibold text-amber-500 mb-4">
                    Crafting {quantity}x {result.item.name}
                  </h2>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Success Rate */}
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div
                        className="text-3xl font-bold mb-1"
                        style={{ color: result.prediction.successColor }}
                      >
                        {Math.round(result.prediction.successChance)}%
                      </div>
                      <div className="text-sm text-gray-400">Success Rate</div>
                      <div
                        className="text-xs mt-1"
                        style={{ color: result.prediction.successColor }}
                      >
                        {result.prediction.successLabel}
                      </div>
                    </div>

                    {/* Quality */}
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-blue-400 mb-1">
                        {result.prediction.averageQL.toFixed(1)}
                      </div>
                      <div className="text-sm text-gray-400">Avg Quality</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {result.prediction.minQL.toFixed(0)} - {result.prediction.maxQL.toFixed(0)} range
                      </div>
                    </div>

                    {/* Time */}
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-2xl font-bold text-purple-400 mb-1">
                        {result.prediction.totalTimeFormatted}
                      </div>
                      <div className="text-sm text-gray-400">Total Time</div>
                      <div className="text-xs text-gray-500 mt-1">
                        ~{result.prediction.timePerItem.toFixed(1)}s per action
                      </div>
                    </div>

                    {/* Material Waste */}
                    <div className="bg-gray-700/50 rounded-lg p-4 text-center">
                      <div className="text-3xl font-bold text-orange-400 mb-1">
                        {((result.prediction.wasteMultiplier - 1) * 100).toFixed(0)}%
                      </div>
                      <div className="text-sm text-gray-400">Extra Materials</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {result.prediction.failureRate.toFixed(1)}% failure rate
                      </div>
                    </div>
                  </div>

                  {/* Secondary Stats */}
                  <div className="grid grid-cols-3 gap-4 mt-4 pt-4 border-t border-gray-700">
                    {/* Tool Wear */}
                    <div className="text-center">
                      <div className="text-lg font-semibold text-gray-300">
                        {result.prediction.repairsNeeded}
                      </div>
                      <div className="text-xs text-gray-500">Tool Repairs Needed</div>
                    </div>

                    {/* Skill Gain */}
                    <div className="text-center">
                      <div className="text-lg font-semibold text-green-400">
                        +{result.prediction.totalSkillGain.toFixed(3)}
                      </div>
                      <div className="text-xs text-gray-500">
                        Skill Gain → {result.prediction.newSkillLevel.toFixed(2)}
                      </div>
                    </div>

                    {/* Optimal */}
                    <div className="text-center">
                      <div className={`text-lg font-semibold ${result.prediction.isOptimalDifficulty ? 'text-green-400' : 'text-yellow-400'}`}>
                        {result.prediction.isOptimalDifficulty ? '✓ Optimal' : '△ Suboptimal'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {result.prediction.actionsToNextLevel} actions to next level
                      </div>
                    </div>
                  </div>
                </div>

                {/* Materials Table */}
                <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-semibold text-amber-500">Required Materials</h2>

                    {/* View Mode Toggle */}
                    <div className="flex gap-2">
                      <button
                        onClick={() => setViewMode("base")}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          viewMode === "base"
                            ? "bg-amber-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        Base
                      </button>
                      <button
                        onClick={() => setViewMode("expected")}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          viewMode === "expected"
                            ? "bg-amber-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        Expected
                      </button>
                      <button
                        onClick={() => setViewMode("worstCase")}
                        className={`px-3 py-1 rounded text-sm transition-colors ${
                          viewMode === "worstCase"
                            ? "bg-amber-600 text-white"
                            : "bg-gray-700 text-gray-400 hover:bg-gray-600"
                        }`}
                      >
                        Worst Case
                      </button>
                    </div>
                  </div>

                  <div className="text-xs text-gray-500 mb-3">
                    {viewMode === "base" && "Perfect success - no failures assumed"}
                    {viewMode === "expected" && "Average materials needed with your success rate"}
                    {viewMode === "worstCase" && "95th percentile - if you're unlucky"}
                  </div>

                  <div className="space-y-2">
                    {getMaterials().map((mat) => (
                      <div
                        key={mat.id}
                        className="flex items-center justify-between bg-gray-700/30 rounded-lg p-3"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-gray-500 text-sm">{mat.category}</span>
                          <span className="text-white">{mat.name}</span>
                        </div>
                        <div className="flex items-center gap-4">
                          <span className="text-amber-500 font-mono text-lg">
                            {getQuantityDisplay(mat)}
                          </span>
                          {viewMode === "expected" && mat.expectedQuantity > mat.quantity && (
                            <span className="text-orange-400 text-sm">
                              (+{(mat.expectedQuantity - mat.quantity).toFixed(1)})
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Skill Path */}
                {result.skillPath && result.skillPath.length > 0 && (
                  <div className="bg-gray-800/50 rounded-lg p-6 border border-gray-700">
                    <h2 className="text-lg font-semibold text-amber-500 mb-4">
                      Skill Grinding Path
                    </h2>
                    <div className="space-y-3">
                      {result.skillPath.map((step, index) => (
                        <div
                          key={index}
                          className="bg-gray-700/30 rounded-lg p-4"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-white font-semibold">
                              Skill {step.skillFrom.toFixed(1)} → {step.skillTo.toFixed(1)}
                            </span>
                            <span className="text-gray-400 text-sm">
                              Target QL: {step.targetQL}
                            </span>
                          </div>
                          <div className="grid grid-cols-3 gap-4 text-sm">
                            <div>
                              <span className="text-gray-500">Actions:</span>{" "}
                              <span className="text-amber-400">{step.actionsNeeded}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Materials:</span>{" "}
                              <span className="text-amber-400">{step.materialsNeeded}</span>
                            </div>
                            <div>
                              <span className="text-gray-500">Time:</span>{" "}
                              <span className="text-amber-400">{step.timeEstimate}</span>
                            </div>
                          </div>
                          <div className="mt-2 text-xs text-gray-500">
                            {step.description} ({step.successRate}% success)
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            {!loading && !result && (
              <div className="bg-gray-800/50 rounded-lg p-12 border border-gray-700 text-center">
                <div className="text-6xl mb-4 opacity-20">&#9876;</div>
                <h3 className="text-xl text-gray-400 mb-2">Select an Item</h3>
                <p className="text-gray-500">
                  Choose an item to see advanced crafting predictions
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
