"use client";

import { useState, useEffect, useCallback } from "react";
import type { Item, MaterialResult } from "@/lib/types";

interface SessionItem {
  item: Item;
  quantity: number;
}

interface CombinedMaterial {
  id: number;
  name: string;
  totalQuantity: number;
  usedBy: string[];
  is_base: boolean;
}

interface SessionPlannerProps {
  items: Item[];
}

export default function SessionPlanner({ items }: SessionPlannerProps) {
  const [sessionItems, setSessionItems] = useState<SessionItem[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [combinedMaterials, setCombinedMaterials] = useState<CombinedMaterial[]>([]);
  const [craftOrder, setCraftOrder] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [sessionName, setSessionName] = useState("My Crafting Session");

  // Filter items for search
  const filteredItems = items.filter(
    (item) =>
      !item.is_base_material &&
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !sessionItems.some((si) => si.item.id === item.id)
  );

  // Add item to session
  const addItem = (item: Item) => {
    setSessionItems((prev) => [...prev, { item, quantity: 1 }]);
    setSearchTerm("");
    setSearchOpen(false);
  };

  // Remove item from session
  const removeItem = (itemId: number) => {
    setSessionItems((prev) => prev.filter((si) => si.item.id !== itemId));
  };

  // Update item quantity
  const updateQuantity = (itemId: number, quantity: number) => {
    setSessionItems((prev) =>
      prev.map((si) =>
        si.item.id === itemId ? { ...si, quantity: Math.max(1, quantity) } : si
      )
    );
  };

  // Calculate combined materials when session changes
  const calculateSession = useCallback(async () => {
    if (sessionItems.length === 0) {
      setCombinedMaterials([]);
      setCraftOrder([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch materials for each item
      const allMaterials: Map<number, CombinedMaterial> = new Map();
      const itemsToProcess: string[] = [];

      for (const sessionItem of sessionItems) {
        const res = await fetch(
          `/api/calculate?item=${sessionItem.item.id}&qty=${sessionItem.quantity}&mode=full&source=wurmpedia`
        );
        if (res.ok) {
          const data = await res.json();

          // Track the main item for craft order
          itemsToProcess.push(sessionItem.item.name);

          // Combine materials
          for (const mat of data.materials as MaterialResult[]) {
            const existing = allMaterials.get(mat.id);
            if (existing) {
              existing.totalQuantity += mat.quantity;
              if (!existing.usedBy.includes(sessionItem.item.name)) {
                existing.usedBy.push(sessionItem.item.name);
              }
            } else {
              allMaterials.set(mat.id, {
                id: mat.id,
                name: mat.name,
                totalQuantity: mat.quantity,
                usedBy: [sessionItem.item.name],
                is_base: mat.is_base ?? false,
              });
            }
          }
        }
      }

      // Sort: shared materials first (used by multiple items), then by quantity
      const sortedMaterials = Array.from(allMaterials.values()).sort((a, b) => {
        // Base materials first
        if (a.is_base !== b.is_base) return a.is_base ? -1 : 1;
        // Shared materials second
        if (a.usedBy.length !== b.usedBy.length) return b.usedBy.length - a.usedBy.length;
        // Then by quantity
        return b.totalQuantity - a.totalQuantity;
      });

      setCombinedMaterials(sortedMaterials);

      // Determine optimal craft order (simple: base materials first, then complex items)
      // A smarter algorithm would analyze dependencies, but this is a good start
      const baseMaterials = sortedMaterials.filter((m) => m.is_base).map((m) => m.name);
      const craftedItems = sortedMaterials.filter((m) => !m.is_base).map((m) => m.name);

      setCraftOrder([
        ...baseMaterials.slice(0, 3).map((m) => `Gather: ${m}`),
        baseMaterials.length > 3 ? `...and ${baseMaterials.length - 3} more base materials` : "",
        ...craftedItems.slice(0, 5).map((m) => `Craft: ${m}`),
        ...itemsToProcess.map((i) => `Assemble: ${i}`),
      ].filter(Boolean));

    } catch (err) {
      console.error("Failed to calculate session:", err);
    } finally {
      setLoading(false);
    }
  }, [sessionItems]);

  // Recalculate when session items change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateSession();
    }, 300);
    return () => clearTimeout(timer);
  }, [calculateSession]);

  // Export session as text
  const exportSession = () => {
    let text = `=== ${sessionName} ===\n\n`;
    text += "Items to Craft:\n";
    sessionItems.forEach((si) => {
      text += `  - ${si.item.name} x${si.quantity}\n`;
    });
    text += "\nBase Materials Needed:\n";
    combinedMaterials
      .filter((m) => m.is_base)
      .forEach((m) => {
        text += `  - ${m.name}: ${m.totalQuantity.toFixed(m.totalQuantity % 1 === 0 ? 0 : 2)}`;
        if (m.usedBy.length > 1) {
          text += ` (shared by ${m.usedBy.length} items)`;
        }
        text += "\n";
      });
    text += "\nIntermediate Items:\n";
    combinedMaterials
      .filter((m) => !m.is_base)
      .forEach((m) => {
        text += `  - ${m.name}: ${m.totalQuantity.toFixed(m.totalQuantity % 1 === 0 ? 0 : 2)}\n`;
      });

    navigator.clipboard.writeText(text);
    alert("Session copied to clipboard!");
  };

  return (
    <div className="space-y-4">
      {/* Session Header */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex-1">
            <input
              type="text"
              value={sessionName}
              onChange={(e) => setSessionName(e.target.value)}
              className="text-xl font-semibold bg-transparent border-none focus:outline-none text-text-primary w-full"
              placeholder="Session Name"
            />
            <p className="text-text-muted text-sm mt-1">
              Plan multiple items and see combined material requirements
            </p>
          </div>
          <div className="flex gap-2">
            {sessionItems.length > 0 && (
              <>
                <button
                  onClick={exportSession}
                  className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-sm hover:border-accent transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  onClick={() => setSessionItems([])}
                  className="px-4 py-2 bg-red-500/10 border border-red-500/30 text-red-400 rounded-lg text-sm hover:bg-red-500/20 transition-colors"
                >
                  Clear All
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Item Selection & Session Items */}
        <div className="space-y-4">
          {/* Add Item Search */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Add Items to Session</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search items to add..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
              />
              {searchOpen && searchTerm && filteredItems.length > 0 && (
                <div className="absolute z-20 w-full mt-1 max-h-60 overflow-auto bg-bg-secondary border border-border rounded-lg shadow-xl">
                  {filteredItems.slice(0, 15).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addItem(item)}
                      className="w-full text-left px-4 py-2 hover:bg-bg-hover transition-colors flex items-center justify-between"
                    >
                      <span>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-text-muted text-sm ml-2">({item.skill || item.categories?.[0] || "misc"})</span>
                      </span>
                      <span className="text-accent">+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Session Items List */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3">
              Session Items ({sessionItems.length})
            </h3>
            {sessionItems.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2 opacity-20">&#128221;</div>
                <p className="text-text-muted text-sm">
                  Add items above to start planning your crafting session
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {sessionItems.map((si) => (
                  <div
                    key={si.item.id}
                    className="flex items-center gap-3 p-3 bg-bg-tertiary rounded-lg"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-text-primary truncate">
                        {si.item.name}
                      </div>
                      <div className="text-xs text-text-muted">{si.item.skill || si.item.categories?.[0] || "misc"}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => updateQuantity(si.item.id, si.quantity - 1)}
                        className="w-7 h-7 rounded bg-bg-secondary hover:bg-bg-hover flex items-center justify-center"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        value={si.quantity}
                        onChange={(e) =>
                          updateQuantity(si.item.id, parseInt(e.target.value) || 1)
                        }
                        className="w-14 text-center bg-bg-secondary border border-border rounded px-2 py-1 text-sm"
                      />
                      <button
                        onClick={() => updateQuantity(si.item.id, si.quantity + 1)}
                        className="w-7 h-7 rounded bg-bg-secondary hover:bg-bg-hover flex items-center justify-center"
                      >
                        +
                      </button>
                      <button
                        onClick={() => removeItem(si.item.id)}
                        className="w-7 h-7 rounded bg-red-500/10 hover:bg-red-500/20 text-red-400 flex items-center justify-center ml-2"
                      >
                        &#10005;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle: Combined Materials */}
        <div className="bg-bg-secondary border border-border rounded-xl p-4">
          <h3 className="font-semibold mb-3">
            Combined Materials
            {loading && <span className="ml-2 animate-spin inline-block">&#9881;</span>}
          </h3>

          {combinedMaterials.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-2 opacity-20">&#128230;</div>
              <p className="text-text-muted text-sm">
                Materials will appear here when you add items
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Base Materials */}
              <div>
                <h4 className="text-sm font-medium text-blue-400 mb-2">
                  Base Materials ({combinedMaterials.filter((m) => m.is_base).length})
                </h4>
                <div className="space-y-1 max-h-[250px] overflow-y-auto">
                  {combinedMaterials
                    .filter((m) => m.is_base)
                    .map((mat) => (
                      <div
                        key={mat.id}
                        className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                          mat.usedBy.length > 1
                            ? "bg-amber-500/10 border border-amber-500/30"
                            : "bg-bg-tertiary"
                        }`}
                      >
                        <div className="flex-1 min-w-0">
                          <span className="text-text-primary">{mat.name}</span>
                          {mat.usedBy.length > 1 && (
                            <span className="text-amber-400 text-xs ml-2">
                              (shared: {mat.usedBy.length})
                            </span>
                          )}
                        </div>
                        <span className="text-accent font-mono font-medium ml-2">
                          x{mat.totalQuantity.toFixed(mat.totalQuantity % 1 === 0 ? 0 : 2)}
                        </span>
                      </div>
                    ))}
                </div>
              </div>

              {/* Intermediate Items */}
              {combinedMaterials.filter((m) => !m.is_base).length > 0 && (
                <div>
                  <h4 className="text-sm font-medium text-purple-400 mb-2">
                    Intermediate Items ({combinedMaterials.filter((m) => !m.is_base).length})
                  </h4>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {combinedMaterials
                      .filter((m) => !m.is_base)
                      .map((mat) => (
                        <div
                          key={mat.id}
                          className={`flex items-center justify-between p-2 rounded-lg text-sm ${
                            mat.usedBy.length > 1
                              ? "bg-amber-500/10 border border-amber-500/30"
                              : "bg-bg-tertiary"
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-text-primary">{mat.name}</span>
                            {mat.usedBy.length > 1 && (
                              <span className="text-amber-400 text-xs ml-2">
                                (shared: {mat.usedBy.length})
                              </span>
                            )}
                          </div>
                          <span className="text-accent font-mono font-medium ml-2">
                            x{mat.totalQuantity.toFixed(mat.totalQuantity % 1 === 0 ? 0 : 2)}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Craft Order & Summary */}
        <div className="space-y-4">
          {/* Suggested Craft Order */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Suggested Order</h3>
            {craftOrder.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-2 opacity-20">&#128203;</div>
                <p className="text-text-muted text-sm">
                  Optimal craft order will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {craftOrder.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-2 bg-bg-tertiary rounded-lg text-sm"
                  >
                    <span className="w-6 h-6 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {i + 1}
                    </span>
                    <span className="text-text-primary">{step}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Session Summary */}
          {sessionItems.length > 0 && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="font-semibold mb-3">Summary</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-text-muted">Items to craft</span>
                  <span className="text-text-primary font-medium">{sessionItems.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Total quantity</span>
                  <span className="text-text-primary font-medium">
                    {sessionItems.reduce((sum, si) => sum + si.quantity, 0)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Unique base materials</span>
                  <span className="text-blue-400 font-medium">
                    {combinedMaterials.filter((m) => m.is_base).length}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-text-muted">Shared materials</span>
                  <span className="text-amber-400 font-medium">
                    {combinedMaterials.filter((m) => m.usedBy.length > 1).length}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
