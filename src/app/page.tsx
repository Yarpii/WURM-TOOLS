"use client";

import { useState, useEffect, useRef } from "react";
import { MainLayout, Card, StatCard, ToggleButtonGroup } from "@/components";
import type { Item, CraftingNode, MaterialResult } from "@/lib/types";

type Mode = "calculate" | "reverse";

export default function Home() {
  const [mode, setMode] = useState<Mode>("calculate");
  const [items, setItems] = useState<Item[]>([]);
  const [query, setQuery] = useState("");
  const [selectedItem, setSelectedItem] = useState<Item | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [materials, setMaterials] = useState<MaterialResult[]>([]);
  const [tree, setTree] = useState<CraftingNode | null>(null);
  const [craftable, setCraftable] = useState<
    { id: number; name: string; category: string; formatted: string }[]
  >([]);
  const [includeIndirect, setIncludeIndirect] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems);
  }, []);

  // Close dropdown on outside click
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
    if (mode === "calculate") {
      return matchesQuery && !item.is_base_material;
    }
    return matchesQuery;
  });

  const handleSelect = (item: Item) => {
    setSelectedItem(item);
    setQuery(item.name);
    setShowDropdown(false);
    doAction(item);
  };

  const doAction = async (item: Item = selectedItem!) => {
    if (!item) return;
    setIsLoading(true);

    try {
      if (mode === "calculate") {
        const res = await fetch(`/api/calculate?item=${item.id}&qty=${quantity}`);
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
    if (selectedItem && mode === "reverse") {
      doAction();
    }
  }, [includeIndirect]);

  useEffect(() => {
    if (selectedItem && mode === "calculate") {
      doAction();
    }
  }, [quantity]);

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
      if (selectedIndex >= 0) {
        handleSelect(filteredItems[selectedIndex]);
      }
    } else if (e.key === "Escape") {
      setShowDropdown(false);
    }
  };

  const renderTree = (node: CraftingNode): React.ReactNode => (
    <div key={`${node.id}-${node.depth}`} className="relative">
      <div
        className={`flex items-center gap-2 py-2 px-3 rounded-lg hover:bg-white/5 transition-colors ${
          node.is_base ? "text-emerald-400" : "text-gray-300"
        }`}
      >
        <span className={`category-dot category-${node.category}`} />
        <span className="font-medium">{node.name}</span>
        <span className="text-gray-500 text-sm ml-auto">
          ×{node.quantity % 1 === 0 ? node.quantity : node.quantity.toFixed(2)}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="pl-4 sm:pl-6 border-l-2 border-gold/10 ml-3">
          {node.children.map(renderTree)}
        </div>
      )}
    </div>
  );

  // Group materials by category
  const materialsByCategory = materials.reduce((acc, mat) => {
    if (!acc[mat.category]) acc[mat.category] = [];
    acc[mat.category].push(mat);
    return acc;
  }, {} as Record<string, MaterialResult[]>);

  return (
    <MainLayout
      title="Crafting Calculator"
      subtitle="Calculate the raw materials needed to forge any item"
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
        {/* Left Column - Search & Controls */}
        <div className="lg:col-span-1 space-y-4">
          {/* Mode Toggle */}
          <Card>
            <div className="flex justify-center">
              <ToggleButtonGroup
                options={[
                  { value: "calculate", label: "Calculate", icon: "⚒" },
                  { value: "reverse", label: "Reverse", icon: "🔄" },
                ]}
                value={mode}
                onChange={(v) => {
                  setMode(v);
                  setQuery("");
                  setSelectedItem(null);
                  setMaterials([]);
                  setTree(null);
                  setCraftable([]);
                }}
              />
            </div>
          </Card>

          {/* Search */}
          <Card title="Search Item" icon="🔍">
            <div className="relative" ref={dropdownRef}>
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setShowDropdown(true);
                  setSelectedIndex(-1);
                }}
                onFocus={() => setShowDropdown(true)}
                onKeyDown={handleKeyDown}
                placeholder={mode === "calculate" ? "Search craftable items..." : "Search any item..."}
                className="w-full px-4 py-3 bg-dark-input rounded-lg text-white border border-gold/10 focus:border-accent focus:outline-none placeholder-gray-500"
              />

              {/* Dropdown */}
              {showDropdown && query && filteredItems.length > 0 && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card rounded-lg border border-gold/20 shadow-xl z-50 max-h-60 overflow-y-auto">
                  {filteredItems.slice(0, 10).map((item, index) => (
                    <button
                      key={item.id}
                      onClick={() => handleSelect(item)}
                      className={`
                        w-full px-4 py-2.5 text-left flex items-center gap-3
                        transition-colors border-b border-gold/5 last:border-0
                        ${index === selectedIndex ? "bg-accent/20 text-accent" : "hover:bg-white/5 text-gray-300"}
                      `}
                    >
                      <span className={`category-dot category-${item.category}`} />
                      <span className="flex-1 truncate">{item.name}</span>
                      <span className="text-xs text-gray-500 capitalize hidden sm:inline">{item.category}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quantity (only in calculate mode) */}
            {mode === "calculate" && (
              <div className="mt-4">
                <label className="block text-sm text-gray-400 mb-2">Quantity</label>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    className="w-10 h-10 rounded-lg bg-dark-input border border-gold/10 text-gray-400 hover:text-white hover:border-accent transition-colors"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="1000"
                    value={quantity}
                    onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                    className="flex-1 px-4 py-2 bg-dark-input rounded-lg text-white text-center border border-gold/10 focus:border-accent focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                  />
                  <button
                    onClick={() => setQuantity(Math.min(1000, quantity + 1))}
                    className="w-10 h-10 rounded-lg bg-dark-input border border-gold/10 text-gray-400 hover:text-white hover:border-accent transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {/* Include Indirect (only in reverse mode) */}
            {mode === "reverse" && (
              <label className="flex items-center gap-3 mt-4 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={includeIndirect}
                  onChange={(e) => setIncludeIndirect(e.target.checked)}
                  className="w-5 h-5 rounded border-gold/20 bg-dark-input accent-accent"
                />
                <span className="text-sm text-gray-400 group-hover:text-white transition-colors">
                  Include indirect uses
                </span>
              </label>
            )}
          </Card>

          {/* Quick Stats */}
          {selectedItem && mode === "calculate" && materials.length > 0 && (
            <Card title="Summary" icon="📊">
              <div className="grid grid-cols-2 gap-3">
                <StatCard
                  label="Materials"
                  value={materials.length}
                  icon="📦"
                  color="info"
                />
                <StatCard
                  label="Total Items"
                  value={materials.reduce((sum, m) => sum + m.quantity, 0).toFixed(0)}
                  icon="⚒"
                  color="accent"
                />
              </div>
            </Card>
          )}
        </div>

        {/* Right Column - Results */}
        <div className="lg:col-span-2 space-y-4">
          {isLoading && (
            <Card>
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin text-4xl">⚒</div>
              </div>
            </Card>
          )}

          {!isLoading && !selectedItem && (
            <Card>
              <div className="text-center py-12 sm:py-16">
                <div className="text-6xl sm:text-7xl mb-4 opacity-20">⚔</div>
                <h3 className="text-lg sm:text-xl text-gray-400 mb-2">Select an Item</h3>
                <p className="text-gray-500 text-sm max-w-md mx-auto">
                  {mode === "calculate"
                    ? "Choose an item to calculate its material requirements"
                    : "Choose a material to see what can be crafted from it"}
                </p>
              </div>
            </Card>
          )}

          {/* Calculate Mode Results */}
          {!isLoading && mode === "calculate" && selectedItem && materials.length > 0 && (
            <>
              {/* Materials by Category */}
              <Card
                title={`Materials for ${quantity}× ${selectedItem.name}`}
                icon="📦"
              >
                <div className="space-y-4">
                  {Object.entries(materialsByCategory).map(([category, mats]) => (
                    <div key={category}>
                      <h4 className="text-xs uppercase text-gray-500 mb-2 flex items-center gap-2">
                        <span className={`category-dot category-${category}`} />
                        {category}
                      </h4>
                      <div className="grid gap-2">
                        {mats.map((mat) => (
                          <div
                            key={mat.id}
                            className="flex items-center justify-between bg-dark-input rounded-lg px-3 sm:px-4 py-2.5 border border-gold/5 hover:border-gold/10 transition-colors"
                          >
                            <span className="text-gray-300 truncate mr-2">{mat.name}</span>
                            <span className="text-accent font-mono font-semibold whitespace-nowrap">
                              ×{mat.formatted}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Crafting Tree */}
              {tree && (
                <Card title="Crafting Tree" icon="🌳">
                  <div className="max-h-80 sm:max-h-96 overflow-y-auto -mx-2 px-2">
                    {renderTree(tree)}
                  </div>
                </Card>
              )}
            </>
          )}

          {/* Reverse Mode Results */}
          {!isLoading && mode === "reverse" && selectedItem && (
            <Card
              title={`Items using ${selectedItem.name}`}
              icon="🔄"
            >
              {craftable.length > 0 ? (
                <div className="grid gap-2">
                  {craftable.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => {
                        setMode("calculate");
                        const foundItem = items.find((i) => i.id === item.id);
                        if (foundItem) {
                          handleSelect(foundItem);
                        }
                      }}
                      className="flex items-center justify-between bg-dark-input rounded-lg px-3 sm:px-4 py-3 border border-gold/5 hover:border-accent/50 hover:bg-accent/5 transition-all text-left group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`category-dot category-${item.category} flex-shrink-0`} />
                        <span className="text-gray-300 group-hover:text-white transition-colors truncate">
                          {item.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 ml-2">
                        <span className="text-sm text-gray-500 hidden sm:inline">
                          needs ×{item.formatted}
                        </span>
                        <span className="text-gray-500 sm:hidden text-xs">
                          ×{item.formatted}
                        </span>
                        <span className="text-gray-600 group-hover:text-accent transition-colors">
                          →
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No items use this material
                </div>
              )}
            </Card>
          )}
        </div>
      </div>
    </MainLayout>
  );
}
