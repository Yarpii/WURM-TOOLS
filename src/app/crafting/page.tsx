"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import type { ItemSearchResult, ItemDetail, Category } from "@/lib/items-api";

// API base - relative fetch works when both are on same domain, otherwise use full URL
const API_BASE = process.env.NEXT_PUBLIC_ITEMS_API_URL || "https://items.wurm.tools";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export default function CraftingPage() {
  const [query, setQuery] = useState("");
  const [items, setItems] = useState<ItemSearchResult[]>([]);
  const [selectedItem, setSelectedItem] = useState<ItemDetail | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [loading, setLoading] = useState(false);
  const [itemLoading, setItemLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [apiStatus, setApiStatus] = useState<"loading" | "online" | "offline">("loading");
  const dropdownRef = useRef<HTMLDivElement>(null);
  const searchTimeout = useRef<NodeJS.Timeout>();

  // Check API health on mount
  useEffect(() => {
    apiFetch<{ status: string; pages_count: number }>("/api/health")
      .then(() => setApiStatus("online"))
      .catch(() => setApiStatus("offline"));

    apiFetch<Category[]>("/api/categories")
      .then(setCategories)
      .catch(console.error);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Search with debounce
  useEffect(() => {
    if (searchTimeout.current) clearTimeout(searchTimeout.current);

    if (!query.trim()) {
      setItems([]);
      return;
    }

    searchTimeout.current = setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ q: query });
        if (selectedCategory) params.set("category", selectedCategory);
        const data = await apiFetch<{ items: ItemSearchResult[] }>(`/api/items?${params}`);
        setItems(data.items);
        setShowDropdown(true);
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setLoading(false);
      }
    }, 200);

    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [query, selectedCategory]);

  const selectItem = async (item: ItemSearchResult) => {
    setShowDropdown(false);
    setQuery(item.title);
    setItemLoading(true);
    try {
      const detail = await apiFetch<ItemDetail>(`/api/items/${encodeURIComponent(item.slug)}`);
      setSelectedItem(detail);
    } catch (err) {
      console.error("Failed to load item:", err);
    } finally {
      setItemLoading(false);
    }
  };

  const getImageUrl = (path: string | null) => {
    if (!path) return null;
    if (path.startsWith("http")) return path;
    return `https://wurmpedia.com${path}`;
  };

  return (
    <div className="min-h-screen py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-text-primary mb-2">Crafting</h1>
              <p className="text-text-secondary">
                Search items and view their recipes from the Wurmpedia
              </p>
            </div>
            <div className={`px-3 py-1 rounded-full text-sm ${
              apiStatus === "online" ? "bg-success/20 text-success" :
              apiStatus === "offline" ? "bg-danger/20 text-danger" :
              "bg-warning/20 text-warning"
            }`}>
              {apiStatus === "online" ? "API Online" : apiStatus === "offline" ? "API Offline" : "Connecting..."}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Search Panel */}
          <div className="space-y-4">
            {/* Search Input */}
            <div className="bg-bg-secondary rounded-xl border border-border p-4">
              <label className="block text-sm font-medium text-text-primary mb-2">Search Item</label>
              <div className="relative" ref={dropdownRef}>
                <input
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onFocus={() => items.length > 0 && setShowDropdown(true)}
                  placeholder="Search items... (e.g., barrel, sword, anvil)"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
                />
                {loading && (
                  <div className="absolute right-3 top-1/2 -translate-y-1/2">
                    <div className="animate-spin w-5 h-5 border-2 border-accent border-t-transparent rounded-full" />
                  </div>
                )}

                {/* Dropdown */}
                {showDropdown && items.length > 0 && (
                  <div className="absolute top-full left-0 right-0 mt-1 bg-bg-secondary rounded-lg border border-border shadow-xl z-50 max-h-80 overflow-y-auto">
                    {items.map((item) => (
                      <button
                        key={item.slug}
                        onClick={() => selectItem(item)}
                        className="w-full px-4 py-3 text-left flex items-center gap-3 hover:bg-bg-hover transition-colors border-b border-border last:border-0"
                      >
                        {item.image_src && (
                          <img
                            src={getImageUrl(item.image_src)!}
                            alt=""
                            className="w-8 h-8 object-contain rounded"
                            onError={(e) => (e.currentTarget.style.display = "none")}
                          />
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="text-text-primary font-medium truncate">{item.title}</div>
                          <div className="text-xs text-text-muted">{item.slug}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Category Filter */}
              <div className="mt-4">
                <label className="block text-sm text-text-secondary mb-2">Category Filter</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Quick Info when item selected */}
            {selectedItem && (
              <div className="bg-bg-secondary rounded-xl border border-border p-4">
                <h3 className="text-sm font-medium text-text-primary mb-3">Quick Info</h3>
                <div className="space-y-2 text-sm">
                  {selectedItem.skill && (
                    <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                      <span className="text-text-muted">Skill</span>
                      <span className="text-text-primary font-medium">{selectedItem.skill}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                    <span className="text-text-muted">Materials</span>
                    <span className="text-accent font-medium">{selectedItem.materials.length}</span>
                  </div>
                  {selectedItem.tools.length > 0 && (
                    <div className="flex justify-between items-center p-2 bg-bg-tertiary rounded-lg">
                      <span className="text-text-muted">Tools</span>
                      <span className="text-text-primary font-medium">{selectedItem.tools.length}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-2 space-y-4">
            {itemLoading && (
              <div className="bg-bg-secondary rounded-xl border border-border p-12 flex items-center justify-center">
                <div className="animate-spin text-4xl">⚙</div>
              </div>
            )}

            {!itemLoading && !selectedItem && (
              <div className="bg-bg-secondary rounded-xl border border-border p-12 text-center">
                <div className="text-6xl mb-4 opacity-20">🔍</div>
                <h3 className="text-lg text-text-secondary mb-2">Search for an Item</h3>
                <p className="text-text-muted text-sm">
                  Type an item name to see its recipe and crafting details
                </p>
              </div>
            )}

            {!itemLoading && selectedItem && (
              <>
                {/* Item Header */}
                <div className="bg-bg-secondary rounded-xl border border-border p-6">
                  <div className="flex items-start gap-6">
                    {selectedItem.image && (
                      <img
                        src={getImageUrl(selectedItem.image)!}
                        alt={selectedItem.title}
                        className="w-24 h-24 object-contain rounded-lg border border-border bg-bg-tertiary"
                        onError={(e) => (e.currentTarget.style.display = "none")}
                      />
                    )}
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-text-primary mb-2">{selectedItem.title}</h2>
                      {selectedItem.skill && (
                        <div className="text-text-secondary mb-2">
                          Skill: <span className="text-accent font-medium">{selectedItem.skill}</span>
                        </div>
                      )}
                      {selectedItem.categories.length > 0 && (
                        <div className="flex flex-wrap gap-2">
                          {selectedItem.categories.slice(0, 5).map((cat) => (
                            <span key={cat} className="px-2 py-1 bg-bg-tertiary rounded text-xs text-text-muted">
                              {cat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Materials */}
                {selectedItem.materials.length > 0 && (
                  <div className="bg-bg-secondary rounded-xl border border-border p-4">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Materials</h3>
                    <div className="space-y-2">
                      {selectedItem.materials.map((mat, i) => (
                        <div key={i} className="flex items-center justify-between bg-bg-tertiary rounded-lg px-4 py-3 border border-border">
                          <div className="flex items-center gap-3">
                            <span className="w-2 h-2 rounded-full bg-accent" />
                            <span className="text-text-primary">{mat.raw}</span>
                          </div>
                          {mat.links && mat.links.length > 0 && (
                            <button
                              onClick={() => {
                                const link = mat.links![0];
                                const slug = link.href.replace(/^\/wiki\//, "").replace(/^\//, "");
                                setQuery(link.text || slug);
                                // Trigger search for the linked item
                                apiFetch<{ items: ItemSearchResult[] }>(`/api/items?q=${encodeURIComponent(link.text || slug)}`)
                                  .then(data => {
                                    if (data.items.length > 0) {
                                      selectItem(data.items[0]);
                                    }
                                  });
                              }}
                              className="text-accent text-sm hover:underline"
                            >
                              View →
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Tools */}
                {selectedItem.tools.length > 0 && (
                  <div className="bg-bg-secondary rounded-xl border border-border p-4">
                    <h3 className="text-lg font-semibold text-text-primary mb-4">Tools Required</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedItem.tools.map((tool, i) => (
                        <span key={i} className="px-3 py-2 bg-bg-tertiary rounded-lg border border-border text-text-primary">
                          {tool.raw}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* All Infobox Fields (expandable) */}
                {selectedItem.infobox && Object.keys(selectedItem.infobox.fields).length > 0 && (
                  <details className="group">
                    <summary className="bg-bg-secondary rounded-xl border border-border p-4 cursor-pointer text-text-primary font-medium list-none flex justify-between items-center">
                      <span>All Infobox Data</span>
                      <span className="text-text-muted group-open:rotate-180 transition-transform">▼</span>
                    </summary>
                    <div className="bg-bg-secondary rounded-b-xl border border-t-0 border-border p-4 -mt-2 space-y-4">
                      {Object.entries(selectedItem.infobox.fields).map(([section, items]) => (
                        <div key={section}>
                          <h4 className="text-sm font-medium text-text-secondary mb-2">{section}</h4>
                          <div className="space-y-1">
                            {items.map((item, i) => (
                              <div key={i} className="text-sm text-text-primary bg-bg-tertiary rounded px-3 py-2">
                                {item.raw}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </details>
                )}

                {/* Wurmpedia Link */}
                <div className="text-center">
                  <a
                    href={`https://wurmpedia.com/wiki/${selectedItem.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-accent hover:underline text-sm"
                  >
                    View on Wurmpedia →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Feature Section */}
        <div className="mt-16">
          <h2 className="text-xl font-semibold mb-6 text-center">Explore More Tools</h2>
          <div className="grid md:grid-cols-3 gap-4">
            <Link href="/cooking" className="block bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent/50 transition-all">
              <h3 className="font-semibold mb-2">Cooking</h3>
              <p className="text-text-secondary text-sm">Calculate affinities and nutrition values.</p>
            </Link>
            <Link href="/market" className="block bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent/50 transition-all">
              <h3 className="font-semibold mb-2">Market</h3>
              <p className="text-text-secondary text-sm">Buy and sell items with other players.</p>
            </Link>
            <Link href="/skills" className="block bg-bg-secondary border border-border rounded-xl p-6 hover:border-accent/50 transition-all">
              <h3 className="font-semibold mb-2">Skills</h3>
              <p className="text-text-secondary text-sm">Track your skill progression.</p>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
