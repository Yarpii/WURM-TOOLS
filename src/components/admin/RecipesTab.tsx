"use client";

import { useState } from "react";
import type { Item, Recipe } from "./types";

interface RecipesTabProps {
  items: Item[];
  recipes: Recipe[];
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

export default function RecipesTab({ items, recipes, onDataChange, showMessage }: RecipesTabProps) {
  const [recipeForm, setRecipeForm] = useState({
    result_item_id: 0,
    ingredient_item_id: 0,
    quantity: 1,
  });

  const craftableItems = items.filter((i) => !i.is_base_material);

  // Group recipes by result item
  const groupedRecipes = recipes.reduce((acc, recipe) => {
    const key = recipe.result_item_id;
    if (!acc[key]) {
      acc[key] = { name: recipe.result_name, ingredients: [] };
    }
    acc[key].ingredients.push(recipe);
    return acc;
  }, {} as Record<number, { name: string; ingredients: Recipe[] }>);

  const handleRecipeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const res = await fetch("/api/admin/recipes", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(recipeForm),
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("success", "Recipe ingredient added!");
      setRecipeForm({ result_item_id: 0, ingredient_item_id: 0, quantity: 1 });
      onDataChange();
    } else {
      showMessage("error", data.error || "Failed to add recipe");
    }
  };

  const updateRecipeQuantity = async (id: number, quantity: number) => {
    const res = await fetch("/api/admin/recipes", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, quantity }),
    });

    if (res.ok) {
      onDataChange();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to update quantity");
    }
  };

  const deleteRecipe = async (id: number) => {
    if (!confirm("Remove this ingredient from the recipe?")) return;

    const res = await fetch(`/api/admin/recipes?id=${id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      showMessage("success", "Recipe ingredient removed!");
      onDataChange();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to delete");
    }
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Recipe Form */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">Add Recipe Ingredient</h2>
        <form onSubmit={handleRecipeSubmit} className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">
              Result Item (what you craft)
            </label>
            <select
              value={recipeForm.result_item_id}
              onChange={(e) =>
                setRecipeForm({ ...recipeForm, result_item_id: parseInt(e.target.value) })
              }
              required
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={0}>Select result item...</option>
              {craftableItems.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-2">Ingredient Item</label>
            <select
              value={recipeForm.ingredient_item_id}
              onChange={(e) =>
                setRecipeForm({ ...recipeForm, ingredient_item_id: parseInt(e.target.value) })
              }
              required
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
            >
              <option value={0}>Select ingredient...</option>
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name} {item.is_base_material ? "(Base)" : ""}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-2">Quantity Needed</label>
            <input
              type="number"
              value={recipeForm.quantity}
              onChange={(e) =>
                setRecipeForm({ ...recipeForm, quantity: parseFloat(e.target.value) || 1 })
              }
              min={0.01}
              step={0.01}
              required
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <button
            type="submit"
            className="w-full px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
          >
            Add Ingredient
          </button>
        </form>

        <div className="mt-6 p-4 bg-white/5 rounded-lg">
          <p className="text-text-secondary text-sm">
            <strong className="text-accent">Tip:</strong> To create a new recipe, first add the
            result item in the Items tab (as non-base), then add ingredients here.
          </p>
        </div>
      </div>

      {/* Recipes List */}
      <div className="lg:col-span-2 bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">All Recipes</h2>
        <div className="max-h-[600px] overflow-y-auto space-y-4">
          {Object.entries(groupedRecipes).map(([itemId, group]) => (
            <div key={itemId} className="p-4 bg-white/5 rounded-lg">
              <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                <span className="text-accent">{group.name}</span>
                <span className="text-text-muted text-sm">
                  ({group.ingredients.length} ingredients)
                </span>
              </h3>
              <div className="space-y-2">
                {group.ingredients.map((recipe) => (
                  <div
                    key={recipe.id}
                    className="flex items-center justify-between p-2 bg-white/5 rounded"
                  >
                    <span className="text-text-secondary">{recipe.ingredient_name}</span>
                    <div className="flex items-center gap-3">
                      <input
                        type="number"
                        value={recipe.quantity}
                        onChange={(e) =>
                          updateRecipeQuantity(recipe.id, parseFloat(e.target.value) || 1)
                        }
                        min={0.01}
                        step={0.01}
                        className="w-20 px-2 py-1 bg-bg-tertiary border border-border rounded text-white text-center"
                      />
                      <button
                        onClick={() => deleteRecipe(recipe.id)}
                        className="px-2 py-1 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {Object.keys(groupedRecipes).length === 0 && (
            <div className="text-center text-text-muted py-10">
              No recipes yet. Add some ingredients above!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
