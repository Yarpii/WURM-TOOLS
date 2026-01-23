"use client";

import { useState, useMemo } from "react";
import type { Item } from "@/lib/types";

interface ItemsTabProps {
  items: Item[];
  categories: string[];
  onDataChange: () => void;
  showMessage: (type: "success" | "error", text: string) => void;
}

export default function ItemsTab({ items, categories, onDataChange, showMessage }: ItemsTabProps) {
  const [itemForm, setItemForm] = useState({
    id: 0,
    name: "",
    slug: "",
    skill: "",
    difficulty: 20,
    base_time_seconds: 10,
    is_base_material: false,
    categories: [] as string[],
  });
  const [newCategory, setNewCategory] = useState("");
  const [editingItem, setEditingItem] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSkill, setFilterSkill] = useState("");
  const [filterCategory, setFilterCategory] = useState("");
  const [filterType, setFilterType] = useState<"all" | "base" | "crafted">("all");

  // Get unique skills from items
  const skills = useMemo(() => {
    const skillSet = new Set(items.map(i => i.skill).filter((s): s is string => !!s));
    return Array.from(skillSet).sort();
  }, [items]);

  // Filter items
  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchesSearch = !searchQuery ||
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.slug?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesSkill = !filterSkill || item.skill === filterSkill;

      const matchesCategory = !filterCategory ||
        (item.categories && item.categories.includes(filterCategory));

      const matchesType = filterType === "all" ||
        (filterType === "base" && item.is_base_material) ||
        (filterType === "crafted" && !item.is_base_material);

      return matchesSearch && matchesSkill && matchesCategory && matchesType;
    });
  }, [items, searchQuery, filterSkill, filterCategory, filterType]);

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
        categories: itemForm.categories,
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

  const addCategory = () => {
    const cat = newCategory.trim().toLowerCase();
    if (cat && !itemForm.categories.includes(cat)) {
      setItemForm({ ...itemForm, categories: [...itemForm.categories, cat] });
    }
    setNewCategory("");
  };

  const removeCategory = (cat: string) => {
    setItemForm({ ...itemForm, categories: itemForm.categories.filter(c => c !== cat) });
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
      categories: item.categories || [],
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
      categories: [],
    });
    setNewCategory("");
    setEditingItem(false);
  };

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-accent">{items.length}</div>
          <div className="text-sm text-text-secondary">Total Items</div>
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
          <div className="text-2xl font-bold text-purple-400">{skills.length}</div>
          <div className="text-sm text-text-secondary">Skills</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl text-center">
          <div className="text-2xl font-bold text-orange-400">{categories.length}</div>
          <div className="text-sm text-text-secondary">Categories</div>
        </div>
      </div>

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

            <div>
              <label className="block text-text-secondary text-sm mb-2">Categories</label>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addCategory();
                    }
                  }}
                  list="categories"
                  placeholder="Add category..."
                  className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
                <button
                  type="button"
                  onClick={addCategory}
                  className="px-4 py-2 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors"
                >
                  Add
                </button>
              </div>
              <datalist id="categories">
                {categories.map((cat) => (
                  <option key={cat} value={cat} />
                ))}
              </datalist>
              {itemForm.categories.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {itemForm.categories.map((cat) => (
                    <span
                      key={cat}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded text-sm"
                    >
                      {cat}
                      <button
                        type="button"
                        onClick={() => removeCategory(cat)}
                        className="hover:text-red-400 transition-colors"
                      >
                        &times;
                      </button>
                    </span>
                  ))}
                </div>
              )}
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
              {categories.map((cat) => (
                <option key={cat} value={cat}>{cat}</option>
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

            <span className="text-text-secondary text-sm self-center ml-2">
              {filteredItems.length} items
            </span>
          </div>

          {/* Items Table */}
          <div className="max-h-[500px] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-bg-secondary">
                <tr className="text-left text-text-secondary text-sm border-b border-border">
                  <th className="pb-2">Name</th>
                  <th className="pb-2">Skill</th>
                  <th className="pb-2">Categories</th>
                  <th className="pb-2 text-center">Diff</th>
                  <th className="pb-2 text-center">Type</th>
                  <th className="pb-2 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/5">
                    <td className="py-2">
                      <span className="font-medium">{item.name}</span>
                      {item.slug && (
                        <span className="text-text-muted text-xs ml-2">/{item.slug}</span>
                      )}
                    </td>
                    <td className="py-2 text-text-secondary text-sm">
                      {item.skill || "-"}
                    </td>
                    <td className="py-2">
                      {item.categories && item.categories.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {item.categories.map((cat) => (
                            <span
                              key={cat}
                              className="text-xs px-1.5 py-0.5 bg-orange-500/20 text-orange-400 rounded"
                            >
                              {cat}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted text-sm">-</span>
                      )}
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
        </div>
      </div>
    </div>
  );
}
