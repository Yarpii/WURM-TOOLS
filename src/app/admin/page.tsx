"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Item, RecipeSubmission, RecipeIngredientInput } from "@/lib/types";
import AdminGuard from "@/components/AdminGuard";

interface Recipe {
  id: number;
  result_item_id: number;
  result_name: string;
  ingredient_item_id: number;
  ingredient_name: string;
  quantity: number;
}

interface AdminUser {
  id: number;
  username: string;
  email: string;
  role: "user" | "admin";
  display_name?: string;
  location?: string;
  wurm_server?: string;
  show_in_members_list: boolean;
  is_banned: boolean;
  ban_reason?: string;
  created_at: string;
}

interface UserStats {
  total: number;
  visible: number;
  banned: number;
  admins: number;
}

interface DataStats {
  items: number;
  recipes: number;
  base_materials: number;
  craftable: number;
  categories: number;
  with_difficulty: number;
  with_skill_type: number;
  with_base_time: number;
  with_tool_type: number;
}

function AdminContent() {
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total: 0, visible: 0, banned: 0, admins: 0 });
  const [dataStats, setDataStats] = useState<DataStats | null>(null);
  const [activeTab, setActiveTab] = useState<"items" | "recipes" | "members" | "data" | "submissions">("items");
  const [submissions, setSubmissions] = useState<RecipeSubmission[]>([]);
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);
  const [reviewingSubmission, setReviewingSubmission] = useState<RecipeSubmission | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [reloading, setReloading] = useState(false);
  const [reloadMessage, setReloadMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

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

  // Members management state
  const [banReason, setBanReason] = useState("");
  const [banningUserId, setBanningUserId] = useState<number | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === "members") {
      loadUsers();
    }
    if (activeTab === "data") {
      loadDataStats();
    }
    if (activeTab === "submissions") {
      loadSubmissions();
    }
  }, [activeTab]);

  // Load pending submissions count on mount
  useEffect(() => {
    loadPendingSubmissionsCount();
  }, []);

  const loadDataStats = async () => {
    try {
      const res = await fetch("/api/data?action=stats");
      const data = await res.json();
      setDataStats(data);
    } catch (err) {
      console.error("Failed to load data stats:", err);
    }
  };

  const loadSubmissions = async () => {
    try {
      const res = await fetch("/api/recipe-submissions?all=true");
      const data = await res.json();
      if (Array.isArray(data)) {
        setSubmissions(data);
      }
    } catch (err) {
      console.error("Failed to load submissions:", err);
    }
  };

  const loadPendingSubmissionsCount = async () => {
    try {
      const res = await fetch("/api/recipe-submissions?count=true");
      const data = await res.json();
      setPendingSubmissionsCount(data.count || 0);
    } catch (err) {
      console.error("Failed to load pending count:", err);
    }
  };

  const handleApproveSubmission = async (id: number, addToDatabase: boolean = false) => {
    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
          admin_notes: adminNotes,
          approve_and_add: addToDatabase,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        if (addToDatabase) {
          showMessage("success", `Recipe approved! Added ${data.itemsCreated || 0} items and ${data.recipesCreated || 0} recipes.`);
        } else {
          showMessage("success", "Recipe approved!");
        }
        setReviewingSubmission(null);
        setAdminNotes("");
        loadSubmissions();
        loadPendingSubmissionsCount();
        loadData(); // Refresh items/recipes
      } else {
        showMessage("error", data.error || "Failed to approve submission");
      }
    } catch (err) {
      showMessage("error", "Connection error: " + String(err));
    }
  };

  const handleRejectSubmission = async (id: number) => {
    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          admin_notes: adminNotes,
        }),
      });

      if (res.ok) {
        showMessage("success", "Submission rejected");
        setReviewingSubmission(null);
        setAdminNotes("");
        loadSubmissions();
        loadPendingSubmissionsCount();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to reject submission");
      }
    } catch (err) {
      showMessage("error", "Connection error: " + String(err));
    }
  };

  const handleDeleteSubmission = async (id: number) => {
    if (!confirm("Are you sure you want to delete this submission?")) return;

    try {
      const res = await fetch(`/api/recipe-submissions/${id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        showMessage("success", "Submission deleted");
        loadSubmissions();
        loadPendingSubmissionsCount();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to delete submission");
      }
    } catch (err) {
      showMessage("error", "Connection error: " + String(err));
    }
  };

  const reloadExtendedData = async () => {
    setReloading(true);
    setReloadMessage(null);
    try {
      const res = await fetch("/api/data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reload-extended" }),
      });
      const data = await res.json();
      if (res.ok) {
        setReloadMessage({ type: "success", text: `Data reloaded successfully (v${data.version})` });
        loadDataStats();
        loadData(); // Reload items too
      } else {
        setReloadMessage({ type: "error", text: data.error || "Failed to reload data" });
      }
    } catch (err) {
      setReloadMessage({ type: "error", text: "Failed to reload data: " + String(err) });
    } finally {
      setReloading(false);
    }
  };

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

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/members");
      const data = await res.json();
      setUsers(data.users || []);
      setUserStats(data.stats || { total: 0, visible: 0, banned: 0, admins: 0 });
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const handleBanUser = async (userId: number) => {
    if (!banReason || banReason.length < 3) {
      showMessage("error", "Please provide a ban reason (at least 3 characters)");
      return;
    }

    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban", reason: banReason }),
    });

    if (res.ok) {
      showMessage("success", "User banned successfully");
      setBanReason("");
      setBanningUserId(null);
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId: number) => {
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unban" }),
    });

    if (res.ok) {
      showMessage("success", "User unbanned successfully");
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to unban user");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    const res = await fetch(`/api/admin/members/${userId}`, { method: "DELETE" });

    if (res.ok) {
      showMessage("success", "User deleted successfully");
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to delete user");
    }
  };

  const handleUpdateUserRole = async (userId: number, role: "user" | "admin") => {
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (res.ok) {
      showMessage("success", "User role updated");
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to update role");
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Panel</h1>
        <p className="text-text-secondary">
          Manage your items and recipe blueprints
        </p>
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
      <div className="flex flex-wrap gap-3 mb-6">
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            activeTab === "items"
              ? "border-accent text-white"
              : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
          }`}
          onClick={() => setActiveTab("items")}
        >
          Items ({items.length})
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            activeTab === "recipes"
              ? "border-accent text-white"
              : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
          }`}
          onClick={() => setActiveTab("recipes")}
        >
          Recipes ({Object.keys(groupedRecipes).length})
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            activeTab === "members"
              ? "border-accent text-white"
              : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
          }`}
          onClick={() => setActiveTab("members")}
        >
          Members ({userStats.total})
        </button>
        <Link
          href="/admin/roles"
          className="px-5 py-2.5 rounded-lg border-2 transition-all border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white hover:border-accent"
        >
          Roles & Permissions
        </Link>
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
            activeTab === "data"
              ? "border-accent text-white"
              : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
          }`}
          onClick={() => setActiveTab("data")}
        >
          Data
        </button>
        <button
          className={`px-5 py-2.5 rounded-lg border-2 transition-all relative ${
            activeTab === "submissions"
              ? "border-accent text-white"
              : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
          }`}
          onClick={() => setActiveTab("submissions")}
        >
          Submissions
          {pendingSubmissionsCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {pendingSubmissionsCount}
            </span>
          )}
        </button>
      </div>

      {/* Items Tab */}
      {activeTab === "items" && (
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Item Form */}
          <div className="bg-bg-secondary border border-border p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">
              {editingItem ? "Edit Item" : "Add New Item"}
            </h2>
            <form onSubmit={handleItemSubmit} className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Name
                </label>
                <input
                  type="text"
                  value={itemForm.name}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, name: e.target.value })
                  }
                  required
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">
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
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <datalist id="categories">
                  {categories.map((cat) => (
                    <option key={cat} value={cat} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Description (optional)
                </label>
                <textarea
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm({ ...itemForm, description: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
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
                <span className="text-text-secondary">Base material</span>
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
                    className="px-4 py-3 bg-bg-tertiary border border-border hover:bg-white/20 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Items List */}
          <div className="lg:col-span-2 bg-bg-secondary border border-border p-6 rounded-xl">
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
          <div className="bg-bg-secondary border border-border p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">
              Add Recipe Ingredient
            </h2>
            <form onSubmit={handleRecipeSubmit} className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">
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
                <label className="block text-text-secondary text-sm mb-2">
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
                <label className="block text-text-secondary text-sm mb-2">
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
                <strong className="text-accent">Tip:</strong> To create a new
                recipe, first add the result item in the Items tab (as
                non-base), then add ingredients here.
              </p>
            </div>
          </div>

          {/* Recipes List */}
          <div className="lg:col-span-2 bg-bg-secondary border border-border p-6 rounded-xl">
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
                        <span className="text-text-secondary">
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
      )}

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-white">{userStats.total}</div>
              <div className="text-text-secondary text-sm">Total Users</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-success">{userStats.visible}</div>
              <div className="text-text-secondary text-sm">Visible in List</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-red-400">{userStats.banned}</div>
              <div className="text-text-secondary text-sm">Banned</div>
            </div>
            <div className="bg-bg-secondary border border-border p-4 rounded-xl">
              <div className="text-2xl font-bold text-accent">{userStats.admins}</div>
              <div className="text-text-secondary text-sm">Admins</div>
            </div>
          </div>

          {/* Users List */}
          <div className="bg-bg-secondary border border-border p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">All Users</h2>
            <div className="space-y-3">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`p-4 rounded-lg border ${
                    user.is_banned
                      ? "bg-red-500/10 border-red-500/30"
                      : "bg-white/5 border-border"
                  }`}
                >
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-medium text-white">{user.username}</span>
                        {user.display_name && user.display_name !== user.username && (
                          <span className="text-text-secondary">({user.display_name})</span>
                        )}
                        <span
                          className={`text-xs px-2 py-0.5 rounded ${
                            user.role === "admin" ? "bg-accent text-white" : "bg-white/10 text-text-secondary"
                          }`}
                        >
                          {user.role}
                        </span>
                        {user.is_banned && (
                          <span className="text-xs px-2 py-0.5 rounded bg-red-500/30 text-red-400">
                            BANNED
                          </span>
                        )}
                        {user.show_in_members_list && (
                          <span className="text-xs px-2 py-0.5 rounded bg-success/30 text-success">
                            Visible
                          </span>
                        )}
                      </div>
                      <div className="text-text-muted text-sm mt-1">
                        {user.email} • Joined {formatDate(user.created_at)}
                        {user.location && ` • ${user.location}`}
                        {user.wurm_server && ` • ${user.wurm_server}`}
                      </div>
                      {user.is_banned && user.ban_reason && (
                        <div className="text-red-400 text-sm mt-1">
                          Ban reason: {user.ban_reason}
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Role Toggle */}
                      <select
                        value={user.role}
                        onChange={(e) => handleUpdateUserRole(user.id, e.target.value as "user" | "admin")}
                        className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg text-white"
                      >
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                      </select>

                      {/* Ban/Unban */}
                      {user.is_banned ? (
                        <button
                          onClick={() => handleUnbanUser(user.id)}
                          className="px-3 py-1.5 text-sm bg-success/20 text-success hover:bg-success/30 rounded-lg transition-colors"
                        >
                          Unban
                        </button>
                      ) : banningUserId === user.id ? (
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            value={banReason}
                            onChange={(e) => setBanReason(e.target.value)}
                            placeholder="Ban reason..."
                            className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg text-white w-40"
                          />
                          <button
                            onClick={() => handleBanUser(user.id)}
                            className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => {
                              setBanningUserId(null);
                              setBanReason("");
                            }}
                            className="px-3 py-1.5 text-sm bg-white/10 text-text-secondary hover:bg-white/20 rounded-lg transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setBanningUserId(user.id)}
                          className="px-3 py-1.5 text-sm bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg transition-colors"
                        >
                          Ban
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}

              {users.length === 0 && (
                <div className="text-center text-text-muted py-10">
                  No users found.
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Data Tab */}
      {activeTab === "data" && (
        <div className="space-y-6">
          {/* Reload Message */}
          {reloadMessage && (
            <div
              className={`p-4 rounded-lg ${
                reloadMessage.type === "success"
                  ? "bg-success/20 text-success"
                  : "bg-red-500/20 text-red-400"
              }`}
            >
              {reloadMessage.text}
            </div>
          )}

          {/* Stats Cards */}
          {dataStats && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-bg-secondary border border-border p-4 rounded-xl">
                  <div className="text-2xl font-bold text-white">{dataStats.items}</div>
                  <div className="text-text-secondary text-sm">Total Items</div>
                </div>
                <div className="bg-bg-secondary border border-border p-4 rounded-xl">
                  <div className="text-2xl font-bold text-accent">{dataStats.craftable}</div>
                  <div className="text-text-secondary text-sm">Craftable</div>
                </div>
                <div className="bg-bg-secondary border border-border p-4 rounded-xl">
                  <div className="text-2xl font-bold text-success">{dataStats.base_materials}</div>
                  <div className="text-text-secondary text-sm">Base Materials</div>
                </div>
                <div className="bg-bg-secondary border border-border p-4 rounded-xl">
                  <div className="text-2xl font-bold text-white">{dataStats.recipes}</div>
                  <div className="text-text-secondary text-sm">Recipes</div>
                </div>
                <div className="bg-bg-secondary border border-border p-4 rounded-xl">
                  <div className="text-2xl font-bold text-white">{dataStats.categories}</div>
                  <div className="text-text-secondary text-sm">Categories</div>
                </div>
              </div>

              {/* Extended Data Stats */}
              <div className="bg-bg-secondary border border-border p-6 rounded-xl">
                <h2 className="text-accent text-xl font-semibold mb-4">Extended Data Coverage</h2>
                <p className="text-text-secondary text-sm mb-4">
                  Items with crafting metadata (difficulty, skill type, etc.)
                </p>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-text-secondary">Difficulty</span>
                      <span className={`font-bold ${dataStats.with_difficulty === dataStats.craftable ? 'text-success' : 'text-warning'}`}>
                        {dataStats.with_difficulty}/{dataStats.craftable}
                      </span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${dataStats.craftable > 0 ? (dataStats.with_difficulty / dataStats.craftable) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-text-secondary">Skill Type</span>
                      <span className={`font-bold ${dataStats.with_skill_type === dataStats.craftable ? 'text-success' : 'text-warning'}`}>
                        {dataStats.with_skill_type}/{dataStats.craftable}
                      </span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${dataStats.craftable > 0 ? (dataStats.with_skill_type / dataStats.craftable) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-text-secondary">Base Time</span>
                      <span className={`font-bold ${dataStats.with_base_time === dataStats.craftable ? 'text-success' : 'text-warning'}`}>
                        {dataStats.with_base_time}/{dataStats.craftable}
                      </span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${dataStats.craftable > 0 ? (dataStats.with_base_time / dataStats.craftable) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                  <div className="p-4 bg-white/5 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-text-secondary">Tool Type</span>
                      <span className={`font-bold ${dataStats.with_tool_type === dataStats.craftable ? 'text-success' : 'text-warning'}`}>
                        {dataStats.with_tool_type}/{dataStats.craftable}
                      </span>
                    </div>
                    <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-accent rounded-full"
                        style={{ width: `${dataStats.craftable > 0 ? (dataStats.with_tool_type / dataStats.craftable) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Actions */}
          <div className="bg-bg-secondary border border-border p-6 rounded-xl">
            <h2 className="text-accent text-xl font-semibold mb-4">Data Management</h2>
            <div className="space-y-4">
              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Reload Extended Data</h3>
                <p className="text-text-secondary text-sm mb-3">
                  Reload item difficulty, skill types, and timing data from the extended data file.
                </p>
                <button
                  onClick={reloadExtendedData}
                  disabled={reloading}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {reloading && <span className="animate-spin">⚙</span>}
                  {reloading ? "Reloading..." : "Reload Extended Data"}
                </button>
              </div>

              <div className="p-4 bg-white/5 rounded-lg">
                <h3 className="font-medium text-white mb-2">Export Data</h3>
                <p className="text-text-secondary text-sm mb-3">
                  Download all items and recipes as JSON.
                </p>
                <a
                  href="/api/data?action=export"
                  download="wurm-data-export.json"
                  className="inline-block px-4 py-2 bg-bg-tertiary border border-border hover:border-accent rounded-lg font-medium transition-colors"
                >
                  Export JSON
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Submissions Tab */}
      {activeTab === "submissions" && (
        <div className="space-y-6">
          {/* Review Modal */}
          {reviewingSubmission && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="bg-bg-secondary border border-border rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
                <div className="flex justify-between items-start mb-4">
                  <h2 className="text-xl font-bold text-accent">
                    Review Submission
                  </h2>
                  <button
                    onClick={() => {
                      setReviewingSubmission(null);
                      setAdminNotes("");
                    }}
                    className="text-text-secondary hover:text-white"
                  >
                    ✕
                  </button>
                </div>

                {/* Submission Details */}
                <div className="space-y-4 mb-6">
                  <div>
                    <p className="text-text-secondary text-sm">Item Name</p>
                    <p className="text-white text-lg font-medium">
                      {reviewingSubmission.item_name}
                    </p>
                  </div>

                  <div>
                    <p className="text-text-secondary text-sm mb-2">Ingredients</p>
                    <div className="flex flex-wrap gap-2">
                      {(() => {
                        try {
                          const ings: RecipeIngredientInput[] = JSON.parse(reviewingSubmission.ingredients);
                          return ings.map((ing, i) => (
                            <span
                              key={i}
                              className="px-3 py-1 bg-bg-tertiary rounded text-white"
                            >
                              {ing.quantity}x {ing.name}
                            </span>
                          ));
                        } catch {
                          return <span className="text-red-400">Invalid ingredients data</span>;
                        }
                      })()}
                    </div>
                  </div>

                  {reviewingSubmission.source_url && (
                    <div>
                      <p className="text-text-secondary text-sm">Source</p>
                      <a
                        href={reviewingSubmission.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-accent hover:underline break-all"
                      >
                        {reviewingSubmission.source_url}
                      </a>
                    </div>
                  )}

                  {reviewingSubmission.notes && (
                    <div>
                      <p className="text-text-secondary text-sm">Notes from User</p>
                      <p className="text-white">{reviewingSubmission.notes}</p>
                    </div>
                  )}

                  <div className="text-text-secondary text-sm">
                    Submitted by <span className="text-white">{reviewingSubmission.username}</span> on{" "}
                    {new Date(reviewingSubmission.created_at).toLocaleDateString()}
                  </div>
                </div>

                {/* Admin Notes */}
                <div className="mb-6">
                  <label className="block text-text-secondary text-sm mb-2">
                    Admin Notes (optional)
                  </label>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add a note for the user..."
                    rows={3}
                    className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white placeholder-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => handleApproveSubmission(reviewingSubmission.id, true)}
                    className="px-4 py-2 bg-success hover:bg-success/80 text-white rounded-lg font-medium transition-colors"
                  >
                    Approve & Add to Database
                  </button>
                  <button
                    onClick={() => handleApproveSubmission(reviewingSubmission.id, false)}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg font-medium transition-colors"
                  >
                    Approve Only
                  </button>
                  <button
                    onClick={() => handleRejectSubmission(reviewingSubmission.id)}
                    className="px-4 py-2 bg-red-500 hover:bg-red-400 text-white rounded-lg font-medium transition-colors"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => {
                      setReviewingSubmission(null);
                      setAdminNotes("");
                    }}
                    className="px-4 py-2 bg-bg-tertiary border border-border hover:border-accent text-white rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Submissions List */}
          <div className="bg-bg-secondary border border-border rounded-xl overflow-hidden">
            <div className="p-4 border-b border-border flex justify-between items-center">
              <h2 className="text-accent text-xl font-semibold">
                Recipe Submissions ({submissions.length})
              </h2>
              {pendingSubmissionsCount > 0 && (
                <span className="px-3 py-1 bg-amber-500/20 text-amber-400 border border-amber-500/50 rounded-full text-sm">
                  {pendingSubmissionsCount} pending
                </span>
              )}
            </div>

            {submissions.length === 0 ? (
              <div className="p-8 text-center text-text-secondary">
                No recipe submissions yet.
              </div>
            ) : (
              <div className="divide-y divide-border">
                {submissions.map((sub) => {
                  let ingredients: RecipeIngredientInput[] = [];
                  try {
                    ingredients = JSON.parse(sub.ingredients);
                  } catch {
                    ingredients = [];
                  }

                  const getStatusStyles = (status: string) => {
                    switch (status) {
                      case "pending":
                        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
                      case "approved":
                        return "bg-green-500/20 text-green-400 border-green-500/50";
                      case "rejected":
                        return "bg-red-500/20 text-red-400 border-red-500/50";
                      default:
                        return "bg-gray-500/20 text-gray-400 border-gray-500/50";
                    }
                  };

                  return (
                    <div key={sub.id} className="p-4 hover:bg-white/5 transition-colors">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h3 className="text-white font-medium">{sub.item_name}</h3>
                          <p className="text-text-secondary text-sm">
                            by {sub.username} • {new Date(sub.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <span
                          className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusStyles(
                            sub.status
                          )}`}
                        >
                          {sub.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap gap-2 mb-3">
                        {ingredients.map((ing, i) => (
                          <span
                            key={i}
                            className="px-2 py-0.5 bg-bg-tertiary rounded text-sm text-text-secondary"
                          >
                            {ing.quantity}x {ing.name}
                          </span>
                        ))}
                      </div>

                      {sub.source_url && (
                        <p className="text-text-tertiary text-xs mb-2 truncate">
                          Source: {sub.source_url}
                        </p>
                      )}

                      {sub.admin_notes && (
                        <div className="p-2 bg-bg-tertiary rounded text-sm text-text-secondary mb-2">
                          Admin: {sub.admin_notes}
                          {sub.reviewed_by_username && (
                            <span className="text-text-tertiary"> — {sub.reviewed_by_username}</span>
                          )}
                        </div>
                      )}

                      <div className="flex gap-2">
                        {sub.status === "pending" && (
                          <button
                            onClick={() => setReviewingSubmission(sub)}
                            className="px-3 py-1 bg-accent hover:bg-accent-hover text-white rounded text-sm transition-colors"
                          >
                            Review
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteSubmission(sub.id)}
                          className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded text-sm transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
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
