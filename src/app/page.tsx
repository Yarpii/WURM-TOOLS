"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { Item, CraftingNode, MaterialResult } from "@/lib/types";

export default function Home() {
  const [mode, setMode] = useState<"calculate" | "reverse">("calculate");
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
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/items")
      .then((r) => r.json())
      .then(setItems);
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

    if (mode === "calculate") {
      const res = await fetch(
        `/api/calculate?item=${item.id}&qty=${quantity}`
      );
      const data = await res.json();
      setMaterials(data.materials || []);
      setTree(data.tree || null);
    } else {
      const res = await fetch(
        `/api/reverse?item=${item.id}&all=${includeIndirect ? "1" : "0"}`
      );
      const data = await res.json();
      setCraftable(data);
    }
  };

  useEffect(() => {
    if (selectedItem && mode === "reverse") {
      doAction();
    }
  }, [includeIndirect]);

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
    <div key={`${node.id}-${node.depth}`}>
      <div
        className={`flex items-center gap-2 py-2 ${
          node.is_base ? "text-success" : ""
        }`}
      >
        <span className={`category-dot category-${node.category}`} />
        <span>{node.name}</span>
        <span className="text-gray-500 text-sm">
          &times;{node.quantity % 1 === 0 ? node.quantity : node.quantity.toFixed(2)}
        </span>
      </div>
      {node.children.length > 0 && (
        <div className="pl-5 border-l-2 border-white/10 ml-2">
          {node.children.map(renderTree)}
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <header className="text-center mb-8">
        <h1 className="text-4xl font-bold">
          <span className="text-accent">Wurm</span>
          <span>Calc</span>
        </h1>
        <p className="text-gray-400 mt-2">
          Calculate total base materials for any craftable item
        </p>
      </header>

      {/* Mode Switcher */}
      <div className="flex gap-3 mb-4">
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            mode === "calculate"
              ? "border-accent text-white"
              : "border-transparent bg-dark-input text-gray-400 hover:text-white"
          }`}
          onClick={() => {
            setMode("calculate");
            setQuery("");
            setSelectedItem(null);
          }}
        >
          Calculate Materials
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            mode === "reverse"
              ? "border-accent text-white"
              : "border-transparent bg-dark-input text-gray-400 hover:text-white"
          }`}
          onClick={() => {
            setMode("reverse");
            setQuery("");
            setSelectedItem(null);
          }}
        >
          Reverse Lookup
        </button>
      </div>

      {/* Search Form */}
      <div className="bg-dark-card p-6 rounded-xl mb-6 flex gap-4 flex-wrap items-end">
        <div className="flex-1 min-w-[200px] relative">
          <label className="block text-gray-400 text-sm mb-2">
            Search Item
          </label>
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
            placeholder="Type to search..."
            className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
          />
          {showDropdown && query && filteredItems.length > 0 && (
            <div className="absolute top-full left-0 right-0 bg-dark-card rounded-b-lg shadow-xl z-50 max-h-72 overflow-y-auto">
              {filteredItems.slice(0, 10).map((item, i) => (
                <div
                  key={item.id}
                  className={`px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-white/10 ${
                    i === selectedIndex ? "bg-white/10" : ""
                  }`}
                  onClick={() => handleSelect(item)}
                >
                  <span className={`category-dot category-${item.category}`} />
                  <span>{item.name}</span>
                  <span
                    className={`text-xs px-2 py-0.5 rounded ${
                      item.is_base_material
                        ? "bg-success"
                        : "bg-accent"
                    }`}
                  >
                    {item.is_base_material ? "Base" : "Crafted"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {mode === "calculate" && (
          <div>
            <label className="block text-gray-400 text-sm mb-2">
              Quantity
            </label>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
              min={1}
              max={1000}
              className="w-28 px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>
        )}

        <button
          onClick={() => doAction()}
          className="px-8 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
        >
          {mode === "calculate" ? "Calculate" : "Find Uses"}
        </button>
      </div>

      {/* Results */}
      {mode === "calculate" ? (
        <div className="grid md:grid-cols-2 gap-6">
          {/* Materials List */}
          <div className="bg-dark-card p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4 flex items-center gap-2">
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
                  d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4"
                />
              </svg>
              Total Base Materials
            </h2>
            {materials.length > 0 ? (
              <ul className="space-y-2">
                {materials.map((mat) => (
                  <li
                    key={mat.id}
                    className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10"
                  >
                    <span className="flex items-center gap-2">
                      <span
                        className={`category-dot category-${mat.category}`}
                      />
                      {mat.name}
                    </span>
                    <span className="text-success font-bold">
                      &times;{mat.formatted}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="text-center text-gray-500 py-10">
                Select an item to see required materials
              </div>
            )}
          </div>

          {/* Crafting Tree */}
          <div className="bg-dark-card p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4 flex items-center gap-2">
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
                  d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                />
              </svg>
              Crafting Tree
            </h2>
            {tree ? (
              renderTree(tree)
            ) : (
              <div className="text-center text-gray-500 py-10">
                Crafting breakdown will appear here
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Reverse Lookup Results */
        <div className="bg-dark-card p-6 rounded-xl">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-accent text-xl font-semibold flex items-center gap-2">
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
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              {selectedItem
                ? `Uses for: ${selectedItem.name}`
                : "What can I make?"}
            </h2>
            <label className="flex items-center gap-2 text-sm text-gray-400 cursor-pointer">
              <input
                type="checkbox"
                checked={includeIndirect}
                onChange={(e) => setIncludeIndirect(e.target.checked)}
                className="rounded"
              />
              Include indirect uses
            </label>
          </div>
          {craftable.length > 0 ? (
            <div className="grid gap-2">
              {craftable.map((item) => (
                <div
                  key={item.id}
                  className="flex justify-between items-center p-3 bg-white/5 rounded-lg hover:bg-white/10 cursor-pointer"
                  onClick={() => {
                    setMode("calculate");
                    const found = items.find((i) => i.id === item.id);
                    if (found) {
                      setSelectedItem(found);
                      setQuery(found.name);
                      fetch(`/api/calculate?item=${found.id}&qty=${quantity}`)
                        .then((r) => r.json())
                        .then((data) => {
                          setMaterials(data.materials || []);
                          setTree(data.tree || null);
                        });
                    }
                  }}
                >
                  <span className="flex items-center gap-2">
                    <span className={`category-dot category-${item.category}`} />
                    {item.name}
                  </span>
                  <span className="text-gray-400 text-sm">
                    needs &times;{item.formatted}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-10">
              {selectedItem
                ? "This item is not used in any recipes"
                : "Select an item to see what you can craft with it"}
            </div>
          )}
        </div>
      )}

      {/* Footer & Links */}
      <footer className="text-center mt-10 text-gray-500">
        <p>
          WurmCalc &mdash; A crafting calculator for{" "}
          <a
            href="https://www.wurmonline.com/"
            target="_blank"
            className="text-accent hover:underline"
          >
            WURM Online
          </a>
        </p>
      </footer>

      <div className="fixed bottom-5 right-5 flex gap-3">
        <Link
          href="/data"
          className="px-5 py-2.5 bg-dark-card text-gray-400 hover:bg-accent hover:text-white rounded-lg transition-colors"
        >
          Data
        </Link>
        <Link
          href="/admin"
          className="px-5 py-2.5 bg-dark-card text-gray-400 hover:bg-accent hover:text-white rounded-lg transition-colors"
        >
          Admin
        </Link>
      </div>
    </div>
  );
}
