"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type {
  TreasureHunt,
  TreasureLoot,
  SharedTreasure,
  TreasureStats,
  TreasureHuntStatus,
  TreasureDifficulty,
  SharedTreasureType,
} from "@/lib/types";

const WURM_SERVERS = [
  "Harmony", "Melody", "Cadence", "Defiance",
  "Xanadu", "Deliverance", "Exodus", "Celebration",
  "Pristine", "Release", "Independence", "Chaos",
];

const DIFFICULTY_LABELS: Record<TreasureDifficulty, { label: string; color: string; radius: string }> = {
  easy: { label: "Easy", color: "bg-success/20 text-success", radius: "15 tiles" },
  challenging: { label: "Challenging", color: "bg-warning/20 text-warning", radius: "10 tiles" },
  difficult: { label: "Difficult", color: "bg-danger/20 text-danger", radius: "5 tiles" },
};

const STATUS_LABELS: Record<TreasureHuntStatus, { label: string; color: string }> = {
  new: { label: "New Map", color: "bg-accent/20 text-accent" },
  reading: { label: "Reading", color: "bg-info/20 text-info" },
  searching: { label: "Searching", color: "bg-warning/20 text-warning" },
  found: { label: "Found!", color: "bg-success/20 text-success" },
  digging: { label: "Digging", color: "bg-warning/20 text-warning" },
  completed: { label: "Completed", color: "bg-success/20 text-success" },
  abandoned: { label: "Abandoned", color: "bg-text-muted/20 text-text-muted" },
};

const TREASURE_TYPES: Record<SharedTreasureType, { label: string; icon: string }> = {
  treasure_chest: { label: "Treasure Chest", icon: "📦" },
  rare_spawn: { label: "Rare Spawn", icon: "🦁" },
  unique_item: { label: "Unique Item", icon: "💎" },
  hidden_cache: { label: "Hidden Cache", icon: "🗝️" },
  archaeology: { label: "Archaeology Site", icon: "🏺" },
  other: { label: "Other", icon: "❓" },
};

type TabType = "my-hunts" | "community" | "stats";

const RARITY_COLORS: Record<string, string> = {
  rare: "text-warning",
  supreme: "text-cyan-400",
  fantastic: "text-purple-400",
};

export default function TreasuresPage() {
  const { user, loading: authLoading } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("my-hunts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  // My Hunts state
  const [hunts, setHunts] = useState<TreasureHunt[]>([]);
  const [selectedHunt, setSelectedHunt] = useState<TreasureHunt | null>(null);
  const [huntLoot, setHuntLoot] = useState<TreasureLoot[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterServer, setFilterServer] = useState<string>("");

  // Community state
  const [sharedTreasures, setSharedTreasures] = useState<SharedTreasure[]>([]);
  const [communityServer, setCommunityServer] = useState<string>("");

  // Stats state
  const [stats, setStats] = useState<TreasureStats | null>(null);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit" | "loot" | "share">("create");
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    server: "Harmony",
    map_quality: "",
    difficulty: "easy" as TreasureDifficulty,
    x: "",
    y: "",
    status: "new" as TreasureHuntStatus,
    treasure_type: "treasure_chest" as SharedTreasureType,
    parent_hunt_id: "",
    screenshot_url: "",
  });
  const [lootData, setLootData] = useState({ item_name: "", quantity: "1", quality: "", rarity: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [childHunts, setChildHunts] = useState<TreasureHunt[]>([]);

  // Fetch hunts
  const fetchHunts = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.set("status", filterStatus);
      if (filterServer) params.set("server", filterServer);

      const res = await fetch(`/api/treasures?${params}`);
      const data = await res.json();
      if (res.ok) {
        setHunts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch hunts:", err);
    } finally {
      setLoading(false);
    }
  }, [filterStatus, filterServer]);

  // Fetch shared treasures
  const fetchShared = useCallback(async () => {
    try {
      const params = new URLSearchParams({ action: "shared" });
      if (communityServer) params.set("server", communityServer);

      const res = await fetch(`/api/treasures?${params}`);
      const data = await res.json();
      if (res.ok) {
        setSharedTreasures(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch shared:", err);
    }
  }, [communityServer]);

  // Fetch stats
  const fetchStats = useCallback(async () => {
    try {
      const res = await fetch("/api/treasures?action=stats");
      const data = await res.json();
      if (res.ok) {
        setStats(data);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }, []);

  // Fetch hunt loot
  const fetchHuntLoot = async (huntId: number) => {
    try {
      const res = await fetch(`/api/treasures?id=${huntId}&action=loot`);
      const data = await res.json();
      if (res.ok) {
        setHuntLoot(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch loot:", err);
    }
  };

  useEffect(() => {
    if (user && activeTab === "my-hunts") {
      fetchHunts();
    } else if (activeTab === "community") {
      fetchShared();
    } else if (user && activeTab === "stats") {
      fetchStats();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, activeTab, fetchHunts, fetchShared, fetchStats]);

  // Select a hunt to view details
  const selectHunt = async (hunt: TreasureHunt) => {
    setSelectedHunt(hunt);
    await fetchHuntLoot(hunt.id);
    // Fetch child hunts (chained maps)
    try {
      const res = await fetch(`/api/treasures?id=${hunt.id}&action=children`);
      const data = await res.json();
      if (res.ok) {
        setChildHunts(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch child hunts:", err);
      setChildHunts([]);
    }
  };

  // Create new hunt
  const openCreateModal = (parentHuntId?: number) => {
    setFormData({
      name: "",
      description: "",
      server: parentHuntId && selectedHunt ? selectedHunt.server : "Harmony",
      map_quality: "",
      difficulty: "easy",
      x: "",
      y: "",
      status: "new",
      treasure_type: "treasure_chest",
      parent_hunt_id: parentHuntId?.toString() || "",
      screenshot_url: "",
    });
    setModalMode("create");
    setShowModal(true);
  };

  // Edit hunt
  const openEditModal = (hunt: TreasureHunt) => {
    setFormData({
      name: hunt.name,
      description: hunt.description || "",
      server: hunt.server,
      map_quality: hunt.map_quality?.toString() || "",
      difficulty: hunt.difficulty,
      x: hunt.x?.toString() || "",
      y: hunt.y?.toString() || "",
      status: hunt.status,
      treasure_type: "treasure_chest",
      parent_hunt_id: hunt.parent_hunt_id?.toString() || "",
      screenshot_url: hunt.screenshot_url || "",
    });
    setSelectedHunt(hunt);
    setModalMode("edit");
    setShowModal(true);
  };

  // Add loot modal
  const openLootModal = () => {
    setLootData({ item_name: "", quantity: "1", quality: "", rarity: "", notes: "" });
    setModalMode("loot");
    setShowModal(true);
  };

  // Share treasure modal
  const openShareModal = () => {
    setFormData({
      name: "",
      description: "",
      server: "Harmony",
      map_quality: "",
      difficulty: "easy",
      x: "",
      y: "",
      status: "new",
      treasure_type: "treasure_chest",
      parent_hunt_id: "",
      screenshot_url: "",
    });
    setModalMode("share");
    setShowModal(true);
  };

  // Handle form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSaving(true);

    try {
      let res: Response;

      if (modalMode === "create") {
        res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "create",
            ...formData,
          }),
        });
      } else if (modalMode === "edit" && selectedHunt) {
        res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "update",
            hunt_id: selectedHunt.id,
            ...formData,
          }),
        });
      } else if (modalMode === "loot" && selectedHunt) {
        res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "add-loot",
            hunt_id: selectedHunt.id,
            ...lootData,
          }),
        });
      } else if (modalMode === "share") {
        res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            action: "share",
            name: formData.name,
            description: formData.description,
            server: formData.server,
            x: formData.x,
            y: formData.y,
            treasure_type: formData.treasure_type,
          }),
        });
      } else {
        setSaving(false);
        return;
      }

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Operation failed");
        setSaving(false);
        return;
      }

      setSuccess("Success!");
      setShowModal(false);

      if (modalMode === "loot" && selectedHunt) {
        await fetchHuntLoot(selectedHunt.id);
      } else if (modalMode === "share") {
        await fetchShared();
      } else {
        await fetchHunts();
      }
    } catch (err) {
      setError("Operation failed: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  // Delete hunt
  const handleDeleteHunt = async (huntId: number) => {
    if (!confirm("Are you sure you want to delete this treasure hunt?")) return;

    try {
      const res = await fetch("/api/treasures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", hunt_id: huntId }),
      });

      if (res.ok) {
        setSuccess("Hunt deleted");
        setSelectedHunt(null);
        await fetchHunts();
      }
    } catch (err) {
      setError("Delete failed: " + String(err));
    }
  };

  // Vote on shared treasure
  const handleVote = async (treasureId: number, voteType: "up" | "down") => {
    try {
      await fetch("/api/treasures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", treasure_id: treasureId, vote_type: voteType }),
      });
      await fetchShared();
    } catch (err) {
      console.error("Vote failed:", err);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-bg-primary text-text-primary flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-accent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary text-text-primary">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold">Treasure Hunting</h1>
            <p className="text-text-secondary mt-1">
              Track your treasure maps and share locations with the community
            </p>
          </div>
          {user && (
            <div className="flex gap-2">
              <button
                onClick={openCreateModal}
                className="px-4 py-2 bg-accent rounded-lg hover:bg-accent-hover flex items-center gap-2"
              >
                <span>+</span> New Hunt
              </button>
              <button
                onClick={openShareModal}
                className="px-4 py-2 bg-bg-secondary border border-border rounded-lg hover:bg-bg-tertiary"
              >
                Share Location
              </button>
            </div>
          )}
        </div>

        {/* Messages */}
        {error && (
          <div className="bg-danger/20 border border-danger text-danger px-4 py-3 rounded mb-6">
            {error}
            <button onClick={() => setError("")} className="float-right">×</button>
          </div>
        )}
        {success && (
          <div className="bg-success/20 border border-success text-success px-4 py-3 rounded mb-6">
            {success}
            <button onClick={() => setSuccess("")} className="float-right">×</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border pb-2">
          <button
            onClick={() => setActiveTab("my-hunts")}
            className={`px-4 py-2 rounded-t ${
              activeTab === "my-hunts"
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            My Hunts
          </button>
          <button
            onClick={() => setActiveTab("community")}
            className={`px-4 py-2 rounded-t ${
              activeTab === "community"
                ? "bg-accent text-white"
                : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
            }`}
          >
            Community
          </button>
          {user && (
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 rounded-t ${
                activeTab === "stats"
                  ? "bg-accent text-white"
                  : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
              }`}
            >
              Stats
            </button>
          )}
        </div>

        {/* My Hunts Tab */}
        {activeTab === "my-hunts" && (
          <>
            {!user ? (
              <div className="text-center py-12 bg-bg-secondary rounded-lg">
                <p className="text-text-secondary mb-4">Please log in to track your treasure hunts.</p>
                <Link href="/login" className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
                  Log In
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Hunt List */}
                <div className="lg:col-span-1">
                  {/* Filters */}
                  <div className="flex gap-2 mb-4">
                    <select
                      value={filterStatus}
                      onChange={(e) => setFilterStatus(e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none text-sm"
                    >
                      <option value="">All Status</option>
                      {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                        <option key={key} value={key}>{label}</option>
                      ))}
                    </select>
                    <select
                      value={filterServer}
                      onChange={(e) => setFilterServer(e.target.value)}
                      className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none text-sm"
                    >
                      <option value="">All Servers</option>
                      {WURM_SERVERS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>

                  {/* Hunt Cards */}
                  {loading ? (
                    <div className="text-center py-8 text-text-muted">Loading...</div>
                  ) : hunts.length === 0 ? (
                    <div className="text-center py-8 bg-bg-secondary rounded-lg">
                      <p className="text-text-secondary mb-4">No treasure hunts yet.</p>
                      <button onClick={openCreateModal} className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
                        Start Your First Hunt
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-3 max-h-[600px] overflow-y-auto">
                      {hunts.map((hunt) => (
                        <div
                          key={hunt.id}
                          onClick={() => selectHunt(hunt)}
                          className={`p-4 bg-bg-secondary rounded-lg cursor-pointer border-2 transition-colors ${
                            selectedHunt?.id === hunt.id ? "border-accent" : "border-transparent hover:border-border"
                          }`}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {hunt.parent_hunt_id && (
                                <span className="text-warning" title="Chained map">↳</span>
                              )}
                              <h3 className="font-semibold truncate">{hunt.name}</h3>
                            </div>
                            <span className={`px-2 py-0.5 rounded text-xs flex-shrink-0 ${STATUS_LABELS[hunt.status].color}`}>
                              {STATUS_LABELS[hunt.status].label}
                            </span>
                          </div>
                          <div className="flex items-center gap-4 text-sm text-text-secondary">
                            <span>{hunt.server}</span>
                            <span className={`px-2 py-0.5 rounded text-xs ${DIFFICULTY_LABELS[hunt.difficulty].color}`}>
                              {DIFFICULTY_LABELS[hunt.difficulty].label}
                            </span>
                          </div>
                          {hunt.x && hunt.y && (
                            <div className="text-xs text-text-muted mt-1">
                              Location: {hunt.x}, {hunt.y}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Hunt Details */}
                <div className="lg:col-span-2">
                  {selectedHunt ? (
                    <div className="bg-bg-secondary rounded-lg p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h2 className="text-2xl font-bold">{selectedHunt.name}</h2>
                          <p className="text-text-secondary">{selectedHunt.server}</p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => openEditModal(selectedHunt)}
                            className="px-3 py-1 bg-bg-tertiary rounded hover:bg-bg-hover text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteHunt(selectedHunt.id)}
                            className="px-3 py-1 bg-danger/20 text-danger rounded hover:bg-danger/30 text-sm"
                          >
                            Delete
                          </button>
                        </div>
                      </div>

                      {/* Status & Info */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-bg-tertiary rounded p-3">
                          <div className="text-text-muted text-xs">Status</div>
                          <div className={`font-semibold ${STATUS_LABELS[selectedHunt.status].color.split(" ")[1]}`}>
                            {STATUS_LABELS[selectedHunt.status].label}
                          </div>
                        </div>
                        <div className="bg-bg-tertiary rounded p-3">
                          <div className="text-text-muted text-xs">Difficulty</div>
                          <div className="font-semibold">{DIFFICULTY_LABELS[selectedHunt.difficulty].label}</div>
                          <div className="text-xs text-text-muted">{DIFFICULTY_LABELS[selectedHunt.difficulty].radius}</div>
                        </div>
                        <div className="bg-bg-tertiary rounded p-3">
                          <div className="text-text-muted text-xs">Map QL</div>
                          <div className="font-semibold">{selectedHunt.map_quality || "Unknown"}</div>
                        </div>
                        <div className="bg-bg-tertiary rounded p-3">
                          <div className="text-text-muted text-xs">Location</div>
                          <div className="font-semibold">
                            {selectedHunt.x && selectedHunt.y ? `${selectedHunt.x}, ${selectedHunt.y}` : "Not found yet"}
                          </div>
                        </div>
                      </div>

                      {/* Parent Hunt Link */}
                      {selectedHunt.parent_hunt_id && selectedHunt.parent_hunt_name && (
                        <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">
                          <span className="text-text-muted text-sm">Found in chest from: </span>
                          <span className="text-accent font-medium">{selectedHunt.parent_hunt_name}</span>
                        </div>
                      )}

                      {selectedHunt.description && (
                        <p className="text-text-secondary mb-6">{selectedHunt.description}</p>
                      )}

                      {/* Screenshot */}
                      {selectedHunt.screenshot_url && (
                        <div className="mb-6">
                          <h3 className="font-semibold mb-2">Screenshot</h3>
                          <img
                            src={selectedHunt.screenshot_url}
                            alt="Treasure map screenshot"
                            className="max-w-full rounded-lg border border-border max-h-64 object-contain"
                          />
                        </div>
                      )}

                      {/* Loot Section */}
                      <div className="border-t border-border pt-4">
                        <div className="flex items-center justify-between mb-4">
                          <h3 className="font-semibold">Loot ({huntLoot.length})</h3>
                          {selectedHunt.status === "completed" && (
                            <div className="flex gap-2">
                              <button
                                onClick={() => openCreateModal(selectedHunt.id)}
                                className="px-3 py-1 bg-warning/20 text-warning rounded hover:bg-warning/30 text-sm"
                              >
                                + Map from Chest
                              </button>
                              <button
                                onClick={openLootModal}
                                className="px-3 py-1 bg-accent rounded hover:bg-accent-hover text-sm"
                              >
                                + Add Loot
                              </button>
                            </div>
                          )}
                        </div>

                        {huntLoot.length === 0 ? (
                          <p className="text-text-muted text-center py-4">
                            {selectedHunt.status === "completed"
                              ? "No loot recorded yet. Add your finds!"
                              : "Complete the hunt to record loot."}
                          </p>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                            {huntLoot.map((loot) => (
                              <div key={loot.id} className="bg-bg-tertiary rounded p-2 text-sm">
                                <div className="font-medium">{loot.item_name}</div>
                                <div className="text-text-muted">
                                  {loot.quantity}x {loot.quality && `QL${loot.quality}`}
                                  {loot.rarity && (
                                    <span className={`ml-1 ${RARITY_COLORS[loot.rarity] || ""}`}>
                                      ({loot.rarity})
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Chained Maps Section */}
                      {childHunts.length > 0 && (
                        <div className="border-t border-border pt-4 mt-4">
                          <h3 className="font-semibold mb-4">Maps Found in This Chest ({childHunts.length})</h3>
                          <div className="space-y-2">
                            {childHunts.map((child) => (
                              <div
                                key={child.id}
                                onClick={() => selectHunt(child)}
                                className="p-3 bg-bg-tertiary rounded-lg cursor-pointer hover:bg-bg-hover flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-medium">{child.name}</span>
                                  <span className={`ml-2 px-2 py-0.5 rounded text-xs ${STATUS_LABELS[child.status].color}`}>
                                    {STATUS_LABELS[child.status].label}
                                  </span>
                                </div>
                                <span className={`text-xs ${DIFFICULTY_LABELS[child.difficulty].color}`}>
                                  {DIFFICULTY_LABELS[child.difficulty].label}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="bg-bg-secondary rounded-lg p-8 text-center text-text-muted">
                      Select a treasure hunt to view details
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Community Tab */}
        {activeTab === "community" && (
          <div>
            <div className="flex gap-2 mb-6">
              <select
                value={communityServer}
                onChange={(e) => setCommunityServer(e.target.value)}
                className="px-3 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
              >
                <option value="">All Servers</option>
                {WURM_SERVERS.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>

            {sharedTreasures.length === 0 ? (
              <div className="text-center py-12 bg-bg-secondary rounded-lg">
                <p className="text-text-secondary mb-4">No shared treasure locations yet.</p>
                {user && (
                  <button onClick={openShareModal} className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
                    Share a Location
                  </button>
                )}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sharedTreasures.map((treasure) => (
                  <div key={treasure.id} className="bg-bg-secondary rounded-lg p-4 border border-border">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <span className="text-2xl mr-2">{TREASURE_TYPES[treasure.treasure_type].icon}</span>
                        <h3 className="font-semibold inline">{treasure.name}</h3>
                      </div>
                      {treasure.is_verified && (
                        <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">Verified</span>
                      )}
                    </div>
                    <p className="text-text-secondary text-sm mb-2">{treasure.server}</p>
                    <p className="text-text-muted text-sm mb-3">
                      Coordinates: {treasure.x}, {treasure.y}
                    </p>
                    {treasure.description && (
                      <p className="text-sm text-text-secondary mb-3 line-clamp-2">{treasure.description}</p>
                    )}
                    <div className="flex items-center justify-between">
                      <div className="flex gap-2">
                        {user && (
                          <>
                            <button
                              onClick={() => handleVote(treasure.id, "up")}
                              className={`px-2 py-1 rounded text-sm ${
                                treasure.user_vote === "up" ? "bg-success/20 text-success" : "bg-bg-tertiary"
                              }`}
                            >
                              ↑ {treasure.upvotes}
                            </button>
                            <button
                              onClick={() => handleVote(treasure.id, "down")}
                              className={`px-2 py-1 rounded text-sm ${
                                treasure.user_vote === "down" ? "bg-danger/20 text-danger" : "bg-bg-tertiary"
                              }`}
                            >
                              ↓ {treasure.downvotes}
                            </button>
                          </>
                        )}
                      </div>
                      <span className="text-xs text-text-muted">by {treasure.username}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Stats Tab */}
        {activeTab === "stats" && user && stats && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg-secondary rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-accent">{stats.total_hunts}</div>
              <div className="text-text-muted">Total Hunts</div>
            </div>
            <div className="bg-bg-secondary rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-success">{stats.completed_hunts}</div>
              <div className="text-text-muted">Completed</div>
            </div>
            <div className="bg-bg-secondary rounded-lg p-6 text-center">
              <div className="text-3xl font-bold text-warning">{stats.in_progress_hunts}</div>
              <div className="text-text-muted">In Progress</div>
            </div>
            <div className="bg-bg-secondary rounded-lg p-6 text-center">
              <div className="text-3xl font-bold">{stats.total_loot_items}</div>
              <div className="text-text-muted">Items Found</div>
            </div>

            <div className="col-span-2 bg-bg-secondary rounded-lg p-6">
              <h3 className="font-semibold mb-4">By Difficulty</h3>
              <div className="space-y-2">
                {Object.entries(stats.by_difficulty).map(([diff, count]) => (
                  <div key={diff} className="flex items-center justify-between">
                    <span className={`px-2 py-0.5 rounded text-sm ${DIFFICULTY_LABELS[diff as TreasureDifficulty].color}`}>
                      {DIFFICULTY_LABELS[diff as TreasureDifficulty].label}
                    </span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="col-span-2 bg-bg-secondary rounded-lg p-6">
              <h3 className="font-semibold mb-4">By Server</h3>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(stats.by_server).map(([server, count]) => (
                  <div key={server} className="flex items-center justify-between">
                    <span>{server}</span>
                    <span className="font-semibold">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-bg-secondary rounded-lg w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="p-4 border-b border-border flex items-center justify-between">
                <h2 className="text-xl font-bold">
                  {modalMode === "create" && (formData.parent_hunt_id ? "Add Map from Chest" : "New Treasure Hunt")}
                  {modalMode === "edit" && "Edit Hunt"}
                  {modalMode === "loot" && "Add Loot"}
                  {modalMode === "share" && "Share Location"}
                </h2>
                <button onClick={() => setShowModal(false)} className="text-text-secondary hover:text-text-primary">
                  ×
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-4 space-y-4">
                {(modalMode === "create" || modalMode === "edit") && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Server *</label>
                      <select
                        value={formData.server}
                        onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                      >
                        {WURM_SERVERS.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Difficulty</label>
                        <select
                          value={formData.difficulty}
                          onChange={(e) => setFormData({ ...formData, difficulty: e.target.value as TreasureDifficulty })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        >
                          <option value="easy">Easy (15 tiles)</option>
                          <option value="challenging">Challenging (10 tiles)</option>
                          <option value="difficult">Difficult (5 tiles)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Map QL</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={formData.map_quality}
                          onChange={(e) => setFormData({ ...formData, map_quality: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        />
                      </div>
                    </div>
                    {modalMode === "edit" && (
                      <>
                        <div>
                          <label className="block text-sm font-medium mb-1">Status</label>
                          <select
                            value={formData.status}
                            onChange={(e) => setFormData({ ...formData, status: e.target.value as TreasureHuntStatus })}
                            className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                          >
                            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
                              <option key={key} value={key}>{label}</option>
                            ))}
                          </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium mb-1">X Coordinate</label>
                            <input
                              type="number"
                              value={formData.x}
                              onChange={(e) => setFormData({ ...formData, x: e.target.value })}
                              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium mb-1">Y Coordinate</label>
                            <input
                              type="number"
                              value={formData.y}
                              onChange={(e) => setFormData({ ...formData, y: e.target.value })}
                              className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                            />
                          </div>
                        </div>
                      </>
                    )}
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none resize-none"
                        rows={3}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Screenshot URL</label>
                      <input
                        type="url"
                        value={formData.screenshot_url}
                        onChange={(e) => setFormData({ ...formData, screenshot_url: e.target.value })}
                        placeholder="https://imgur.com/..."
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                      />
                      <p className="text-xs text-text-muted mt-1">Link to screenshot of your treasure map</p>
                    </div>
                    {formData.parent_hunt_id && (
                      <div className="p-3 bg-warning/10 border border-warning/30 rounded-lg">
                        <p className="text-warning text-sm">
                          This map will be linked as found in the chest from the parent hunt.
                        </p>
                      </div>
                    )}
                  </>
                )}

                {modalMode === "loot" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Item Name *</label>
                      <input
                        type="text"
                        value={lootData.item_name}
                        onChange={(e) => setLootData({ ...lootData, item_name: e.target.value })}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Quantity</label>
                        <input
                          type="number"
                          min="1"
                          value={lootData.quantity}
                          onChange={(e) => setLootData({ ...lootData, quantity: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Quality</label>
                        <input
                          type="number"
                          min="1"
                          max="100"
                          value={lootData.quality}
                          onChange={(e) => setLootData({ ...lootData, quality: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Rarity</label>
                        <select
                          value={lootData.rarity}
                          onChange={(e) => setLootData({ ...lootData, rarity: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        >
                          <option value="">Normal</option>
                          <option value="rare">Rare</option>
                          <option value="supreme">Supreme</option>
                          <option value="fantastic">Fantastic</option>
                        </select>
                      </div>
                    </div>
                  </>
                )}

                {modalMode === "share" && (
                  <>
                    <div>
                      <label className="block text-sm font-medium mb-1">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        required
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">Server *</label>
                        <select
                          value={formData.server}
                          onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        >
                          {WURM_SERVERS.map((s) => (
                            <option key={s} value={s}>{s}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Type *</label>
                        <select
                          value={formData.treasure_type}
                          onChange={(e) => setFormData({ ...formData, treasure_type: e.target.value as SharedTreasureType })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                        >
                          {Object.entries(TREASURE_TYPES).map(([key, { label, icon }]) => (
                            <option key={key} value={key}>{icon} {label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium mb-1">X Coordinate *</label>
                        <input
                          type="number"
                          value={formData.x}
                          onChange={(e) => setFormData({ ...formData, x: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium mb-1">Y Coordinate *</label>
                        <input
                          type="number"
                          value={formData.y}
                          onChange={(e) => setFormData({ ...formData, y: e.target.value })}
                          className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none"
                          required
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-1">Description</label>
                      <textarea
                        value={formData.description}
                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                        className="w-full px-3 py-2 bg-bg-tertiary border border-border rounded focus:border-accent focus:outline-none resize-none"
                        rows={3}
                        placeholder="Any helpful tips for finding this location..."
                      />
                    </div>
                  </>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="flex-1 px-4 py-2 bg-bg-tertiary hover:bg-bg-hover rounded"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover rounded disabled:opacity-50"
                  >
                    {saving ? "Saving..." : "Save"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
