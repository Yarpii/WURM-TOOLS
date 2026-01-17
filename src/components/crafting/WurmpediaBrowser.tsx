"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import type { WurmpediaRecipe, WurmpediaRecipeFilters } from "@/lib/types";

interface WurmpediaStats {
  total_recipes: number;
  cooking_recipes: number;
  improvable_recipes: number;
  recipes_with_materials: number;
  unique_skills: number;
  unique_categories: number;
  by_type: Record<string, number>;
}

interface WurmpediaBrowserProps {
  onActivateRecipe?: (recipe: WurmpediaRecipe) => void;
}

export default function WurmpediaBrowser({ onActivateRecipe }: WurmpediaBrowserProps) {
  const [stats, setStats] = useState<WurmpediaStats | null>(null);
  const [recipes, setRecipes] = useState<WurmpediaRecipe[]>([]);
  const [totalRecipes, setTotalRecipes] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedSkill, setSelectedSkill] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [hasMaterials, setHasMaterials] = useState<boolean | null>(null);
  const [skills, setSkills] = useState<string[]>([]);

  // Selected recipe for detail view
  const [selectedRecipe, setSelectedRecipe] = useState<WurmpediaRecipe | null>(null);

  // Activation state
  const [activating, setActivating] = useState<number | null>(null);
  const [activationMessage, setActivationMessage] = useState<{type: "success" | "error", text: string} | null>(null);

  const ITEMS_PER_PAGE = 15;
  const searchTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    loadStats();
    loadSkills();
  }, []);

  useEffect(() => {
    loadRecipes();
  }, [currentPage, selectedSkill, selectedType, hasMaterials]);

  // Debounced search
  useEffect(() => {
    if (searchTimeout.current) {
      clearTimeout(searchTimeout.current);
    }
    searchTimeout.current = setTimeout(() => {
      setCurrentPage(1);
      loadRecipes();
    }, 300);
    return () => {
      if (searchTimeout.current) clearTimeout(searchTimeout.current);
    };
  }, [searchTerm]);

  const loadStats = async () => {
    try {
      const res = await fetch("/api/wurmpedia?action=stats");
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to load Wurmpedia stats:", err);
    }
  };

  const loadSkills = async () => {
    try {
      const res = await fetch("/api/wurmpedia?action=skills");
      if (res.ok) {
        const data = await res.json();
        setSkills(data);
      }
    } catch (err) {
      console.error("Failed to load skills:", err);
    }
  };

  const loadRecipes = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: currentPage.toString(),
        limit: ITEMS_PER_PAGE.toString(),
      });

      if (searchTerm) params.set("search", searchTerm);
      if (selectedSkill) params.set("skill", selectedSkill);
      if (selectedType) params.set("recipe_type", selectedType);
      if (hasMaterials !== null) params.set("has_materials", hasMaterials.toString());

      const res = await fetch(`/api/wurmpedia?${params}`);
      if (res.ok) {
        const data = await res.json();
        setRecipes(data.data || []);
        setTotalRecipes(data.total || 0);
      }
    } catch (err) {
      console.error("Failed to load recipes:", err);
    } finally {
      setLoading(false);
    }
  }, [currentPage, searchTerm, selectedSkill, selectedType, hasMaterials]);

  const handleActivateRecipe = async (recipe: WurmpediaRecipe) => {
    setActivating(recipe.id);
    setActivationMessage(null);

    try {
      const res = await fetch("/api/wurmpedia/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipeId: recipe.id }),
      });

      const result = await res.json();

      if (res.ok) {
        setActivationMessage({
          type: "success",
          text: result.message || `"${recipe.name}" activated for calculator!`,
        });
        if (onActivateRecipe) {
          onActivateRecipe(recipe);
        }
      } else {
        setActivationMessage({
          type: "error",
          text: result.error || "Failed to activate recipe",
        });
      }
    } catch (err) {
      setActivationMessage({
        type: "error",
        text: "Failed to activate recipe: " + String(err),
      });
    } finally {
      setActivating(null);
    }
  };

  const totalPages = Math.ceil(totalRecipes / ITEMS_PER_PAGE);

  const recipeTypes = [
    { value: "", label: "All Types" },
    { value: "misc", label: "Misc" },
    { value: "cooking", label: "Cooking" },
    { value: "smithing", label: "Smithing" },
    { value: "carpentry", label: "Carpentry" },
    { value: "tailoring", label: "Tailoring" },
    { value: "masonry", label: "Masonry" },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Filters & List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Stats Bar */}
        {stats && stats.total_recipes > 0 && (
          <div className="bg-bg-secondary rounded-xl border border-border p-4">
            <div className="flex flex-wrap items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-accent font-bold">{stats.total_recipes}</span>
                <span className="text-text-muted">recipes</span>
              </div>
              <div className="text-text-muted">|</div>
              <div className="flex items-center gap-2">
                <span className="text-orange-400 font-semibold">{stats.cooking_recipes}</span>
                <span className="text-text-muted">cooking</span>
              </div>
              <div className="text-text-muted">|</div>
              <div className="flex items-center gap-2">
                <span className="text-green-400 font-semibold">{stats.improvable_recipes}</span>
                <span className="text-text-muted">improvable</span>
              </div>
              <div className="text-text-muted">|</div>
              <div className="flex items-center gap-2">
                <span className="text-purple-400 font-semibold">{stats.unique_skills}</span>
                <span className="text-text-muted">skills</span>
              </div>
            </div>
          </div>
        )}

        {/* Search & Filters */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
              />
            </div>

            {/* Skill Filter */}
            <select
              value={selectedSkill}
              onChange={(e) => {
                setSelectedSkill(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent"
            >
              <option value="">All Skills</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>
                  {skill}
                </option>
              ))}
            </select>

            {/* Type Filter */}
            <select
              value={selectedType}
              onChange={(e) => {
                setSelectedType(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2.5 bg-bg-tertiary border border-border rounded-lg text-text-primary focus:border-accent"
            >
              {recipeTypes.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Quick Filters */}
          <div className="flex flex-wrap gap-2 mt-3">
            <button
              onClick={() => {
                setHasMaterials(hasMaterials === true ? null : true);
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                hasMaterials === true
                  ? "bg-accent text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              Has Materials
            </button>
            <button
              onClick={() => {
                setSelectedType(selectedType === "cooking" ? "" : "cooking");
                setCurrentPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                selectedType === "cooking"
                  ? "bg-orange-500 text-white"
                  : "bg-bg-tertiary text-text-secondary hover:text-text-primary border border-border"
              }`}
            >
              Cooking Only
            </button>
          </div>
        </div>

        {/* Activation Message */}
        {activationMessage && (
          <div
            className={`p-3 rounded-lg border ${
              activationMessage.type === "success"
                ? "bg-success/10 border-success/30 text-success"
                : "bg-danger/10 border-danger/30 text-danger"
            }`}
          >
            {activationMessage.text}
          </div>
        )}

        {/* Recipe List */}
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          {loading ? (
            <div className="p-12 flex items-center justify-center">
              <div className="animate-spin text-4xl">&#9881;</div>
            </div>
          ) : recipes.length === 0 ? (
            <div className="p-12 text-center">
              <div className="text-5xl mb-4 opacity-20">&#128214;</div>
              <h3 className="text-lg text-text-secondary mb-2">No Recipes Found</h3>
              <p className="text-text-muted text-sm">
                {stats?.total_recipes === 0
                  ? "No Wurmpedia recipes have been imported yet. Ask an admin to import recipes."
                  : "Try adjusting your search filters."}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-border">
              {recipes.map((recipe) => (
                <div
                  key={recipe.id}
                  onClick={() => setSelectedRecipe(recipe)}
                  className={`p-4 cursor-pointer transition-colors hover:bg-bg-hover ${
                    selectedRecipe?.id === recipe.id ? "bg-accent/10 border-l-2 border-l-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-text-primary">{recipe.name}</span>
                        {recipe.difficulty !== null && (
                          <span className="px-2 py-0.5 bg-bg-tertiary text-text-muted text-xs rounded">
                            Diff: {recipe.difficulty}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        {recipe.skill && (
                          <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 text-xs rounded">
                            {recipe.skill}
                          </span>
                        )}
                        {recipe.is_cooking && (
                          <span className="px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs rounded">
                            Cooking
                          </span>
                        )}
                        {recipe.can_improve && (
                          <span className="px-2 py-0.5 bg-green-500/20 text-green-400 text-xs rounded">
                            Improvable
                          </span>
                        )}
                        {recipe.has_materials && (
                          <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-xs rounded">
                            {(recipe.materials?.length || 0)} materials
                          </span>
                        )}
                      </div>
                    </div>
                    {recipe.has_materials && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActivateRecipe(recipe);
                        }}
                        disabled={activating === recipe.id}
                        className="px-3 py-1.5 bg-accent hover:bg-accent-hover text-white text-xs font-medium rounded-lg transition-colors disabled:opacity-50 whitespace-nowrap"
                        title="Add to calculator"
                      >
                        {activating === recipe.id ? "..." : "Activate"}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-text-muted text-sm">
                {totalRecipes} recipes
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm disabled:opacity-50 hover:border-accent transition-colors"
                >
                  Prev
                </button>
                <span className="text-text-secondary text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm disabled:opacity-50 hover:border-accent transition-colors"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Recipe Detail */}
      <div className="space-y-4">
        {selectedRecipe ? (
          <RecipeDetail
            recipe={selectedRecipe}
            onActivate={() => handleActivateRecipe(selectedRecipe)}
            activating={activating === selectedRecipe.id}
          />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <div className="text-5xl mb-4 opacity-20">&#128270;</div>
            <h3 className="text-lg text-text-secondary mb-2">Select a Recipe</h3>
            <p className="text-text-muted text-sm">
              Click on a recipe to see its details and materials
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// Recipe Detail Component
function RecipeDetail({
  recipe,
  onActivate,
  activating,
}: {
  recipe: WurmpediaRecipe;
  onActivate: () => void;
  activating: boolean;
}) {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-border">
        <h3 className="text-lg font-semibold text-text-primary">{recipe.name}</h3>
        <div className="flex flex-wrap gap-2 mt-2">
          {recipe.skill && (
            <span className="px-2 py-1 bg-purple-500/20 text-purple-400 text-xs rounded">
              {recipe.skill}
            </span>
          )}
          {recipe.difficulty !== null && (
            <span className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded">
              Difficulty: {recipe.difficulty}
            </span>
          )}
          {recipe.recipe_type !== "misc" && (
            <span className="px-2 py-1 bg-accent/20 text-accent text-xs rounded capitalize">
              {recipe.recipe_type}
            </span>
          )}
        </div>
      </div>

      {/* Creation Info */}
      {(recipe.creation_target || recipe.creation_tools?.length) && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Creation</h4>
          <div className="space-y-2 text-sm">
            {recipe.creation_target && (
              <div className="flex justify-between">
                <span className="text-text-muted">Target</span>
                <span className="text-text-primary">{recipe.creation_target}</span>
              </div>
            )}
            {recipe.creation_tools && recipe.creation_tools.length > 0 && (
              <div className="flex justify-between">
                <span className="text-text-muted">Tools</span>
                <span className="text-text-primary">{recipe.creation_tools.join(", ")}</span>
              </div>
            )}
            {recipe.creation_menu && (
              <div className="flex justify-between">
                <span className="text-text-muted">Menu</span>
                <span className="text-text-primary text-right">{recipe.creation_menu}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Materials */}
      {recipe.materials && recipe.materials.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-3">Materials</h4>
          <div className="space-y-2">
            {recipe.materials.map((mat, idx) => (
              <div
                key={idx}
                className={`flex items-center justify-between p-2 rounded-lg ${
                  mat.optional ? "bg-bg-tertiary/50" : "bg-bg-tertiary"
                }`}
              >
                <span className={mat.optional ? "text-text-muted italic" : "text-text-primary"}>
                  {mat.name}
                  {mat.optional && " (optional)"}
                </span>
                {mat.quantity && (
                  <span className="text-accent font-mono font-medium">x{mat.quantity}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Result */}
      {recipe.result_name && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Result</h4>
          <div className="p-3 bg-success/10 border border-success/20 rounded-lg">
            <span className="text-success font-medium">{recipe.result_name}</span>
            {recipe.result_quantity > 1 && (
              <span className="text-success/70 ml-2">x{recipe.result_quantity}</span>
            )}
            {recipe.result_weight && (
              <span className="text-success/70 ml-2">({recipe.result_weight}kg)</span>
            )}
          </div>
        </div>
      )}

      {/* Improvement */}
      {recipe.can_improve && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Improvement</h4>
          <div className="flex items-center gap-2">
            <span className="text-green-400">&#10003; Can be improved</span>
            {recipe.improve_with && (
              <span className="text-text-muted">with {recipe.improve_with}</span>
            )}
          </div>
        </div>
      )}

      {/* Notes */}
      {recipe.notes && recipe.notes.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Notes</h4>
          <ul className="text-sm text-text-secondary space-y-1">
            {recipe.notes.map((note, idx) => (
              <li key={idx} className="flex gap-2">
                <span className="text-text-muted">&#8226;</span>
                <span>{note}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Properties */}
      {recipe.properties && recipe.properties.length > 0 && (
        <div className="p-4 border-b border-border">
          <h4 className="text-sm font-medium text-text-primary mb-2">Properties</h4>
          <div className="flex flex-wrap gap-2">
            {recipe.properties.map((prop, idx) => (
              <span key={idx} className="px-2 py-1 bg-bg-tertiary text-text-secondary text-xs rounded">
                {prop}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Activate Button */}
      {recipe.has_materials && (
        <div className="p-4">
          <button
            onClick={onActivate}
            disabled={activating}
            className="w-full py-3 bg-accent hover:bg-accent-hover text-white font-medium rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {activating ? (
              <>
                <span className="animate-spin">&#9881;</span>
                <span>Activating...</span>
              </>
            ) : (
              <>
                <span>&#9889;</span>
                <span>Activate for Calculator</span>
              </>
            )}
          </button>
          <p className="text-text-muted text-xs text-center mt-2">
            This will add the recipe to the crafting calculator so you can calculate materials
          </p>
        </div>
      )}
    </div>
  );
}
