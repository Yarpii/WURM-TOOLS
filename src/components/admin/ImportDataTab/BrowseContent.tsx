"use client";

import type { WurmpediaRecipe } from "@/lib/types";
import { QuickFilterButton, RecipeListItem, RecipeDetail, EmptyState } from "./components";

interface BrowseContentProps {
  recipes: WurmpediaRecipe[];
  totalRecipes: number;
  currentPage: number;
  totalPages: number;
  searchTerm: string;
  selectedSkill: string;
  selectedType: string;
  hasMaterials: boolean | null;
  showActivated: boolean | null;
  skills: string[];
  recipeTypes: Array<{ value: string; label: string }>;
  selectedRecipe: WurmpediaRecipe | null;
  activating: number | null;
  loading: boolean;
  onSearchChange: (v: string) => void;
  onSkillChange: (v: string) => void;
  onTypeChange: (v: string) => void;
  onHasMaterialsChange: (v: boolean | null) => void;
  onShowActivatedChange: (v: boolean | null) => void;
  onPageChange: (v: number) => void;
  onSelectRecipe: (r: WurmpediaRecipe | null) => void;
  onActivateRecipe: (
    r: WurmpediaRecipe,
    m?: Array<{ name: string; quantity: number; optional?: boolean }>
  ) => void;
  onDeactivateRecipe?: (r: WurmpediaRecipe) => void;
  onDeleteRecipe: (id: number) => void;
}

export default function BrowseContent({
  recipes,
  totalRecipes,
  currentPage,
  totalPages,
  searchTerm,
  selectedSkill,
  selectedType,
  hasMaterials,
  showActivated,
  skills,
  recipeTypes,
  selectedRecipe,
  activating,
  loading,
  onSearchChange,
  onSkillChange,
  onTypeChange,
  onHasMaterialsChange,
  onShowActivatedChange,
  onPageChange,
  onSelectRecipe,
  onActivateRecipe,
  onDeactivateRecipe,
  onDeleteRecipe,
}: BrowseContentProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Left Column - Filters & List */}
      <div className="lg:col-span-2 space-y-4">
        {/* Search & Filters */}
        <div className="bg-bg-secondary rounded-xl border border-border p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {/* Search */}
            <div className="sm:col-span-2">
              <input
                type="text"
                placeholder="Search recipes..."
                value={searchTerm}
                onChange={(e) => onSearchChange(e.target.value)}
                className="w-full px-4 py-2.5 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent placeholder-text-muted"
              />
            </div>

            {/* Skill Filter */}
            <select
              value={selectedSkill}
              onChange={(e) => onSkillChange(e.target.value)}
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
              onChange={(e) => onTypeChange(e.target.value)}
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
            <QuickFilterButton
              active={hasMaterials === true}
              onClick={() => onHasMaterialsChange(hasMaterials === true ? null : true)}
            >
              Has Materials
            </QuickFilterButton>
            <QuickFilterButton
              active={showActivated === false}
              onClick={() => onShowActivatedChange(showActivated === false ? null : false)}
              color="amber"
            >
              Not Activated
            </QuickFilterButton>
            <QuickFilterButton
              active={showActivated === true}
              onClick={() => onShowActivatedChange(showActivated === true ? null : true)}
              color="green"
            >
              Activated
            </QuickFilterButton>
            <QuickFilterButton
              active={selectedType === "cooking"}
              onClick={() => onTypeChange(selectedType === "cooking" ? "" : "cooking")}
              color="orange"
            >
              Cooking Only
            </QuickFilterButton>
          </div>
        </div>

        {/* Recipe List */}
        <div className="bg-bg-secondary rounded-xl border border-border overflow-hidden">
          <div className="divide-y divide-border max-h-[600px] overflow-y-auto relative">
            {/* Loading overlay */}
            {loading && (
              <div className="absolute inset-0 bg-bg-secondary/80 flex items-center justify-center z-10">
                <div className="flex items-center gap-2 text-text-secondary">
                  <span className="animate-spin text-xl">&#9881;</span>
                  <span>Loading recipes...</span>
                </div>
              </div>
            )}

            {recipes.map((recipe) => (
              <RecipeListItem
                key={recipe.id}
                recipe={recipe}
                selected={selectedRecipe?.id === recipe.id}
                activating={activating === recipe.id}
                onClick={() => onSelectRecipe(recipe)}
                onActivate={() => onActivateRecipe(recipe)}
                onDelete={() => onDeleteRecipe(recipe.id)}
              />
            ))}

            {recipes.length === 0 && !loading && (
              <EmptyState
                title="No Recipes Found"
                message={
                  totalRecipes === 0
                    ? "No Wurmpedia recipes have been imported yet."
                    : "Try adjusting your search filters."
                }
              />
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border">
              <span className="text-text-muted text-sm">{totalRecipes} recipes</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onPageChange(Math.max(1, currentPage - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1.5 bg-bg-tertiary border border-border rounded-lg text-sm disabled:opacity-50 hover:border-accent transition-colors"
                >
                  Prev
                </button>
                <span className="text-text-secondary text-sm px-2">
                  {currentPage} / {totalPages}
                </span>
                <button
                  onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
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
            onActivate={(materials) => onActivateRecipe(selectedRecipe, materials)}
            onDeactivate={onDeactivateRecipe ? () => onDeactivateRecipe(selectedRecipe) : undefined}
            activating={activating === selectedRecipe.id}
            onDelete={() => onDeleteRecipe(selectedRecipe.id)}
          />
        ) : (
          <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
            <div className="text-5xl mb-4 opacity-20">&#128270;</div>
            <h3 className="text-lg text-text-secondary mb-2">Select a Recipe</h3>
            <p className="text-text-muted text-sm">
              Click on a recipe to see details and activate it
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
