"use client";

import { useState, useEffect, useCallback } from "react";
import type { Item } from "@/lib/types";

interface SuggestedRecipe {
  item: Item;
  matchedMaterials: string[];
  missingMaterials: string[];
  matchPercentage: number;
}

interface RecipeSuggestionsProps {
  items: Item[];
}

export default function RecipeSuggestions({ items }: RecipeSuggestionsProps) {
  const [selectedMaterials, setSelectedMaterials] = useState<Item[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);
  const [suggestions, setSuggestions] = useState<SuggestedRecipe[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFullMatches, setShowFullMatches] = useState(true);
  const [showPartialMatches, setShowPartialMatches] = useState(true);

  // Filter base materials for search
  const baseItems = items.filter((item) => item.is_base_material);
  const filteredMaterials = baseItems.filter(
    (item) =>
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
      !selectedMaterials.some((m) => m.id === item.id)
  );

  // Add material to selection
  const addMaterial = (item: Item) => {
    setSelectedMaterials((prev) => [...prev, item]);
    setSearchTerm("");
    setSearchOpen(false);
  };

  // Remove material from selection
  const removeMaterial = (itemId: number) => {
    setSelectedMaterials((prev) => prev.filter((m) => m.id !== itemId));
  };

  // Calculate suggestions based on selected materials
  const calculateSuggestions = useCallback(async () => {
    if (selectedMaterials.length === 0) {
      setSuggestions([]);
      return;
    }

    setLoading(true);
    try {
      // Fetch what recipes each material is used in
      const materialIds = selectedMaterials.map((m) => m.id);

      const res = await fetch(`/api/recipes/suggestions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ materialIds }),
      });

      if (res.ok) {
        const data = await res.json();
        setSuggestions(data.suggestions || []);
      } else {
        // If the API doesn't exist yet, use a local calculation
        // This finds all craftable items and checks their ingredients
        const craftableItems = items.filter((item) => !item.is_base_material);
        const newSuggestions: SuggestedRecipe[] = [];

        for (const craftableItem of craftableItems) {
          // Fetch the recipe for this item
          const recipeRes = await fetch(`/api/calculate?item=${craftableItem.id}&qty=1&mode=full&source=wurmpedia`);
          if (recipeRes.ok) {
            const recipeData = await recipeRes.json();
            const ingredients = recipeData.materials || [];

            if (ingredients.length === 0) continue;

            const ingredientNames = ingredients.map((m: { name: string }) => m.name.toLowerCase());
            const selectedNames = selectedMaterials.map((m) => m.name.toLowerCase());

            const matched = ingredientNames.filter((name: string) =>
              selectedNames.includes(name)
            );
            const missing = ingredientNames.filter(
              (name: string) => !selectedNames.includes(name)
            );

            if (matched.length > 0) {
              newSuggestions.push({
                item: craftableItem,
                matchedMaterials: matched,
                missingMaterials: missing,
                matchPercentage: Math.round((matched.length / ingredientNames.length) * 100),
              });
            }
          }
        }

        // Sort by match percentage (highest first)
        newSuggestions.sort((a, b) => b.matchPercentage - a.matchPercentage);
        setSuggestions(newSuggestions);
      }
    } catch (err) {
      console.error("Failed to calculate suggestions:", err);
    } finally {
      setLoading(false);
    }
  }, [selectedMaterials, items]);

  // Recalculate when materials change
  useEffect(() => {
    const timer = setTimeout(() => {
      calculateSuggestions();
    }, 500);
    return () => clearTimeout(timer);
  }, [calculateSuggestions]);

  // Filter suggestions based on toggle settings
  const filteredSuggestions = suggestions.filter((s) => {
    if (s.matchPercentage === 100 && !showFullMatches) return false;
    if (s.matchPercentage < 100 && !showPartialMatches) return false;
    return true;
  });

  const fullMatches = suggestions.filter((s) => s.matchPercentage === 100);
  const partialMatches = suggestions.filter((s) => s.matchPercentage < 100);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-bg-secondary border border-border rounded-xl p-4">
        <h2 className="text-xl font-semibold mb-2">Smart Recipe Suggestions</h2>
        <p className="text-text-muted text-sm">
          Select the materials you have and discover what you can craft with them
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: Material Selection */}
        <div className="space-y-4">
          {/* Material Search */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="font-semibold mb-3">Your Materials</h3>
            <div className="relative">
              <input
                type="text"
                placeholder="Search materials..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSearchOpen(true);
                }}
                onFocus={() => setSearchOpen(true)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
              />
              {searchOpen && searchTerm && filteredMaterials.length > 0 && (
                <div className="absolute z-20 w-full mt-1 max-h-60 overflow-auto bg-bg-secondary border border-border rounded-lg shadow-xl">
                  {filteredMaterials.slice(0, 20).map((item) => (
                    <button
                      key={item.id}
                      onClick={() => addMaterial(item)}
                      className="w-full text-left px-4 py-2 hover:bg-bg-hover transition-colors flex items-center justify-between"
                    >
                      <span>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-text-muted text-sm ml-2">({item.category})</span>
                      </span>
                      <span className="text-accent">+</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Quick Add Common Materials */}
            <div className="mt-3">
              <p className="text-xs text-text-muted mb-2">Quick add common materials:</p>
              <div className="flex flex-wrap gap-1">
                {["Iron Lump", "Plank", "Shaft", "Nails", "Leather", "String", "Log", "Stone Brick"]
                  .map((name) => {
                    const item = baseItems.find(
                      (i) => i.name.toLowerCase() === name.toLowerCase()
                    );
                    if (!item || selectedMaterials.some((m) => m.id === item.id)) return null;
                    return (
                      <button
                        key={name}
                        onClick={() => addMaterial(item)}
                        className="px-2 py-1 text-xs bg-bg-tertiary hover:bg-bg-hover rounded border border-border transition-colors"
                      >
                        {name}
                      </button>
                    );
                  })
                  .filter(Boolean)}
              </div>
            </div>
          </div>

          {/* Selected Materials */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold">Selected ({selectedMaterials.length})</h3>
              {selectedMaterials.length > 0 && (
                <button
                  onClick={() => setSelectedMaterials([])}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Clear all
                </button>
              )}
            </div>

            {selectedMaterials.length === 0 ? (
              <div className="text-center py-6">
                <div className="text-4xl mb-2 opacity-20">&#128269;</div>
                <p className="text-text-muted text-sm">
                  Add materials to see what you can craft
                </p>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedMaterials.map((mat) => (
                  <div
                    key={mat.id}
                    className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 border border-blue-500/30 rounded-lg text-sm"
                  >
                    <span className="text-blue-400">{mat.name}</span>
                    <button
                      onClick={() => removeMaterial(mat.id)}
                      className="text-blue-400/60 hover:text-red-400 transition-colors"
                    >
                      &#10005;
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Middle & Right: Suggestions */}
        <div className="lg:col-span-2 space-y-4">
          {/* Filters */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-4">
                <h3 className="font-semibold">
                  Results
                  {loading && <span className="ml-2 animate-spin inline-block">&#9881;</span>}
                </h3>
                <div className="text-sm text-text-muted">
                  {fullMatches.length > 0 && (
                    <span className="text-green-400">{fullMatches.length} can craft now</span>
                  )}
                  {fullMatches.length > 0 && partialMatches.length > 0 && " • "}
                  {partialMatches.length > 0 && (
                    <span className="text-amber-400">{partialMatches.length} partial</span>
                  )}
                </div>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setShowFullMatches(!showFullMatches)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    showFullMatches
                      ? "bg-green-500/20 border-green-500/30 text-green-400"
                      : "bg-bg-tertiary border-border text-text-muted"
                  }`}
                >
                  Full Matches
                </button>
                <button
                  onClick={() => setShowPartialMatches(!showPartialMatches)}
                  className={`px-3 py-1.5 text-xs rounded-lg border transition-colors ${
                    showPartialMatches
                      ? "bg-amber-500/20 border-amber-500/30 text-amber-400"
                      : "bg-bg-tertiary border-border text-text-muted"
                  }`}
                >
                  Partial Matches
                </button>
              </div>
            </div>
          </div>

          {/* Suggestion Results */}
          {selectedMaterials.length === 0 ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
              <div className="text-6xl mb-4 opacity-20">&#128161;</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">
                What Can You Craft?
              </h3>
              <p className="text-text-muted text-sm max-w-md mx-auto">
                Add the materials you have available and we&apos;ll show you all the items
                you can craft - from full matches to recipes where you&apos;re just missing
                one or two ingredients.
              </p>
            </div>
          ) : filteredSuggestions.length === 0 && !loading ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-8 text-center">
              <div className="text-6xl mb-4 opacity-20">&#128533;</div>
              <h3 className="text-lg font-medium text-text-primary mb-2">No Matches Found</h3>
              <p className="text-text-muted text-sm">
                Try adding more materials or enable partial matches to see more options.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filteredSuggestions.slice(0, 24).map((suggestion) => (
                <div
                  key={suggestion.item.id}
                  className={`bg-bg-secondary border rounded-xl p-4 ${
                    suggestion.matchPercentage === 100
                      ? "border-green-500/30"
                      : "border-border"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <h4 className="font-medium text-text-primary">
                        {suggestion.item.name}
                      </h4>
                      <span className="text-xs text-text-muted">
                        {suggestion.item.category}
                      </span>
                    </div>
                    <div
                      className={`px-2 py-1 rounded text-xs font-medium ${
                        suggestion.matchPercentage === 100
                          ? "bg-green-500/20 text-green-400"
                          : suggestion.matchPercentage >= 50
                          ? "bg-amber-500/20 text-amber-400"
                          : "bg-red-500/20 text-red-400"
                      }`}
                    >
                      {suggestion.matchPercentage}%
                    </div>
                  </div>

                  {/* Matched Materials */}
                  <div className="mb-2">
                    <p className="text-xs text-text-muted mb-1">You have:</p>
                    <div className="flex flex-wrap gap-1">
                      {suggestion.matchedMaterials.map((mat, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 text-xs bg-green-500/10 text-green-400 rounded"
                        >
                          {mat}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* Missing Materials */}
                  {suggestion.missingMaterials.length > 0 && (
                    <div>
                      <p className="text-xs text-text-muted mb-1">Still need:</p>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.missingMaterials.map((mat, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 text-xs bg-red-500/10 text-red-400 rounded"
                          >
                            {mat}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Craft Button for full matches */}
                  {suggestion.matchPercentage === 100 && (
                    <button
                      onClick={() => {
                        // Navigate to calculator with this item
                        window.location.href = `/crafting?item=${suggestion.item.id}`;
                      }}
                      className="mt-3 w-full px-3 py-2 bg-green-500/20 border border-green-500/30 text-green-400 rounded-lg text-sm hover:bg-green-500/30 transition-colors"
                    >
                      View Recipe
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {filteredSuggestions.length > 24 && (
            <div className="text-center text-text-muted text-sm">
              Showing 24 of {filteredSuggestions.length} results. Add more materials to narrow down suggestions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
