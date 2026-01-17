"use client";

import { useState, useEffect } from "react";
import type {
  CookingCooker,
  CookingContainer,
  CookingPreparation,
  CookingIngredient,
  CookingIngredientCategory,
  CookingSkill,
  AffinityCalculationResult,
  CCFPCalculationResult,
  UserPlayerNumber,
  UserSavedRecipe,
  CookingRecipeComponent,
} from "@/lib/types";

type TabType = "affinity" | "ccfp" | "discover" | "saved";
type Rarity = "normal" | "rare" | "supreme" | "fantastic";

interface SelectedIngredient {
  ingredient: CookingIngredient;
  preparation_id: number | null;
  quantity: number;
  rarity: Rarity;
}

export default function CookingPage() {
  // Base data
  const [cookers, setCookers] = useState<CookingCooker[]>([]);
  const [containers, setContainers] = useState<CookingContainer[]>([]);
  const [preparations, setPreparations] = useState<CookingPreparation[]>([]);
  const [categories, setCategories] = useState<CookingIngredientCategory[]>([]);
  const [ingredients, setIngredients] = useState<CookingIngredient[]>([]);
  const [skills, setSkills] = useState<CookingSkill[]>([]);
  const [loading, setLoading] = useState(true);

  // UI State
  const [activeTab, setActiveTab] = useState<TabType>("affinity");
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Calculator State
  const [playerNumber, setPlayerNumber] = useState<number | null>(null);
  const [selectedCooker, setSelectedCooker] = useState<number | null>(null);
  const [selectedContainer, setSelectedContainer] = useState<number | null>(null);
  const [selectedIngredients, setSelectedIngredients] = useState<SelectedIngredient[]>([]);

  // Results
  const [affinityResult, setAffinityResult] = useState<AffinityCalculationResult | null>(null);
  const [ccfpResult, setCcfpResult] = useState<CCFPCalculationResult | null>(null);

  // Discovery State
  const [discoveryIngredient, setDiscoveryIngredient] = useState<number | null>(null);
  const [discoveryPreparation, setDiscoveryPreparation] = useState<number | null>(null);
  const [discoverySkill, setDiscoverySkill] = useState<number | null>(null);
  const [discoveredNumber, setDiscoveredNumber] = useState<number | null>(null);

  // User Data
  const [userPlayerNumbers, setUserPlayerNumbers] = useState<UserPlayerNumber[]>([]);
  const [savedRecipes, setSavedRecipes] = useState<UserSavedRecipe[]>([]);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [characterName, setCharacterName] = useState("");
  const [recipeName, setRecipeName] = useState("");

  // Search
  const [ingredientSearch, setIngredientSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);

  useEffect(() => {
    loadBaseData();
    loadUserData();
  }, []);

  useEffect(() => {
    if (selectedIngredients.length > 0) {
      calculateCCFP();
      if (playerNumber !== null) {
        calculateAffinity();
      }
    } else {
      setAffinityResult(null);
      setCcfpResult(null);
    }
  }, [selectedIngredients, selectedCooker, selectedContainer, playerNumber]);

  const loadBaseData = async () => {
    try {
      const res = await fetch("/api/cooking");
      const data = await res.json();
      setCookers(data.cookers || []);
      setContainers(data.containers || []);
      setPreparations(data.preparations || []);
      setCategories(data.categories || []);
      setSkills(data.skills || []);

      // Load ingredients
      const ingRes = await fetch("/api/cooking?action=ingredients");
      const ingData = await ingRes.json();
      setIngredients(ingData || []);
    } catch (err) {
      showMessage("error", "Failed to load cooking data");
    } finally {
      setLoading(false);
    }
  };

  const loadUserData = async () => {
    try {
      const res = await fetch("/api/cooking/user");
      if (res.ok) {
        const data = await res.json();
        setUserPlayerNumbers(data.playerNumbers || []);
        setSavedRecipes(data.recipes || []);
        setIsLoggedIn(true);

        // Set player number if available
        if (data.playerNumbers?.length > 0) {
          setPlayerNumber(data.playerNumbers[0].player_number);
        }
      }
    } catch {
      // Not logged in, that's ok
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const calculateAffinity = async () => {
    if (playerNumber === null) return;

    try {
      const res = await fetch("/api/cooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate-affinity",
          player_number: playerNumber,
          cooker_id: selectedCooker,
          container_id: selectedContainer,
          ingredients: selectedIngredients.map((i) => ({
            ingredient_id: i.ingredient.id,
            preparation_id: i.preparation_id,
            rarity: i.rarity,
          })),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setAffinityResult(result);
      }
    } catch (err) {
      console.error("Failed to calculate affinity:", err);
    }
  };

  const calculateCCFP = async () => {
    try {
      const res = await fetch("/api/cooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "calculate-ccfp",
          ingredients: selectedIngredients.map((i) => ({
            ingredient_id: i.ingredient.id,
            quantity: i.quantity,
          })),
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setCcfpResult(result);
      }
    } catch (err) {
      console.error("Failed to calculate CCFP:", err);
    }
  };

  const discoverPlayerNumber = async () => {
    if (discoveryIngredient === null || discoverySkill === null) {
      showMessage("error", "Select an ingredient and the resulting affinity skill");
      return;
    }

    try {
      const res = await fetch("/api/cooking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "discover-player-number",
          cooker_id: selectedCooker,
          container_id: selectedContainer,
          ingredient_id: discoveryIngredient,
          preparation_id: discoveryPreparation,
          result_skill_id: discoverySkill,
        }),
      });

      if (res.ok) {
        const result = await res.json();
        setDiscoveredNumber(result.player_number);
        setPlayerNumber(result.player_number);
        showMessage("success", `Your player number is ${result.player_number}`);
      }
    } catch (err) {
      showMessage("error", "Failed to calculate player number");
    }
  };

  const savePlayerNumber = async () => {
    if (playerNumber === null) return;

    try {
      const res = await fetch("/api/cooking/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-player-number",
          player_number: playerNumber,
          character_name: characterName || undefined,
        }),
      });

      if (res.ok) {
        showMessage("success", "Player number saved!");
        loadUserData();
      } else {
        showMessage("error", "Failed to save player number");
      }
    } catch {
      showMessage("error", "Failed to save player number");
    }
  };

  const saveRecipe = async () => {
    if (!recipeName.trim() || selectedIngredients.length === 0) {
      showMessage("error", "Enter a recipe name and add ingredients");
      return;
    }

    try {
      const res = await fetch("/api/cooking/user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "save-recipe",
          recipe_name: recipeName,
          cooker_id: selectedCooker,
          container_id: selectedContainer,
          ingredients: selectedIngredients.map((i) => ({
            ingredient_id: i.ingredient.id,
            ingredient_name: i.ingredient.name,
            preparation_id: i.preparation_id,
            quantity: i.quantity,
            rarity: i.rarity,
          })),
          player_number: playerNumber,
        }),
      });

      if (res.ok) {
        showMessage("success", "Recipe saved!");
        setRecipeName("");
        loadUserData();
      } else {
        showMessage("error", "Failed to save recipe");
      }
    } catch {
      showMessage("error", "Failed to save recipe");
    }
  };

  const deleteRecipe = async (recipeId: number) => {
    if (!confirm("Delete this recipe?")) return;

    try {
      const res = await fetch(`/api/cooking/user?recipe_id=${recipeId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", "Recipe deleted");
        loadUserData();
      }
    } catch {
      showMessage("error", "Failed to delete recipe");
    }
  };

  const addIngredient = (ingredient: CookingIngredient) => {
    if (selectedIngredients.find((i) => i.ingredient.id === ingredient.id)) {
      showMessage("error", "Ingredient already added");
      return;
    }

    setSelectedIngredients([
      ...selectedIngredients,
      {
        ingredient,
        preparation_id: null,
        quantity: 1,
        rarity: "normal",
      },
    ]);
  };

  const removeIngredient = (index: number) => {
    setSelectedIngredients(selectedIngredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, updates: Partial<SelectedIngredient>) => {
    setSelectedIngredients(
      selectedIngredients.map((ing, i) => (i === index ? { ...ing, ...updates } : ing))
    );
  };

  const filteredIngredients = ingredients.filter((ing) => {
    if (selectedCategory && ing.category_id !== selectedCategory) return false;
    if (ingredientSearch && !ing.name.toLowerCase().includes(ingredientSearch.toLowerCase()))
      return false;
    return true;
  });

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-bg-secondary rounded w-1/4"></div>
          <div className="h-64 bg-bg-secondary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Cooking Calculator</h1>
        <p className="text-text-secondary">
          Calculate affinities, CCFP nutrition, and discover your player number
        </p>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success" ? "bg-success/20 text-success" : "bg-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["affinity", "ccfp", "discover", "saved"] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:text-white"
            }`}
          >
            {tab === "affinity" && "Affinity Calculator"}
            {tab === "ccfp" && "CCFP Calculator"}
            {tab === "discover" && "Discover Player #"}
            {tab === "saved" && `Saved (${savedRecipes.length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Setup */}
        <div className="space-y-6">
          {/* Player Number */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="text-accent font-semibold mb-3">Player Number</h3>
            <div className="flex gap-2">
              <input
                type="number"
                min={0}
                max={137}
                value={playerNumber ?? ""}
                onChange={(e) =>
                  setPlayerNumber(e.target.value ? parseInt(e.target.value) : null)
                }
                placeholder="0-137"
                className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none"
              />
              {isLoggedIn && playerNumber !== null && (
                <button
                  onClick={savePlayerNumber}
                  className="px-3 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm"
                >
                  Save
                </button>
              )}
            </div>
            {playerNumber === null && (
              <p className="text-text-tertiary text-sm mt-2">
                Don&apos;t know your number?{" "}
                <button
                  onClick={() => setActiveTab("discover")}
                  className="text-accent hover:underline"
                >
                  Discover it
                </button>
              </p>
            )}
          </div>

          {/* Cooker Selection */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="text-accent font-semibold mb-3">Cooker</h3>
            <select
              value={selectedCooker ?? ""}
              onChange={(e) => setSelectedCooker(e.target.value ? parseInt(e.target.value) : null)}
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none"
            >
              <option value="">None</option>
              {cookers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (+{c.affinity_value})
                </option>
              ))}
            </select>
          </div>

          {/* Container Selection */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="text-accent font-semibold mb-3">Container</h3>
            <select
              value={selectedContainer ?? ""}
              onChange={(e) =>
                setSelectedContainer(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none"
            >
              <option value="">None</option>
              {containers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} (+{c.affinity_value})
                </option>
              ))}
            </select>
          </div>

          {/* Ingredient Search */}
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="text-accent font-semibold mb-3">Add Ingredients</h3>
            <input
              type="text"
              value={ingredientSearch}
              onChange={(e) => setIngredientSearch(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none mb-2"
            />
            <select
              value={selectedCategory ?? ""}
              onChange={(e) =>
                setSelectedCategory(e.target.value ? parseInt(e.target.value) : null)
              }
              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:border-accent focus:outline-none mb-2"
            >
              <option value="">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="max-h-48 overflow-y-auto space-y-1">
              {filteredIngredients.slice(0, 20).map((ing) => (
                <button
                  key={ing.id}
                  onClick={() => addIngredient(ing)}
                  className="w-full text-left px-3 py-2 bg-bg-tertiary hover:bg-accent/20 rounded text-sm flex justify-between"
                >
                  <span>{ing.name}</span>
                  <span className="text-text-tertiary">{ing.category_name}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Middle Column - Selected Ingredients */}
        <div className="space-y-6">
          <div className="bg-bg-secondary border border-border rounded-xl p-4">
            <h3 className="text-accent font-semibold mb-3">
              Selected Ingredients ({selectedIngredients.length})
            </h3>

            {selectedIngredients.length === 0 ? (
              <p className="text-text-tertiary text-center py-8">
                Add ingredients from the left panel
              </p>
            ) : (
              <div className="space-y-3 max-h-[500px] overflow-y-auto">
                {selectedIngredients.map((item, index) => (
                  <div key={index} className="bg-bg-tertiary p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <span className="font-medium">{item.ingredient.name}</span>
                      <button
                        onClick={() => removeIngredient(index)}
                        className="text-red-400 hover:text-red-300"
                      >
                        &times;
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <select
                        value={item.preparation_id ?? ""}
                        onChange={(e) =>
                          updateIngredient(index, {
                            preparation_id: e.target.value ? parseInt(e.target.value) : null,
                          })
                        }
                        className="px-2 py-1 bg-bg-secondary border border-border rounded text-xs"
                      >
                        <option value="">Whole</option>
                        {preparations.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={item.rarity}
                        onChange={(e) =>
                          updateIngredient(index, { rarity: e.target.value as Rarity })
                        }
                        className="px-2 py-1 bg-bg-secondary border border-border rounded text-xs"
                      >
                        <option value="normal">Normal</option>
                        <option value="rare">Rare</option>
                        <option value="supreme">Supreme</option>
                        <option value="fantastic">Fantastic</option>
                      </select>
                      <input
                        type="number"
                        min={0.1}
                        step={0.1}
                        value={item.quantity}
                        onChange={(e) =>
                          updateIngredient(index, { quantity: parseFloat(e.target.value) || 1 })
                        }
                        className="px-2 py-1 bg-bg-secondary border border-border rounded text-xs w-full"
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Save Recipe */}
            {isLoggedIn && selectedIngredients.length > 0 && (
              <div className="mt-4 pt-4 border-t border-border">
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={recipeName}
                    onChange={(e) => setRecipeName(e.target.value)}
                    placeholder="Recipe name..."
                    className="flex-1 px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm focus:border-accent focus:outline-none"
                  />
                  <button
                    onClick={saveRecipe}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm"
                  >
                    Save
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - Results */}
        <div className="space-y-6">
          {/* Affinity Result */}
          {activeTab === "affinity" && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="text-accent font-semibold mb-3">Affinity Result</h3>
              {playerNumber === null ? (
                <p className="text-text-tertiary text-center py-8">
                  Enter your player number to see affinity
                </p>
              ) : affinityResult ? (
                <div className="space-y-4">
                  <div className="text-center p-4 bg-accent/20 rounded-lg">
                    <div className="text-3xl font-bold text-accent">
                      {affinityResult.skill_name}
                    </div>
                    <div className="text-text-secondary text-sm">
                      Skill #{affinityResult.skill_id}
                    </div>
                  </div>

                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Player Number</span>
                      <span>{playerNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Cooker</span>
                      <span>+{affinityResult.breakdown.cooker}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-text-secondary">Container</span>
                      <span>+{affinityResult.breakdown.container}</span>
                    </div>
                    {affinityResult.breakdown.ingredients.map((ing, i) => (
                      <div key={i} className="flex justify-between">
                        <span className="text-text-secondary">{ing.name}</span>
                        <span>+{ing.total}</span>
                      </div>
                    ))}
                    <div className="flex justify-between font-bold pt-2 border-t border-border">
                      <span>Total</span>
                      <span>
                        {affinityResult.total_points} (mod 138 = {affinityResult.skill_id})
                      </span>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-text-tertiary text-center py-8">
                  Add ingredients to calculate affinity
                </p>
              )}
            </div>
          )}

          {/* CCFP Result */}
          {activeTab === "ccfp" && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="text-accent font-semibold mb-3">CCFP Nutrition</h3>
              {ccfpResult ? (
                <div className="space-y-4">
                  {/* Bars */}
                  {(["calories", "carbs", "fats", "proteins"] as const).map((key) => (
                    <div key={key}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="capitalize">{key}</span>
                        <span>
                          {ccfpResult.totals[key].toFixed(1)} ({ccfpResult.percentages[key].toFixed(1)}%)
                        </span>
                      </div>
                      <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            ccfpResult.percentages[key] >= 100
                              ? "bg-green-500"
                              : ccfpResult.percentages[key] >= 50
                                ? "bg-yellow-500"
                                : "bg-red-500"
                          }`}
                          style={{ width: `${Math.min(100, ccfpResult.percentages[key])}%` }}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Daily targets */}
                  <div className="text-xs text-text-tertiary pt-2 border-t border-border">
                    Daily: 2000 cal, 300 carbs, 80 fats, 50 proteins
                  </div>
                </div>
              ) : (
                <p className="text-text-tertiary text-center py-8">
                  Add ingredients to see nutrition
                </p>
              )}
            </div>
          )}

          {/* Player Number Discovery */}
          {activeTab === "discover" && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="text-accent font-semibold mb-3">Discover Player Number</h3>
              <p className="text-text-secondary text-sm mb-4">
                Cook a simple test meal (1 ingredient) and enter the resulting affinity skill to
                discover your unique player number.
              </p>

              <div className="space-y-3">
                <div>
                  <label className="text-sm text-text-secondary block mb-1">Test Ingredient</label>
                  <select
                    value={discoveryIngredient ?? ""}
                    onChange={(e) =>
                      setDiscoveryIngredient(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm"
                  >
                    <option value="">Select ingredient...</option>
                    {ingredients.map((ing) => (
                      <option key={ing.id} value={ing.id}>
                        {ing.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-text-secondary block mb-1">
                    Preparation (optional)
                  </label>
                  <select
                    value={discoveryPreparation ?? ""}
                    onChange={(e) =>
                      setDiscoveryPreparation(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm"
                  >
                    <option value="">Whole</option>
                    {preparations.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-sm text-text-secondary block mb-1">
                    Resulting Affinity Skill
                  </label>
                  <select
                    value={discoverySkill ?? ""}
                    onChange={(e) =>
                      setDiscoverySkill(e.target.value ? parseInt(e.target.value) : null)
                    }
                    className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm"
                  >
                    <option value="">Select skill...</option>
                    {skills.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <button
                  onClick={discoverPlayerNumber}
                  className="w-full px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium"
                >
                  Calculate Player Number
                </button>

                {discoveredNumber !== null && (
                  <div className="mt-4 p-4 bg-accent/20 rounded-lg text-center">
                    <div className="text-2xl font-bold text-accent">{discoveredNumber}</div>
                    <div className="text-text-secondary text-sm">Your Player Number</div>
                    {isLoggedIn && (
                      <div className="mt-3 space-y-2">
                        <input
                          type="text"
                          value={characterName}
                          onChange={(e) => setCharacterName(e.target.value)}
                          placeholder="Character name (optional)"
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-sm"
                        />
                        <button
                          onClick={savePlayerNumber}
                          className="w-full px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg text-sm"
                        >
                          Save to Account
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Saved Recipes */}
          {activeTab === "saved" && (
            <div className="bg-bg-secondary border border-border rounded-xl p-4">
              <h3 className="text-accent font-semibold mb-3">Saved Recipes</h3>
              {!isLoggedIn ? (
                <p className="text-text-tertiary text-center py-8">Log in to save recipes</p>
              ) : savedRecipes.length === 0 ? (
                <p className="text-text-tertiary text-center py-8">No saved recipes yet</p>
              ) : (
                <div className="space-y-3 max-h-[500px] overflow-y-auto">
                  {savedRecipes.map((recipe) => (
                    <div key={recipe.id} className="bg-bg-tertiary p-3 rounded-lg">
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-medium">{recipe.recipe_name}</span>
                        <button
                          onClick={() => deleteRecipe(recipe.id)}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Delete
                        </button>
                      </div>
                      {recipe.calculated_affinity_skill_name && (
                        <div className="text-accent text-sm mb-1">
                          Affinity: {recipe.calculated_affinity_skill_name}
                        </div>
                      )}
                      <div className="text-text-secondary text-xs">
                        {recipe.ingredients.length} ingredients
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
