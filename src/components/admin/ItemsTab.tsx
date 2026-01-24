"use client";

import { useState, useMemo, useEffect } from "react";
import type { Item } from "@/lib/types";

interface ItemsTabProps {
  items: Item[];
  categories: string[];
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

interface CategoryWithCount {
  category: string;
  count: number;
}

const ITEMS_PER_PAGE = 100;

export default function ItemsTab({ items, categories, onDataChange, showMessage }: ItemsTabProps) {
  const [itemForm, setItemForm] = useState({
    id: 0,
    name: "",
    slug: "",
    skill: "",
    difficulty: 20,
    base_time_seconds: 10,
    is_base_material: false,
  });
  const [editingItem, setEditingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [filterType, setFilterType] = useState<"all" | "base" | "crafted">("all");
  const [filterCategory, setFilterCategory] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Category management state
  const [categoriesWithCounts, setCategoriesWithCounts] = useState<CategoryWithCount[]>([]);
  const [itemCategories, setItemCategories] = useState<Record<number, string[]>>({});
  const [selectedItems, setSelectedItems] = useState<Set<number>>(new Set());
  const [newCategory, setNewCategory] = useState("");
  const [editingCategories, setEditingCategories] = useState<number | null>(null);
  const [uncategorizedCount, setUncategorizedCount] = useState(0);

  // Load categories with counts
  useEffect(() => {
    loadCategoriesWithCounts();
    loadUncategorizedCount();
  }, []);

  const loadCategoriesWithCounts = async () => {
    try {
      const res = await fetch("/api/categories?counts=1");
      if (res.ok) {
        const data = await res.json();
        setCategoriesWithCounts(data);
      }
    } catch (error) {
      console.error("Failed to load categories:", error);
    }
  };

  const loadUncategorizedCount = async () => {
    try {
      const res = await fetch("/api/categories?uncategorized=1");
      if (res.ok) {
        const data = await res.json();
        setUncategorizedCount(data.length);
      }
    } catch (error) {
      console.error("Failed to load uncategorized count:", error);
    }
  };

  const loadItemCategories = async (itemId: number) => {
    try {
      const res = await fetch(`/api/items/${itemId}/categories`);
      if (res.ok) {
        const cats = await res.json();
        setItemCategories(prev => ({ ...prev, [itemId]: cats }));
      }
    } catch (error) {
      console.error("Failed to load item categories:", error);
    }
  };

  const saveItemCategories = async (itemId: number, cats: string[]) => {
    try {
      const res = await fetch(`/api/items/${itemId}/categories`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categories: cats }),
      });
      if (res.ok) {
        showMessage("success", "Categories updated!");
        setItemCategories(prev => ({ ...prev, [itemId]: cats }));
        loadCategoriesWithCounts();
        loadUncategorizedCount();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to update categories");
      }
    } catch (error) {
      showMessage("error", "Failed to update categories");
    }
  };

  const bulkAssignCategory = async (category: string, action: "add" | "remove" = "add") => {
    if (selectedItems.size === 0) {
      showMessage("error", "No items selected");
      return;
    }

    try {
      const res = await fetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          itemIds: Array.from(selectedItems),
          category,
          action,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        showMessage("success", `${action === "add" ? "Added" : "Removed"} "${category}" ${action === "add" ? "to" : "from"} ${data.updated} items`);
        setSelectedItems(new Set());
        loadCategoriesWithCounts();
        loadUncategorizedCount();
        // Clear cached categories for affected items
        setItemCategories({});
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to update categories");
      }
    } catch (error) {
      showMessage("error", "Failed to update categories");
    }
  };

  const toggleItemVisibility = async (itemId: number, visible: boolean) => {
    try {
      const res = await fetch(`/api/items/${itemId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visible }),
      });

      if (res.ok) {
        showMessage("success", `Item ${visible ? "enabled" : "disabled"} in crafting calculator`);
        onDataChange();
      } else {
        const data = await res.json();
        showMessage("error", data.error || "Failed to update visibility");
      }
    } catch (error) {
      showMessage("error", "Failed to update visibility");
    }
  };

  const bulkToggleVisibility = async (visible: boolean) => {
    if (selectedItems.size === 0) {
      showMessage("error", "No items selected");
      return;
    }

    try {
      // Update each item
      const promises = Array.from(selectedItems).map(itemId =>
        fetch(`/api/items/${itemId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ visible }),
        })
      );

      await Promise.all(promises);
      showMessage("success", `${selectedItems.size} items ${visible ? "enabled" : "disabled"} in crafting calculator`);
      setSelectedItems(new Set());
      onDataChange();
    } catch (error) {
      showMessage("error", "Failed to update visibility");
    }
  };

  const toggleSelectItem = (itemId: number) => {
    setSelectedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }
      return next;
    });
  };

  const selectAllFiltered = () => {
    const ids = new Set(filteredItems.map(i => i.id));
    setSelectedItems(ids);
  };

  const clearSelection = () => {
    setSelectedItems(new Set());
  };

  // Get unique skills from items
  const skills = useMemo(() => {
    const skillSet = new Set(items.map(i => i.skill).filter(Boolean));
    return Array.from(skillSet).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkill = !filterSkill || item.skill === filterSkill;

      const matchesType = filterType === "all" ||
        (filterType === "base" && item.is_base_material) ||
        (filterType === "crafted" && !item.is_base_material);

      // Category filter - if "uncategorized" is selected, show items without categories
      let matchesCategory = true;
      if (filterCategory === "__uncategorized__") {
        const cats = itemCategories[item.id];
        matchesCategory = !cats || cats.length === 0;
      } else if (filterCategory) {
        const cats = itemCategories[item.id];
        matchesCategory = cats?.includes(filterCategory) || false;
      }

      return matchesSearch && matchesSkill && matchesType && matchesCategory;
    });
  }, [items, searchQuery, filterSkill, filterType, filterCategory, itemCategories]);

  // Pagination calculations
  const totalPages = Math.ceil(filteredItems.length / ITEMS_PER_PAGE);
  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredItems.slice(startIndex, startIndex + ITEMS_PER_PAGE);
  }, [filteredItems, currentPage]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterSkill, filterType, filterCategory]);

  // Load categories for filtered items when filter changes
  useEffect(() => {
    if (filterCategory) {
      // Load categories for visible items on current page
      paginatedItems.forEach(item => {
        if (!itemCategories[item.id]) {
          loadItemCategories(item.id);
        }
      });
    }
  }, [filterCategory, paginatedItems]);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const url = editingItem ? `/api/items/${itemForm.id}` : "/api/items";
    const method = editingItem ? "PUT" : "POST";

    const slug = itemForm.slug || itemForm.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: itemForm.name,
        slug,
        skill: itemForm.skill || null,
        difficulty: itemForm.difficulty || null,
        base_time_seconds: itemForm.base_time_seconds || null,
        is_base_material: itemForm.is_base_material,
      }),
    });

    const data = await res.json();

    if (res.ok) {
      showMessage("success", editingItem ? "Item updated!" : "Item added!");
      resetItemForm();
      onDataChange();
    } else {
      showMessage("error", data.error || "Failed to save item");
    }
  };

  const editItem = (item: Item) => {
    setItemForm({
      id: item.id,
      name: item.name,
      slug: item.slug || "",
      skill: item.skill || "",
      difficulty: item.difficulty || 20,
      base_time_seconds: item.base_time_seconds || 10,
      is_base_material: Boolean(item.is_base_material),
    });
    setEditingItem(true);
  };

  const deleteItem = async (id: number) => {
    if (!confirm("Delete this item? This will also remove any recipe materials using it.")) {
      return;
    }

    const res = await fetch(`/api/items/${id}`, { method: "DELETE" });

    if (res.ok) {
      showMessage("success", "Item deleted!");
      onDataChange();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to delete item");
    }
  };

  const resetItemForm = () => {
    setItemForm({
      id: 0,
      name: "",
      slug: "",
      skill: "",
      difficulty: 20,
      base_time_seconds: 10,
      is_base_material: false,
    });
    setEditingItem(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-accent">{items.length}</div>
          <div className="text-sm text-text-secondary">Total Items</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-green-400">{items.filter(i => i.visible).length}</div>
          <div className="text-sm text-text-secondary">Visible in Crafting</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-success">{items.filter(i => i.is_base_material).length}</div>
          <div className="text-sm text-text-secondary">Base Materials</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-blue-400">{items.filter(i => !i.is_base_material).length}</div>
          <div className="text-sm text-text-secondary">Craftable Items</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-purple-400">{categoriesWithCounts.length}</div>
          <div className="text-sm text-text-secondary">Categories</div>
        </div>
        <button
          onClick={() => setFilterCategory("__uncategorized__")}
          className="bg-bg-secondary border border-border p-4 rounded-xl text-center hover:border-orange-500 transition-colors"
        >
          <div className="text-2xl font-bold text-orange-400">{uncategorizedCount}</div>
          <div className="text-sm text-text-secondary">Uncategorized</div>
        </button>
      </div>

      {/* Bulk Actions */}
      {selectedItems.size > 0 && (
        <div className="bg-accent/10 border border-accent/30 p-4 rounded-xl flex flex-wrap items-center gap-4">
          <span className="text-accent font-medium">{selectedItems.size} items selected</span>
          <div className="flex items-center gap-2">
            <select
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white text-sm"
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) {
                  bulkAssignCategory(e.target.value, "add");
                  e.target.value = "";
                }
              }}
            >
              <option value="">Add to category...</option>
              {categoriesWithCounts.map((c) => (
                <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Or new category..."
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white text-sm w-40"
            />
            <button
              onClick={() => {
                if (newCategory.trim()) {
                  bulkAssignCategory(newCategory.trim(), "add");
                  setNewCategory("");
                }
              }}
              disabled={!newCategory.trim()}
              className="px-3 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
          <div className="flex items-center gap-2 border-l border-border/50 pl-4">
            <span className="text-text-secondary text-sm">Visibility:</span>
            <button
              onClick={() => bulkToggleVisibility(true)}
              className="px-3 py-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg text-sm"
            >
              Enable
            </button>
            <button
              onClick={() => bulkToggleVisibility(false)}
              className="px-3 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm"
            >
              Disable
            </button>
          </div>
          <button
            onClick={clearSelection}
            className="px-3 py-2 bg-bg-tertiary border border-border hover:bg-white/10 rounded-lg text-sm ml-auto"
          >
            Clear Selection
          </button>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Item Form */}
        <div className="bg-bg-secondary border border-border p-6 rounded-xl">
          <h2 className="text-accent text-xl font-semibold mb-4">
            {editingItem ? "Edit Item" : "Add New Item"}
          </h2>
          <form onSubmit={handleItemSubmit} className="space-y-4">
            <div>
              <label className="block text-text-secondary text-sm mb-2">Name *</label>
              <input
                type="text"
                value={itemForm.name}
                onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
                required
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Slug (auto-generated if empty)</label>
              <input
                type="text"
                value={itemForm.slug}
                onChange={(e) => setItemForm({ ...itemForm, slug: e.target.value })}
                placeholder="e.g., iron-sword"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
            </div>

            <div>
              <label className="block text-text-secondary text-sm mb-2">Skill</label>
              <input
                type="text"
                value={itemForm.skill}
                onChange={(e) => setItemForm({ ...itemForm, skill: e.target.value })}
                list="skills"
                placeholder="e.g., blacksmithing"
                className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
              />
              <datalist id="skills">
                {skills.map((skill) => (
                  <option key={skill} value={skill} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">Difficulty (1-100)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={itemForm.difficulty}
                  onChange={(e) => setItemForm({ ...itemForm, difficulty: parseInt(e.target.value) || 20 })}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-2">Base Time (sec)</label>
                <input
                  type="number"
                  min="1"
                  value={itemForm.base_time_seconds}
                  onChange={(e) => setItemForm({ ...itemForm, base_time_seconds: parseInt(e.target.value) || 10 })}
                  className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
            </div>

            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={itemForm.is_base_material}
                onChange={(e) => setItemForm({ ...itemForm, is_base_material: e.target.checked })}
                className="rounded"
              />
              <span className="text-text-secondary">Base material (raw resource, not crafted)</span>
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
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <h2 className="text-accent text-xl font-semibold">Items</h2>
            <div className="flex-1" />

            {/* Search */}
            <input
              type="text"
              placeholder="Search items..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent w-full md:w-64"
            />
          </div>

          {/* Filters */}
          <div className="flex flex-wrap gap-2 mb-4">
            <select
              value={filterSkill}
              onChange={(e) => setFilterSkill(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white text-sm"
            >
              <option value="">All Skills</option>
              {skills.map((skill) => (
                <option key={skill} value={skill}>{skill}</option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="px-3 py-2 bg-bg-tertiary border border-border rounded-lg text-white text-sm"
            >
              <option value="">All Categories</option>
              <option value="__uncategorized__">⚠️ Uncategorized ({uncategorizedCount})</option>
              {categoriesWithCounts.map((c) => (
                <option key={c.category} value={c.category}>{c.category} ({c.count})</option>
              ))}
            </select>

            <div className="flex gap-1 bg-bg-tertiary rounded-lg p-1">
              {[
                { value: "all", label: "All" },
                { value: "base", label: "Base" },
                { value: "crafted", label: "Crafted" },
              ].map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterType(opt.value as typeof filterType)}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    filterType === opt.value
                      ? "bg-accent text-white"
                      : "text-text-secondary hover:text-white"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>

            <button
              onClick={selectAllFiltered}
              className="px-3 py-1 text-sm text-text-secondary hover:text-white transition-colors"
            >
              Select All ({filteredItems.length})
            </button>

            <span className="text-text-secondary text-sm self-center ml-2">
              {filteredItems.length} items
            </span>
          </div>

          {/* Items Table */}
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-bg-secondary">
                <tr className="text-left text-text-secondary text-sm border-b border-border">
                  <th className="pb-2 w-8">
                    <input
                      type="checkbox"
                      checked={selectedItems.size === filteredItems.length && filteredItems.length > 0}
                      onChange={(e) => e.target.checked ? selectAllFiltered() : clearSelection()}
                      className="rounded"
                    />
                  </th>
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Categories</th>
                  <th className="pb-2">Skill</th>
                  <th className="pb-2 text-center">Diff</th>
                  <th className="pb-2 text-center">Type</th>
                  <th className="pb-2 text-center">Visible</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedItems.map((item) => (
                  <tr key={item.id} className={`hover:bg-white/5 ${selectedItems.has(item.id) ? 'bg-accent/10' : ''}`}>
                    <td className="py-2">
                      <input
                        type="checkbox"
                        checked={selectedItems.has(item.id)}
                        onChange={() => toggleSelectItem(item.id)}
                        className="rounded"
                      />
                    </td>
                    <td className="py-2">
                      <span className="font-medium">{item.name}</span>
                      {item.slug && (
                        <span className="text-text-muted text-xs ml-2">/{item.slug}</span>
                      )}
                    </td>
                    <td className="py-2">
                      <CategoryEditor
                        itemId={item.id}
                        categories={itemCategories[item.id] || []}
                        allCategories={categoriesWithCounts.map(c => c.category)}
                        isEditing={editingCategories === item.id}
                        onStartEdit={() => {
                          if (!itemCategories[item.id]) {
                            loadItemCategories(item.id);
                          }
                          setEditingCategories(item.id);
                        }}
                        onSave={(cats) => {
                          saveItemCategories(item.id, cats);
                          setEditingCategories(null);
                        }}
                        onCancel={() => setEditingCategories(null)}
                      />
                    </td>
                    <td className="py-2 text-text-secondary text-sm">
                      {item.skill || "-"}
                    </td>
                    <td className="py-2 text-center text-sm">
                      {item.difficulty || "-"}
                    </td>
                    <td className="py-2 text-center">
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          item.is_base_material ? "bg-success/20 text-success" : "bg-accent/20 text-accent"
                        }`}
                      >
                        {item.is_base_material ? "Base" : "Crafted"}
                      </span>
                    </td>
                    <td className="py-2 text-center">
                      <button
                        onClick={() => toggleItemVisibility(item.id, !item.visible)}
                        className={`w-10 h-5 rounded-full transition-colors relative ${
                          item.visible ? "bg-green-500" : "bg-gray-600"
                        }`}
                        title={item.visible ? "Visible in crafting calculator" : "Hidden from crafting calculator"}
                      >
                        <span
                          className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                            item.visible ? "left-5" : "left-0.5"
                          }`}
                        />
                      </button>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => editItem(item)}
                          className="px-2 py-1 text-xs bg-accent/20 text-accent hover:bg-accent/30 rounded transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="px-2 py-1 text-xs bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded transition-colors"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t border-border">
              <div className="text-sm text-text-secondary">
                Showing {((currentPage - 1) * ITEMS_PER_PAGE) + 1}-{Math.min(currentPage * ITEMS_PER_PAGE, filteredItems.length)} of {filteredItems.length} items
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Prev
                </button>
                <div className="flex items-center gap-1">
                  {/* Page number input */}
                  <input
                    type="number"
                    min={1}
                    max={totalPages}
                    value={currentPage}
                    onChange={(e) => {
                      const page = parseInt(e.target.value);
                      if (page >= 1 && page <= totalPages) {
                        setCurrentPage(page);
                      }
                    }}
                    className="w-16 px-2 py-1 text-sm text-center bg-bg-tertiary border border-border rounded text-white"
                  />
                  <span className="text-text-secondary text-sm">/ {totalPages}</span>
                </div>
                <button
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm bg-bg-tertiary border border-border rounded hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Category Editor Component
function CategoryEditor({
  itemId,
  categories,
  allCategories,
  isEditing,
  onStartEdit,
  onSave,
  onCancel,
}: {
  itemId: number;
  categories: string[];
  allCategories: string[];
  isEditing: boolean;
  onStartEdit: () => void;
  onSave: (categories: string[]) => void;
  onCancel: () => void;
}) {
  const [editCategories, setEditCategories] = useState<string[]>(categories);
  const [newCat, setNewCat] = useState("");

  // Reset when starting to edit
  useEffect(() => {
    if (isEditing) {
      setEditCategories(categories);
    }
  }, [isEditing, categories]);

  if (!isEditing) {
    return (
      <button
        onClick={onStartEdit}
        className="text-left group"
      >
        {categories.length > 0 ? (
          <div className="flex flex-wrap gap-1">
            {categories.map((cat) => (
              <span
                key={cat}
                className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400"
              >
                {cat}
              </span>
            ))}
          </div>
        ) : (
          <span className="text-xs text-text-muted group-hover:text-orange-400">
            + Add category
          </span>
        )}
      </button>
    );
  }

  const addCategory = (cat: string) => {
    const normalized = cat.trim().toLowerCase();
    if (normalized && !editCategories.includes(normalized)) {
      setEditCategories([...editCategories, normalized]);
    }
    setNewCat("");
  };

  const removeCategory = (cat: string) => {
    setEditCategories(editCategories.filter((c) => c !== cat));
  };

  return (
    <div className="space-y-2 min-w-[200px]">
      {/* Current categories */}
      <div className="flex flex-wrap gap-1">
        {editCategories.map((cat) => (
          <span
            key={cat}
            className="text-xs px-2 py-0.5 rounded bg-purple-500/20 text-purple-400 flex items-center gap-1"
          >
            {cat}
            <button
              onClick={() => removeCategory(cat)}
              className="hover:text-red-400"
            >
              ×
            </button>
          </span>
        ))}
      </div>

      {/* Add from existing */}
      <div className="flex gap-1">
        <select
          className="flex-1 px-2 py-1 bg-bg-tertiary border border-border rounded text-xs text-white"
          value=""
          onChange={(e) => {
            if (e.target.value) {
              addCategory(e.target.value);
            }
          }}
        >
          <option value="">Select category...</option>
          {allCategories
            .filter((c) => !editCategories.includes(c))
            .map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
        </select>
      </div>

      {/* Add new */}
      <div className="flex gap-1">
        <input
          type="text"
          placeholder="New category..."
          value={newCat}
          onChange={(e) => setNewCat(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && newCat.trim()) {
              e.preventDefault();
              addCategory(newCat);
            }
          }}
          className="flex-1 px-2 py-1 bg-bg-tertiary border border-border rounded text-xs text-white"
        />
        <button
          onClick={() => addCategory(newCat)}
          disabled={!newCat.trim()}
          className="px-2 py-1 bg-accent hover:bg-accent-hover rounded text-xs disabled:opacity-50"
        >
          +
        </button>
      </div>

      {/* Actions */}
      <div className="flex gap-1">
        <button
          onClick={() => onSave(editCategories)}
          className="flex-1 px-2 py-1 bg-success/20 text-success hover:bg-success/30 rounded text-xs"
        >
          Save
        </button>
        <button
          onClick={onCancel}
          className="flex-1 px-2 py-1 bg-bg-tertiary border border-border hover:bg-white/10 rounded text-xs"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}
