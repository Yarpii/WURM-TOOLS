"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { Merchant, MerchantCategory } from "@/lib/types";
import InfoSection from "@/components/InfoSection";

type TabType = "browse" | "add" | "my-merchants";

const CATEGORIES: { value: MerchantCategory; label: string }[] = [
  { value: "tools", label: "Tools" },
  { value: "weapons", label: "Weapons" },
  { value: "armor", label: "Armor" },
  { value: "materials", label: "Materials" },
  { value: "food", label: "Food & Cooking" },
  { value: "animals", label: "Animals" },
  { value: "vehicles", label: "Vehicles & Ships" },
  { value: "furniture", label: "Furniture & Deco" },
  { value: "misc", label: "Miscellaneous" },
];

const getCategoryIcon = (category: MerchantCategory) => {
  const icons: Record<MerchantCategory, string> = {
    tools: "🔧",
    weapons: "⚔️",
    armor: "🛡️",
    materials: "📦",
    food: "🍖",
    animals: "🐴",
    vehicles: "🚢",
    furniture: "🪑",
    misc: "📋",
  };
  return icons[category] || "📋";
};

export default function MerchantsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("browse");
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [myMerchants, setMyMerchants] = useState<Merchant[]>([]);
  const [servers, setServers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    active: 0,
    by_category: {} as Record<string, number>,
    by_server: {} as Record<string, number>,
  });

  // Filters
  const [filterCategory, setFilterCategory] = useState<MerchantCategory | "all">("all");
  const [filterServer, setFilterServer] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");

  // Create form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    location: "",
    server: "",
    coordinates: "",
    category: "misc" as MerchantCategory,
    stock_list: "",
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Edit modal state
  const [editingMerchant, setEditingMerchant] = useState<Merchant | null>(null);

  const fetchMerchants = async () => {
    try {
      const params = new URLSearchParams();
      if (filterCategory !== "all") params.set("category", filterCategory);
      if (filterServer !== "all") params.set("server", filterServer);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/merchants?${params}`);
      const data = await res.json();
      setMerchants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch merchants:", err);
    }
  };

  const fetchMyMerchants = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/merchants?user_id=${user.id}`);
      const data = await res.json();
      setMyMerchants(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch my merchants:", err);
    }
  };

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/merchants?servers=1");
      const data = await res.json();
      setServers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/merchants?stats=1");
      const data = await res.json();
      setStats({
        active: data?.active ?? 0,
        by_category: data?.by_category ?? {},
        by_server: data?.by_server ?? {},
      });
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMerchants(), fetchStats(), fetchServers()]);
      if (user) await fetchMyMerchants();
      setLoading(false);
    };
    loadData();
  }, [user]);

  useEffect(() => {
    fetchMerchants();
  }, [filterCategory, filterServer, searchQuery]);

  const handleCreateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/merchants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create merchant");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Merchant added successfully!");
      setFormData({
        name: "",
        description: "",
        location: "",
        server: "",
        coordinates: "",
        category: "misc",
        stock_list: "",
      });

      await Promise.all([fetchMerchants(), fetchMyMerchants(), fetchStats()]);
      setSubmitting(false);
    } catch (err) {
      setFormError("Connection error: " + String(err));
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (merchantId: number, isActive: boolean) => {
    try {
      const res = await fetch(`/api/merchants/${merchantId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: isActive }),
      });

      if (res.ok) {
        await Promise.all([fetchMerchants(), fetchMyMerchants(), fetchStats()]);
      }
    } catch (err) {
      console.error("Failed to toggle merchant:", err);
    }
  };

  const handleDeleteMerchant = async (merchantId: number) => {
    if (!confirm("Are you sure you want to delete this merchant?")) return;

    try {
      const res = await fetch(`/api/merchants/${merchantId}`, {
        method: "DELETE",
      });

      if (res.ok) {
        await Promise.all([fetchMerchants(), fetchMyMerchants(), fetchStats()]);
      }
    } catch (err) {
      console.error("Failed to delete merchant:", err);
    }
  };

  const handleUpdateMerchant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingMerchant) return;

    try {
      const res = await fetch(`/api/merchants/${editingMerchant.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingMerchant.name,
          description: editingMerchant.description,
          location: editingMerchant.location,
          server: editingMerchant.server,
          coordinates: editingMerchant.coordinates,
          category: editingMerchant.category,
          stock_list: editingMerchant.stock_list,
        }),
      });

      if (res.ok) {
        setEditingMerchant(null);
        await Promise.all([fetchMerchants(), fetchMyMerchants()]);
      }
    } catch (err) {
      console.error("Failed to update merchant:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const MerchantCard = ({ merchant, showActions = false }: { merchant: Merchant; showActions?: boolean }) => (
    <div className={`bg-bg-tertiary rounded-lg border transition-colors ${
      merchant.is_active ? "border-border hover:border-accent/50" : "border-border/50 opacity-60"
    } p-5`}>
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <span className="text-2xl">{getCategoryIcon(merchant.category)}</span>
            <h3 className="text-lg font-semibold text-text-primary">{merchant.name}</h3>
            {!merchant.is_active && (
              <span className="px-2 py-0.5 rounded text-xs bg-text-muted/20 text-text-muted">
                Inactive
              </span>
            )}
          </div>

          {merchant.description && (
            <p className="text-sm text-text-secondary mb-3">{merchant.description}</p>
          )}

          <div className="grid gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Server:</span>
              <span className="text-accent font-medium">{merchant.server}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Location:</span>
              <span className="text-text-primary">{merchant.location}</span>
              {merchant.coordinates && (
                <span className="text-text-muted">({merchant.coordinates})</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Category:</span>
              <span className="px-2 py-0.5 rounded text-xs bg-accent/20 text-accent">
                {CATEGORIES.find((c) => c.value === merchant.category)?.label || merchant.category}
              </span>
            </div>
          </div>

          <div className="mt-4 p-3 bg-bg-secondary rounded-lg">
            <div className="text-xs text-text-muted mb-1 font-medium">Stock:</div>
            <div className="text-sm text-text-primary whitespace-pre-wrap">{merchant.stock_list}</div>
          </div>

          <div className="mt-3 flex items-center gap-3 text-xs text-text-muted">
            <span>Owner: <span className="text-text-secondary">{merchant.username}</span></span>
            <span>Updated: {formatDate(merchant.updated_at)}</span>
          </div>
        </div>

        {showActions && (
          <div className="flex flex-col gap-2">
            <button
              onClick={() => setEditingMerchant(merchant)}
              className="px-3 py-1.5 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
            >
              Edit
            </button>
            <button
              onClick={() => handleToggleActive(merchant.id, !merchant.is_active)}
              className={`px-3 py-1.5 text-xs rounded transition-colors ${
                merchant.is_active
                  ? "bg-warning/20 text-warning hover:bg-warning/30"
                  : "bg-success/20 text-success hover:bg-success/30"
              }`}
            >
              {merchant.is_active ? "Deactivate" : "Activate"}
            </button>
            <button
              onClick={() => handleDeleteMerchant(merchant.id)}
              className="px-3 py-1.5 text-xs bg-danger/20 text-danger rounded hover:bg-danger/30 transition-colors"
            >
              Delete
            </button>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Merchants</h1>
        <p className="text-text-secondary">
          Find player-owned merchants and their stock across all servers
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">{stats.active}</div>
          <div className="text-sm text-text-muted">Active Merchants</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-accent">{Object.keys(stats.by_server).length}</div>
          <div className="text-sm text-text-muted">Servers</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-success">{Object.keys(stats.by_category).length}</div>
          <div className="text-sm text-text-muted">Categories</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-info">{myMerchants.length}</div>
          <div className="text-sm text-text-muted">Your Merchants</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "browse"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Browse Merchants
        </button>
        {user && (
          <>
            <button
              onClick={() => setActiveTab("add")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "add"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              Add Merchant
            </button>
            <button
              onClick={() => setActiveTab("my-merchants")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "my-merchants"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              My Merchants
              {myMerchants.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-accent/20 rounded">
                  {myMerchants.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <div>
          {/* Filters */}
          <div className="flex flex-wrap gap-4 mb-6">
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value as MerchantCategory | "all")}
              className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
            >
              <option value="all">All Categories</option>
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {getCategoryIcon(cat.value)} {cat.label}
                </option>
              ))}
            </select>

            <select
              value={filterServer}
              onChange={(e) => setFilterServer(e.target.value)}
              className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
            >
              <option value="all">All Servers</option>
              {servers.map((server) => (
                <option key={server} value={server}>{server}</option>
              ))}
            </select>

            <input
              type="text"
              placeholder="Search by name, location, or stock..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
            />
          </div>

          {/* Merchants List */}
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading merchants...</div>
          ) : merchants.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">No merchants found</div>
              <p className="text-sm text-text-muted">
                {user
                  ? "Be the first to add a merchant!"
                  : "Login to add your merchant"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {merchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Tab */}
      {activeTab === "add" && user && (
        <div className="max-w-2xl">
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Add Your Merchant</h2>

            <form onSubmit={handleCreateMerchant} className="space-y-6">
              {formError && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                  {formSuccess}
                </div>
              )}

              {/* Merchant Name */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Merchant Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  placeholder="e.g., Smithy Joe's Tools"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Description (Optional)</label>
                <input
                  type="text"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Short description of your merchant"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Server and Location */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Server</label>
                  <select
                    value={formData.server}
                    onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  >
                    <option value="">Select Server</option>
                    {servers.map((server) => (
                      <option key={server} value={server}>{server}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Coordinates (Optional)</label>
                  <input
                    type="text"
                    value={formData.coordinates}
                    onChange={(e) => setFormData({ ...formData, coordinates: e.target.value })}
                    placeholder="e.g., N15 or x1234 y5678"
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              {/* Location */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Location Description</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  required
                  placeholder="e.g., Near the coast, south of Glasshollow"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Category */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Category</label>
                <div className="grid grid-cols-3 gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setFormData({ ...formData, category: cat.value })}
                      className={`px-3 py-2 rounded-lg text-sm transition-colors border ${
                        formData.category === cat.value
                          ? "bg-accent/20 text-accent border-accent/50"
                          : "bg-bg-tertiary text-text-secondary border-border hover:border-accent/50"
                      }`}
                    >
                      {getCategoryIcon(cat.value)} {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Stock List */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">What do you sell?</label>
                <textarea
                  value={formData.stock_list}
                  onChange={(e) => setFormData({ ...formData, stock_list: e.target.value })}
                  required
                  rows={5}
                  placeholder="List your items here, one per line or comma-separated.&#10;e.g., 80QL Pickaxes - 50c&#10;90QL Swords - 1s&#10;Rare hammers available!"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
                />
                <p className="text-xs text-text-muted mt-1">
                  Include quality levels and prices if possible
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  submitting
                    ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                    : "bg-accent hover:bg-accent-hover text-white"
                }`}
              >
                {submitting ? "Adding..." : "Add Merchant"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Merchants Tab */}
      {activeTab === "my-merchants" && user && (
        <div>
          {myMerchants.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">You haven&apos;t added any merchants yet</div>
              <button
                onClick={() => setActiveTab("add")}
                className="text-accent hover:text-accent-hover transition-colors"
              >
                Add your first merchant
              </button>
            </div>
          ) : (
            <div className="grid gap-4">
              {myMerchants.map((merchant) => (
                <MerchantCard key={merchant.id} merchant={merchant} showActions />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Login prompt for non-authenticated users */}
      {!user && activeTab !== "browse" && (
        <div className="text-center py-12">
          <div className="text-text-muted mb-4">Please login to access this feature</div>
          <a
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </a>
        </div>
      )}

      {/* ========== FEATURE SECTIONS BELOW MAIN CONTENT ========== */}

      {/* How It Works Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="text-center mb-12">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-medium mb-4">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
            </svg>
            Merchant Directory
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
            How the Directory Works
          </h2>
          <p className="text-text-secondary max-w-2xl mx-auto">
            Find player-owned merchants across all Wurm servers or list your own to attract customers from around the world.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {/* Step 1 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                1
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Find Merchants</h3>
              <p className="text-text-secondary text-sm">
                Browse merchants by category, server, or search for specific items. Find exactly what you need without traveling blindly.
              </p>
            </div>
          </div>

          {/* Step 2 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                2
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Check Stock & Location</h3>
              <p className="text-text-secondary text-sm">
                See what items are available, their quality levels, prices, and exact location before making the trip.
              </p>
            </div>
          </div>

          {/* Step 3 */}
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-xl opacity-0 group-hover:opacity-20 transition-opacity blur-lg" />
            <div className="relative bg-bg-secondary rounded-xl border border-border p-6 hover:border-blue-500/50 transition-colors">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xl font-bold mb-4">
                3
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Visit & Buy</h3>
              <p className="text-text-secondary text-sm">
                Travel to the merchant's location using the coordinates provided. No more wasted trips to empty merchants!
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why List Your Merchant Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          {/* Left: Content */}
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-sm font-medium mb-4">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
              </svg>
              Grow Your Business
            </div>
            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Why List Your Merchant?
            </h2>
            <p className="text-text-secondary mb-8">
              Get more customers by making your merchant visible to players across all servers. It's free and takes less than a minute!
            </p>

            <div className="space-y-4">
              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-cyan-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Increased Visibility</h4>
                  <p className="text-sm text-text-muted">Your merchant appears in searches even when you're offline. Customers can plan visits ahead.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-cyan-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Clear Directions</h4>
                  <p className="text-sm text-text-muted">Include coordinates and landmarks so customers can find you easily without asking in chat.</p>
                </div>
              </div>

              <div className="flex gap-4 p-4 bg-bg-secondary rounded-xl border border-border hover:border-cyan-500/30 transition-colors">
                <div className="w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </div>
                <div>
                  <h4 className="font-medium text-text-primary mb-1">Easy Updates</h4>
                  <p className="text-sm text-text-muted">Update your stock list anytime. Deactivate when you're restocking, reactivate when ready.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Right: Visual */}
          <div className="relative">
            <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/20 to-cyan-500/20 rounded-3xl blur-2xl" />
            <div className="relative bg-bg-secondary rounded-2xl border border-border p-8 overflow-hidden">
              {/* Decorative pattern */}
              <div className="absolute inset-0 opacity-10">
                <div className="absolute inset-0" style={{
                  backgroundImage: `radial-gradient(circle at 1px 1px, currentColor 1px, transparent 0)`,
                  backgroundSize: "24px 24px",
                }} />
              </div>

              <div className="relative text-center">
                <div className="w-24 h-24 mx-auto rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mb-6 shadow-2xl">
                  <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>

                <div className="space-y-4 text-left">
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Active Merchants</span>
                    <span className="text-accent font-semibold">{stats.active}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Servers Covered</span>
                    <span className="text-success font-semibold">{Object.keys(stats.by_server).length}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-bg-tertiary rounded-lg">
                    <span className="text-text-secondary text-sm">Categories</span>
                    <span className="text-text-primary font-medium">{CATEGORIES.length} Types</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Related Tools Section */}
      <section className="mt-16 pt-16 border-t border-border">
        <div className="text-center mb-10">
          <h2 className="text-2xl font-bold text-text-primary mb-3">
            More Ways to Trade
          </h2>
          <p className="text-text-secondary">
            Use these tools alongside the Merchant Directory for the complete trading experience
          </p>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Marketplace */}
          <Link
            href="/market"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-violet-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-violet-400 transition-colors">
                Marketplace
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Can't find it at a merchant? Create a buy order and let sellers come to you.
              </p>
              <span className="inline-flex items-center gap-2 text-violet-400 text-sm font-medium">
                Browse Orders
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>

          {/* Price Guide */}
          <Link
            href="/prices"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-emerald-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-emerald-400 transition-colors">
                Price Guide
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Check if merchant prices are fair. Compare against community averages.
              </p>
              <span className="inline-flex items-center gap-2 text-emerald-400 text-sm font-medium">
                Check Prices
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>

          {/* World Map */}
          <Link
            href="/map"
            className="group relative p-6 bg-bg-secondary rounded-xl border border-border hover:border-cyan-500/50 transition-all hover:translate-y-[-4px]"
          >
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500 to-blue-600 rounded-xl opacity-0 group-hover:opacity-10 transition-opacity blur-lg" />
            <div className="relative">
              <div className="w-14 h-14 rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform shadow-lg">
                <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2 group-hover:text-cyan-400 transition-colors">
                World Map
              </h3>
              <p className="text-text-secondary text-sm mb-4">
                Visualize merchant locations on the map. Plan efficient shopping routes.
              </p>
              <span className="inline-flex items-center gap-2 text-cyan-400 text-sm font-medium">
                View Map
                <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </span>
            </div>
          </Link>
        </div>
      </section>

      <InfoSection>
      {/* CTA Section */}
      <section className="mt-16 pt-16 border-t border-border pb-8">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-blue-500/10 to-indigo-600/10 border border-blue-500/20 p-8 md:p-12">
          {/* Background decoration */}
          <div className="absolute -right-24 -top-24 w-64 h-64 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full opacity-10 blur-3xl" />
          <div className="absolute -left-24 -bottom-24 w-48 h-48 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-full opacity-10 blur-3xl" />

          <div className="relative text-center max-w-2xl mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white mx-auto mb-6 shadow-lg shadow-blue-500/25">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-text-primary mb-4">
              Got a Merchant? List It!
            </h2>
            <p className="text-text-secondary mb-8">
              Help other players find great deals and grow your customer base. Adding a merchant takes less than a minute and it's completely free!
            </p>

            {user ? (
              <button
                onClick={() => setActiveTab("add")}
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                Add Your Merchant
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            ) : (
              <Link
                href="/register"
                className="inline-flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-semibold hover:from-blue-600 hover:to-indigo-700 transition-all hover:scale-105 shadow-lg shadow-blue-500/25"
              >
                Join to List Your Merchant
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            )}
          </div>
        </div>
      </section>
      </InfoSection>

      {/* Edit Modal */}
      {editingMerchant && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-xl border border-border p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Edit Merchant</h2>

            <form onSubmit={handleUpdateMerchant} className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-2">Merchant Name</label>
                <input
                  type="text"
                  value={editingMerchant.name}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, name: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Description</label>
                <input
                  type="text"
                  value={editingMerchant.description || ""}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, description: e.target.value })}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Server</label>
                  <select
                    value={editingMerchant.server}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, server: e.target.value })}
                    required
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  >
                    {servers.map((server) => (
                      <option key={server} value={server}>{server}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-text-secondary mb-2">Coordinates</label>
                  <input
                    type="text"
                    value={editingMerchant.coordinates || ""}
                    onChange={(e) => setEditingMerchant({ ...editingMerchant, coordinates: e.target.value })}
                    className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Location</label>
                <input
                  type="text"
                  value={editingMerchant.location}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, location: e.target.value })}
                  required
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Category</label>
                <select
                  value={editingMerchant.category}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, category: e.target.value as MerchantCategory })}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {getCategoryIcon(cat.value)} {cat.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Stock List</label>
                <textarea
                  value={editingMerchant.stock_list}
                  onChange={(e) => setEditingMerchant({ ...editingMerchant, stock_list: e.target.value })}
                  required
                  rows={5}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingMerchant(null)}
                  className="flex-1 py-3 rounded-lg font-medium bg-bg-tertiary text-text-secondary hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 rounded-lg font-medium bg-accent hover:bg-accent-hover text-white transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
