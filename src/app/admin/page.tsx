"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { Item } from "@/lib/types";
import AdminGuard from "@/components/AdminGuard";
import { ItemsTab, MembersTab } from "@/components/admin";

type TabType = "items" | "members";

function AdminContent() {
  const [items, setItems] = useState<Item[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>("items");

  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [itemsRes, categoriesRes] = await Promise.all([
      fetch("/api/items?source=wurmpedia"),
      fetch("/api/items?categories=1&source=wurmpedia"),
    ]);
    setItems(await itemsRes.json());
    setCategories(await categoriesRes.json());
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 3000);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Page Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Admin Panel</h1>
        <p className="text-text-secondary">Manage items and members</p>
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

      {activeTab === "members" && <MembersTab showMessage={showMessage} />}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      className={`px-5 py-2.5 rounded-lg border-2 transition-all ${
        active
          ? "border-accent text-white"
          : "border-transparent bg-bg-tertiary border border-border text-text-secondary hover:text-white"
      }`}
      onClick={onClick}
    >
      {children}
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
