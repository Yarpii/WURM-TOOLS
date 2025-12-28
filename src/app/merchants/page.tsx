"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { Merchant, MerchantCategory } from "@/lib/types";

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
      setMerchants(data);
    } catch (err) {
      console.error("Failed to fetch merchants:", err);
    }
  };

  const fetchMyMerchants = async () => {
    if (!user) return;
    try {
      const res = await fetch(`/api/merchants?user_id=${user.id}`);
      const data = await res.json();
      setMyMerchants(data);
    } catch (err) {
      console.error("Failed to fetch my merchants:", err);
    }
  };

  const fetchServers = async () => {
    try {
      const res = await fetch("/api/merchants?servers=1");
      const data = await res.json();
      setServers(data);
    } catch (err) {
      console.error("Failed to fetch servers:", err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch("/api/merchants?stats=1");
      const data = await res.json();
      setStats(data);
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
