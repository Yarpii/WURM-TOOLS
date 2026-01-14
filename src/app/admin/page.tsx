"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Item } from "@/lib/types";
import AdminGuard from "@/components/AdminGuard";
import { ItemsTab, RecipesTab, MembersTab, DataTab, SubmissionsTab, Recipe } from "@/components/admin";

type TabType = "items" | "recipes" | "members" | "data" | "submissions";

function AdminContent() {
  const [items, setItems] = useState<Item[]>([]);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("items");
  const [pendingSubmissionsCount, setPendingSubmissionsCount] = useState(0);

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
    loadPendingSubmissionsCount();
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

  const loadPendingSubmissionsCount = async () => {
    try {
      const res = await fetch("/api/recipe-submissions?count=true");
      const data = await res.json();
      setPendingSubmissionsCount(data.count || 0);
    } catch (err) {
      console.error("Failed to load pending count:", err);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  // Group recipes by result item for count
  const groupedRecipesCount = Object.keys(
    recipes.reduce((acc, recipe) => {
      acc[recipe.result_item_id] = true;
      return acc;
    }, {} as Record<number, boolean>)
  ).length;

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Panel</h1>
        <p className="text-text-secondary">Manage your items and recipe blueprints</p>
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
        <TabButton
          active={activeTab === "items"}
          onClick={() => setActiveTab("items")}
        >
          Items ({items.length})
        </TabButton>
        <TabButton
          active={activeTab === "recipes"}
          onClick={() => setActiveTab("recipes")}
        >
          Recipes ({groupedRecipesCount})
        </TabButton>
        <TabButton
          active={activeTab === "members"}
          onClick={() => setActiveTab("members")}
        >
          Members
        </TabButton>
        <Link
          href="/admin/roles"
          className="px-5 py-2.5 rounded-lg border-2 transition-all border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white hover:border-accent"
        >
          Roles & Permissions
        </Link>
        <TabButton
          active={activeTab === "data"}
          onClick={() => setActiveTab("data")}
        >
          Data
        </TabButton>
        <TabButton
          active={activeTab === "submissions"}
          onClick={() => setActiveTab("submissions")}
          badge={pendingSubmissionsCount > 0 ? pendingSubmissionsCount : undefined}
        >
          Submissions
        </TabButton>
      </div>

      {/* Tab Content */}
      {activeTab === "items" && (
        <ItemsTab
          items={items}
          categories={categories}
          onDataChange={loadData}
          showMessage={showMessage}
        />
      )}

      {activeTab === "recipes" && (
        <RecipesTab
          items={items}
          recipes={recipes}
          onDataChange={loadData}
          showMessage={showMessage}
        />
      )}

      {activeTab === "members" && <MembersTab showMessage={showMessage} />}

      {activeTab === "data" && (
        <DataTab onDataChange={loadData} showMessage={showMessage} />
      )}

      {activeTab === "submissions" && (
        <SubmissionsTab
          onDataChange={loadData}
          showMessage={showMessage}
          onPendingCountChange={setPendingSubmissionsCount}
        />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
  badge?: number;
}) {
  return (
    <button
      className={`px-5 py-2.5 rounded-lg border-2 transition-all relative ${
        active
          ? "border-accent text-white"
          : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
      }`}
      onClick={onClick}
    >
      {children}
      {badge !== undefined && (
        <span className="absolute -top-1 -right-1 bg-amber-500 text-black text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
          {badge}
        </span>
      )}
    </button>
  );
}

export default function AdminPage() {
  return (
    <AdminGuard>
      <AdminContent />
    </AdminGuard>
  );
}
