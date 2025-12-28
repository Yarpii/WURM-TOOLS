"use client";

import { useState, useEffect } from "react";
import type { Item } from "@/lib/types";
import AdminGuard from "@/components/AdminGuard";

interface Recipe {
  id: number;
  result_item_id: number;
  result_name: string;
  ingredient_item_id: number;
  ingredient_name: string;
  quantity: number;
}

function AdminContent() {
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<"items" | "recipes">("items");

  // Item form state
  const [itemForm, setItemForm] = useState({
    id: 0,
    name: "",
    category: "",
    is_base_material: false,
    description: "",
  });
  const [editingItem, setEditingItem] = useState(false);

  // Recipe form state
  const [recipeForm, setRecipeForm] = useState({
    result_item_id: 0,
    ingredient_item_id: 0,
    quantity: 1,
  });

  // Messages
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [itemsRes, recipesRes, categoriesRes] = await Promise.all([
      fetch("/api/items"),
      fetch("/api/admin/recipes"),
      fetch("/api/items?categories=1"),
    ]);
    setItems(await itemsRes.json());
    setRecipes(await recipesRes.json());
    setCategories(await categoriesRes.json());
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Item handlers
  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingItem ? `/api/items/${itemForm.id}` : "/api/items";
    const method = editingItem ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: itemForm.name,
        category: itemForm.category,
        is_base_material: itemForm.is_base_material ? 1 : 0,
        description: itemForm.description || null,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("success", editingItem ? "Item updated!" : "Item added!");
      resetItemForm();
      loadData();
    } else {
      showMessage("error", data.error || "Failed to save item");
    }
  };

  const editItem = (item: Item) => {
    setItemForm({
      id: item.id,
      name: item.name,
      category: item.category,
      is_base_material: item.is_base_material === 1,
      description: item.description || "",
    });
    setEditingItem(true);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this item? This will also remove any recipes using it.")) {
      return;
    }

    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });

    if (res.ok) {
      showMessage("success", "Item deleted!");
      loadData();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to delete item");
    }
  };

  const resetItemForm = () => {
    setItemForm({
      id: 0,
      name: "",
      category: "",
      is_base_material: false,
      description: "",
    });
    setEditingItem(false);
  };

  // Recipe handlers
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
      loadData();
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
      loadData();
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
      loadData();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to delete");
    }
  };

  // Group recipes by result item
  const groupedRecipes = recipes.reduce((acc, recipe) => {
    const key = recipe.result_item_id;
    if (!acc[key]) {
      acc[key] = { name: recipe.result_name, ingredients: [] };
    }
    acc[key].ingredients.push(recipe);
    return acc;
  }, {} as Record<number, { name: string; ingredients: Recipe[] }>);

  const craftableItems = items.filter((i) => !i.is_base_material);

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      {/* Page Header */}
      <div className="mb-8 text-center">
        <div className="inline-flex items-center gap-3 mb-2">
          <span className="text-gold/30">◆</span>
          <h1 className="text-3xl font-bold tracking-wide">
            <span className="text-accent">Forge</span>
            <span className="text-gold"> Master</span>
          </h1>
          <span className="text-gold/30">◆</span>
        </div>
        <p className="text-gray-500">
          Manage your items and recipe blueprints
        </p>
        <div className="forge-divider mt-4 max-w-md mx-auto" />
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-4 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-success/20 text-success"
              : "bg-red-500/20 text-red-400"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Tab Switcher */}
      <div className="flex gap-3 mb-6">
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            activeTab === "items"
              ? "border-accent text-white"
              : "border-transparent bg-dark-input text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("items")}
        >
          Items ({items.length})
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            activeTab === "recipes"
              ? "border-accent text-white"
              : "border-transparent bg-dark-input text-gray-400 hover:text-white"
          }`}
          onClick={() => setActiveTab("recipes")}
        >
          Recipes ({Object.keys(groupedRecipes).length})
        </button>
      </div>

      {/* Items Tab */}
      {activeTab === "items" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Item Form */}
          <div className="bg-dark-card p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h2>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Category
                </label>
                <input
                  type="text"
                  value={itemForm.category}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, category: e.target.value })
                  }
                  list="categories"
                  required
                  className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={itemForm.is_base_material}
                  onChange={(e) =>
                    setItemForm({
                      ...itemForm,
                      is_base_material: e.target.checked,
                    })
                  }
                  className="rounded"
                />
                <span className="text-gray-400">Base material</span>
              </label>

              <div className="flex gap-2">
                <button
                  type="submit"
                  className="flex-1 px-4 py-3 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
                >
                  {editingItem ? "Update" : "Add Item"}
                </button>
                {editingItem && (
                  <button
                    type="button"
                    onClick={resetItemForm}
                    className="px-4 py-3 bg-dark-input hover:bg-white/20 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Items List */}
          <div className="lg:col-span-2 bg-dark-card p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">
              All Items
            </h2>
            <div className="max-h-[600px] overflow-y-auto space-y-2">
              {items.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between p-3 bg-white/5 rounded-lg hover:bg-white/10"
                >
                  <div className="flex items-center gap-3">
                    <span className={`category-dot category-${item.category}`} />
                    <span>{item.name}</span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        item.is_base_material ? "bg-success" : "bg-accent"
                      }`}
                    >
                      {item.is_base_material ? "Base" : "Crafted"}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => editItem(item)}
                      className="px-3 py-1 text-sm bg-accent/20 text-accent hover:bg-accent/30 rounded transition-colors"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteItem(item.id)}
                      className="px-3 py-1 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Recipes Tab */}
      {activeTab === "recipes" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recipe Form */}
          <div className="bg-dark-card p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">
              Add Recipe Ingredient
            </h2>
            <form onSubmit={handleRecipeSubmit} className="space-y-4">
              <div>
                <label className="block text-gray-400 text-sm mb-2">
                  Result Item (what you craft)
                </label>
                <select
                  value={recipeForm.result_item_id}
                  onChange={(e) =>
                    setRecipeForm({
                      ...recipeForm,
                      result_item_id: parseInt(e.target.value),
                    })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
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
                <label className="block text-gray-400 text-sm mb-2">
                  Ingredient Item
                </label>
                <select
                  value={recipeForm.ingredient_item_id}
                  onChange={(e) =>
                    setRecipeForm({
                      ...recipeForm,
                      ingredient_item_id: parseInt(e.target.value),
                    })
                  }
                  required
                  className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
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
                <label className="block text-gray-400 text-sm mb-2">
                  Quantity Needed
                </label>
                <input
                  type="number"
                  value={recipeForm.quantity}
                  onChange={(e) =>
                    setRecipeForm({
                      ...recipeForm,
                      quantity: parseFloat(e.target.value) || 1,
                    })
                  }
                  min={0.01}
                  step={0.01}
                  required
                  className="w-full px-4 py-3 bg-dark-input rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
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
              <p className="text-gray-400 text-sm">
                <strong className="text-accent">Tip:</strong> To create a new
                recipe, first add the result item in the Items tab (as
                non-base), then add ingredients here.
              </p>
            </div>
          </div>

          {/* Recipes List */}
          <div className="lg:col-span-2 bg-dark-card p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">
              All Recipes
            </h2>
            <div className="max-h-[600px] overflow-y-auto space-y-4">
              {Object.entries(groupedRecipes).map(([itemId, group]) => (
                <div
                  key={itemId}
                  className="p-4 bg-white/5 rounded-lg"
                >
                  <h3 className="font-semibold text-white mb-3 flex items-center gap-2">
                    <span className="text-accent">{group.name}</span>
                    <span className="text-gray-500 text-sm">
                      ({group.ingredients.length} ingredients)
                    </span>
                  </h3>
                  <div className="space-y-2">
                    {group.ingredients.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="flex items-center justify-between p-2 bg-white/5 rounded"
                      >
                        <span className="text-gray-300">
                          {recipe.ingredient_name}
                        </span>
                        <div className="flex items-center gap-3">
                          <input
                            type="number"
                            value={recipe.quantity}
                            onChange={(e) =>
                              updateRecipeQuantity(
                                recipe.id,
                                parseFloat(e.target.value) || 1
                              )
                            }
                            min={0.01}
                            step={0.01}
                            className="w-20 px-2 py-1 bg-dark-input rounded text-white text-center"
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
                <div className="text-center text-gray-500 py-10">
                  No recipes yet. Add some ingredients above!
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
