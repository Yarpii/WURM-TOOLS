"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { MainLayout, Card, StatCard, Slider, Toggle, ToggleButtonGroup } from "@/components";

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

type ViewMode = "expected" | "base" | "worstCase";

export default function AdvancedCalculator() {
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

  const [result, setResult] = useState<CalculationResult | null>(null);
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

  const getQuantityDisplay = (mat: MaterialResult) => {
    switch (viewMode) {
      case "base": return mat.formatted;
      case "worstCase": return mat.worstCaseFormatted;
      default: return mat.expectedFormatted;
    }
  };

  return (
    <MainLayout
      title="Advanced Calculator"
      subtitle="Skill-based crafting predictions with failure rates"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Settings Panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Item Selection */}
          <Card title="Item Selection" icon="🔍">
            <div className="relative" ref={dropdownRef}>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => { setSearchQuery(e.target.value); setShowDropdown(true); }}
                onFocus={() => setShowDropdown(true)}
                placeholder="Search items..."
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white border border-gold/10 focus:border-accent focus:outline-none placeholder-gray-500"
              />
              {showDropdown && filteredItems.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-dark-card border border-gold/20 rounded-lg max-h-60 overflow-auto">
                  {filteredItems.slice(0, 10).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => handleItemSelect(item)}
                      className="w-full px-4 py-2.5 text-left hover:bg-white/5 text-gray-300 flex justify-between items-center border-b border-gold/5 last:border-0"
                    >
                      <span className="truncate">{item.name}</span>
                      <span className="text-gray-500 text-xs capitalize ml-2">{item.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="mt-4">
              <label className="block text-sm text-gray-400 mb-2">Quantity</label>
              <div className="flex items-center gap-2">
                <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-10 h-10 rounded-lg bg-dark-input border border-gold/10 text-gray-400 hover:text-white hover:border-accent transition-colors">−</button>
                <input
                  type="number" min="1" max="10000" value={quantity}
                  onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                  className="flex-1 px-4 py-2 bg-dark-input rounded-lg text-white text-center border border-gold/10 focus:border-accent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <button onClick={() => setQuantity(quantity + 1)} className="w-10 h-10 rounded-lg bg-dark-input border border-gold/10 text-gray-400 hover:text-white hover:border-accent transition-colors">+</button>
              </div>
            </div>
          </Card>

          {/* Player Settings */}
          <Card title="Player Settings" icon="⚔">
            <div className="space-y-5">
              <Slider label="Skill Level" value={playerSkill} onChange={setPlayerSkill} min={1} max={100} color="accent" />
              <Slider label="Tool QL" value={toolQL} onChange={setToolQL} min={1} max={100} color="info" />
              <Slider label="Material QL" value={materialQL} onChange={setMaterialQL} min={1} max={100} color="warning" />
              <Toggle label="Sleep Bonus Active" description="2× skill gain" checked={hasSleepBonus} onChange={setHasSleepBonus} />
            </div>
          </Card>

          {/* Advanced Settings */}
          <details className="group">
            <summary className="bg-dark-card rounded-xl border border-gold/10 p-4 cursor-pointer text-gold font-semibold hover:border-gold/20 transition-colors list-none flex justify-between items-center">
              <span>⚙ Advanced Settings</span>
              <span className="text-gray-500 group-open:rotate-180 transition-transform">▼</span>
            </summary>
            <div className="bg-dark-card rounded-b-xl border border-t-0 border-gold/10 p-4 space-y-4">
              <Slider label="Parent Skill" value={parentSkill} onChange={setParentSkill} min={0} max={100} color="success" />
              <Slider label="Wind of Ages" value={windOfAges} onChange={setWindOfAges} min={0} max={100} color="info" />
              <Slider label="Circle of Cunning" value={circleOfCunning} onChange={setCircleOfCunning} min={0} max={100} color="warning" />
              <Toggle label="Show Skill Grinding Path" checked={showSkillPath} onChange={setShowSkillPath} />
            </div>
          </details>
        </div>

        {/* Results Panel */}
        <div className="lg:col-span-2 space-y-4">
          {loading && (
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin text-4xl">⚒</div>
              </div>
            </Card>
          )}

          {!loading && result && (
            <>
              {/* Prediction Summary */}
              <Card title={`Crafting ${quantity}× ${result.item.name}`} icon="📊">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                  <StatCard
                    label="Success Rate"
                    value={`${Math.round(result.prediction.successChance)}%`}
                    subValue={result.prediction.successLabel}
                    color={result.prediction.successChance >= 70 ? "success" : result.prediction.successChance >= 40 ? "warning" : "accent"}
                  />
                  <StatCard
                    label="Avg Quality"
                    value={result.prediction.averageQL.toFixed(1)}
                    subValue={`${result.prediction.minQL.toFixed(0)} - ${result.prediction.maxQL.toFixed(0)} range`}
                    color="info"
                  />
                  <StatCard
                    label="Total Time"
                    value={result.prediction.totalTimeFormatted}
                    subValue={`~${result.prediction.timePerItem.toFixed(1)}s/action`}
                    color="info"
                  />
                  <StatCard
                    label="Extra Materials"
                    value={`${((result.prediction.wasteMultiplier - 1) * 100).toFixed(0)}%`}
                    subValue={`${result.prediction.failureRate.toFixed(1)}% fail rate`}
                    color="warning"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-gold/10">
                  <div className="text-center">
                    <div className="text-lg font-semibold text-gray-300">{result.prediction.repairsNeeded}</div>
                    <div className="text-xs text-gray-500">Tool Repairs</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-semibold text-emerald-400">+{result.prediction.totalSkillGain.toFixed(3)}</div>
                    <div className="text-xs text-gray-500">Skill → {result.prediction.newSkillLevel.toFixed(2)}</div>
                  </div>
                  <div className="text-center">
                    <div className={`text-lg font-semibold ${result.prediction.isOptimalDifficulty ? 'text-emerald-400' : 'text-amber-400'}`}>
                      {result.prediction.isOptimalDifficulty ? '✓ Optimal' : '△ Suboptimal'}
                    </div>
                    <div className="text-xs text-gray-500">{result.prediction.actionsToNextLevel} to next lvl</div>
                  </div>
                </div>
              </Card>

              {/* Materials */}
              <Card title="Required Materials" icon="📦">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
                  <p className="text-xs text-gray-500">
                    {viewMode === "base" && "Perfect success - no failures"}
                    {viewMode === "expected" && "Average with your success rate"}
                    {viewMode === "worstCase" && "95th percentile - if unlucky"}
                  </p>
                  <ToggleButtonGroup
                    options={[
                      { value: "base", label: "Base" },
                      { value: "expected", label: "Expected" },
                      { value: "worstCase", label: "Worst" },
                    ]}
                    value={viewMode}
                    onChange={setViewMode}
                    size="sm"
                  />
                </div>

                <div className="space-y-2">
                  {result.expectedMaterials.map((mat) => (
                    <div key={mat.id} className="flex items-center justify-between bg-dark-input rounded-lg px-3 sm:px-4 py-2.5 border border-gold/5 hover:border-gold/10 transition-colors">
                      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                        <span className={`category-dot category-${mat.category} flex-shrink-0`} />
                        <span className="text-gray-300 truncate">{mat.name}</span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-4 flex-shrink-0 ml-2">
                        <span className="text-accent font-mono font-semibold">{getQuantityDisplay(mat)}</span>
                        {viewMode === "expected" && mat.expectedQuantity > mat.quantity && (
                          <span className="text-amber-400 text-xs hidden sm:inline">(+{(mat.expectedQuantity - mat.quantity).toFixed(1)})</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Skill Path */}
              {result.skillPath && result.skillPath.length > 0 && (
                <Card title="Skill Grinding Path" icon="📈">
                  <div className="space-y-3">
                    {result.skillPath.map((step, index) => (
                      <div key={index} className="bg-dark-input rounded-lg p-3 sm:p-4 border border-gold/5">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                          <span className="text-white font-semibold">
                            Skill {step.skillFrom.toFixed(1)} → {step.skillTo.toFixed(1)}
                          </span>
                          <span className="text-gray-400 text-sm">Target QL: {step.targetQL}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 sm:gap-4 text-xs sm:text-sm">
                          <div><span className="text-gray-500">Actions:</span> <span className="text-accent">{step.actionsNeeded}</span></div>
                          <div><span className="text-gray-500">Materials:</span> <span className="text-accent">{step.materialsNeeded}</span></div>
                          <div><span className="text-gray-500">Time:</span> <span className="text-accent">{step.timeEstimate}</span></div>
                        </div>
                        <div className="mt-2 text-xs text-gray-500">{step.description} ({step.successRate}% success)</div>
                      </div>
                    ))}
                  </div>
                </Card>
              )}
            </>
          )}

          {!loading && !result && (
            <Card>
              <div className="text-center py-12 sm:py-16">
                <div className="text-6xl sm:text-7xl mb-4 opacity-20">⚙</div>
                <h3 className="text-lg sm:text-xl text-gray-400 mb-2">Select an Item</h3>
                <p className="text-gray-500 text-sm">Choose an item to see advanced crafting predictions</p>
              </div>
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
