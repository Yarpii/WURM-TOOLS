"use client";

import { useState } from "react";
import type { Item } from "./types";

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
    category: "",
    is_base_material: false,
    description: "",
  });
  const [editingItem, setEditingItem] = useState(false);

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
      onDataChange();
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
      category: "",
      is_base_material: false,
      description: "",
    });
    setEditingItem(false);
  };

  return (
    <div className="grid lg:grid-cols-3 gap-6">
      {/* Item Form */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">
          {editingItem ? "Edit Item" : "Add New Item"}
        </h2>
        <form onSubmit={handleItemSubmit} className="space-y-4">
          <div>
            <label className="block text-text-secondary text-sm mb-2">Name</label>
            <input
              type="text"
              value={itemForm.name}
              onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })}
              required
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
            />
          </div>

          <div>
            <label className="block text-text-secondary text-sm mb-2">Category</label>
            <input
              type="text"
              value={itemForm.category}
              onChange={(e) => setItemForm({ ...itemForm, category: e.target.value })}
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
              onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })}
              rows={2}
              className="w-full px-4 py-3 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={itemForm.is_base_material}
              onChange={(e) => setItemForm({ ...itemForm, is_base_material: e.target.checked })}
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
        <h2 className="text-accent text-xl font-semibold mb-4">All Items</h2>
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
  );
}
