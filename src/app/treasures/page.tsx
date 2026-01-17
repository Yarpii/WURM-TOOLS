"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { WURM_SERVERS } from "@/lib/constants";
import type {
  TreasureHunt,
  TreasureLoot,
  SharedTreasure,
  TreasureStats,
  TreasureHuntShare,
} from "@/lib/types";
import {
  TabType,
  ModalMode,
  MyHuntsTab,
  SharedWithMeTab,
  CommunityTab,
  StatsTab,
  LoginPrompt,
  HuntDetails,
  TreasureModal,
  HuntFormData,
  LootFormData,
} from "@/components/treasures";

export default function TreasuresPage() {
  const { user, loading: authLoading } = useAuth();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState<TabType>("my-hunts");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [urlParamsProcessed, setUrlParamsProcessed] = useState(false);

  // My Hunts state
  const [hunts, setHunts] = useState<TreasureHunt[]>([]);
  const [selectedHunt, setSelectedHunt] = useState<TreasureHunt | null>(null);
  const [huntLoot, setHuntLoot] = useState<TreasureLoot[]>([]);
  const [filterStatus, setFilterStatus] = useState<string>("");
  const [filterServer, setFilterServer] = useState<string>("");
  const [childHunts, setChildHunts] = useState<TreasureHunt[]>([]);
  const [huntShares, setHuntShares] = useState<TreasureHuntShare[]>([]);

  // Community state
  const [sharedTreasures, setSharedTreasures] = useState<SharedTreasure[]>([]);
  const [communityServer, setCommunityServer] = useState<string>("");

  // Stats state
  const [stats, setStats] = useState<TreasureStats | null>(null);

  // Shared with me state
  const [sharedWithMe, setSharedWithMe] = useState<(TreasureHunt & { shared_by_username: string })[]>([]);

  // Modal state
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<ModalMode>("create");
  const [formData, setFormData] = useState<HuntFormData>({
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
  const [lootData, setLootData] = useState<LootFormData>({
    item_name: "",
    quantity: "1",
    quality: "",
    rarity: "",
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  // Share with friend state
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [userSearchResults, setUserSearchResults] = useState<{ id: number; username: string; display_name?: string }[]>([]);
  const [selectedShareUser, setSelectedShareUser] = useState<{ id: number; username: string } | null>(null);
  const [shareMessage, setShareMessage] = useState("");

  // Screenshot upload state
  const [screenshotMode, setScreenshotMode] = useState<"upload" | "url">("upload");
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);

  // ============================================
  // DATA FETCHING
  // ============================================

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

  const fetchSharedWithMe = useCallback(async () => {
    try {
      const res = await fetch("/api/treasures?action=shared-with-me");
      const data = await res.json();
      if (res.ok) {
        setSharedWithMe(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to fetch shared with me:", err);
    }
  }, []);

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

  const searchUsers = async (query: string) => {
    if (query.length < 2) {
      setUserSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/treasures?action=search-users&q=${encodeURIComponent(query)}`);
      const data = await res.json();
      if (res.ok) {
        setUserSearchResults(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Failed to search users:", err);
    }
  };

  // ============================================
  // EFFECTS
  // ============================================

  useEffect(() => {
    if (user && activeTab === "my-hunts") {
      fetchHunts();
    } else if (user && activeTab === "shared-with-me") {
      fetchSharedWithMe();
    } else if (activeTab === "community") {
      fetchShared();
    } else if (user && activeTab === "stats") {
      fetchStats();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [user, authLoading, activeTab, fetchHunts, fetchShared, fetchStats, fetchSharedWithMe]);

  // Check for URL parameters (from map page right-click)
  useEffect(() => {
    if (urlParamsProcessed || authLoading) return;

    const xParam = searchParams.get("x");
    const yParam = searchParams.get("y");
    const serverParam = searchParams.get("server");
    const screenshotParam = searchParams.get("screenshot");

    if (xParam && yParam) {
      if (!user) return;

      setUrlParamsProcessed(true);

      const serverValue = serverParam
        ? WURM_SERVERS.find(s => s.toLowerCase() === serverParam.toLowerCase()) || "Harmony"
        : "Harmony";

      setFormData({
        name: "",
        description: `Location: ${xParam}, ${yParam}`,
        server: serverValue,
        map_quality: "",
        difficulty: "easy",
        x: xParam,
        y: yParam,
        status: "searching",
        treasure_type: "treasure_chest",
        parent_hunt_id: "",
        screenshot_url: screenshotParam || "",
      });

      if (screenshotParam) {
        setUploadPreview(screenshotParam);
        setScreenshotMode("upload");
      } else {
        setUploadPreview(null);
        setScreenshotMode("upload");
      }

      setModalMode("create");
      setShowModal(true);

      const screenshotMsg = screenshotParam ? " Screenshot captured automatically." : "";
      setSuccess(`Coordinates ${xParam}, ${yParam} loaded from map.${screenshotMsg} Fill in the details to create your treasure hunt.`);

      if (typeof window !== "undefined") {
        window.history.replaceState({}, "", "/treasures");
      }
    }
  }, [searchParams, user, authLoading, urlParamsProcessed]);

  // ============================================
  // HUNT SELECTION
  // ============================================

  const selectHunt = async (hunt: TreasureHunt) => {
    setSelectedHunt(hunt);
    await fetchHuntLoot(hunt.id);

    // Fetch child hunts
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

    // Fetch shares (only for own hunts)
    if (hunt.user_id === user?.id) {
      try {
        const res = await fetch(`/api/treasures?id=${hunt.id}&action=shares`);
        const data = await res.json();
        if (res.ok) {
          setHuntShares(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error("Failed to fetch shares:", err);
        setHuntShares([]);
      }
    } else {
      setHuntShares([]);
    }
  };

  // ============================================
  // MODAL HANDLERS
  // ============================================

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
    setUploadPreview(null);
    setScreenshotMode("upload");
    setModalMode("create");
    setShowModal(true);
  };

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
    setUploadPreview(hunt.screenshot_url || null);
    setScreenshotMode(hunt.screenshot_url ? "url" : "upload");
    setSelectedHunt(hunt);
    setModalMode("edit");
    setShowModal(true);
  };

  const openLootModal = () => {
    setLootData({ item_name: "", quantity: "1", quality: "", rarity: "", notes: "" });
    setModalMode("loot");
    setShowModal(true);
  };

  const openShareModal = (fromHunt?: TreasureHunt) => {
    if (fromHunt) {
      setFormData({
        name: fromHunt.name,
        description: fromHunt.description || "",
        server: fromHunt.server,
        map_quality: fromHunt.map_quality?.toString() || "",
        difficulty: fromHunt.difficulty,
        x: fromHunt.x?.toString() || "",
        y: fromHunt.y?.toString() || "",
        status: fromHunt.status,
        treasure_type: "treasure_chest",
        parent_hunt_id: "",
        screenshot_url: "",
      });
    } else {
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
    }
    setModalMode("share");
    setShowModal(true);
  };

  const openShareOptionsModal = () => {
    setModalMode("share-options");
    setShowModal(true);
  };

  const openShareFriendModal = () => {
    setUserSearchQuery("");
    setUserSearchResults([]);
    setSelectedShareUser(null);
    setShareMessage("");
    setModalMode("share-friend");
    setShowModal(true);
  };

  // ============================================
  // SCREENSHOT UPLOAD
  // ============================================

  const handleScreenshotUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!["image/jpeg", "image/png", "image/gif", "image/webp"].includes(file.type)) {
      setError("Invalid file type. Please use JPEG, PNG, GIF, or WebP");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError("File too large. Maximum size is 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadPreview(event.target?.result as string);
    };
    reader.readAsDataURL(file);

    setUploading(true);
    setError("");

    try {
      const formDataUpload = new FormData();
      formDataUpload.append("file", file);
      formDataUpload.append("category", "screenshots");

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formDataUpload,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Upload failed");
        setUploadPreview(null);
      } else {
        setFormData({ ...formData, screenshot_url: data.url });
        setSuccess("Screenshot uploaded!");
      }
    } catch (err) {
      setError("Upload failed: " + String(err));
      setUploadPreview(null);
    } finally {
      setUploading(false);
    }
  };

  // ============================================
  // FORM SUBMISSION
  // ============================================

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
          body: JSON.stringify({ action: "create", ...formData }),
        });
      } else if (modalMode === "edit" && selectedHunt) {
        res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "update", hunt_id: selectedHunt.id, ...formData }),
        });
      } else if (modalMode === "loot" && selectedHunt) {
        res = await fetch("/api/treasures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action: "add-loot", hunt_id: selectedHunt.id, ...lootData }),
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

  // ============================================
  // OTHER ACTIONS
  // ============================================

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

  const shareWithUser = async () => {
    if (!selectedHunt || !selectedShareUser) return;
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/treasures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "share-with-user",
          hunt_id: selectedHunt.id,
          user_id: selectedShareUser.id,
          message: shareMessage || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Share failed");
      } else {
        setSuccess(`Shared with ${selectedShareUser.username}!`);
        setShowModal(false);
        const sharesRes = await fetch(`/api/treasures?id=${selectedHunt.id}&action=shares`);
        const sharesData = await sharesRes.json();
        if (sharesRes.ok) {
          setHuntShares(Array.isArray(sharesData) ? sharesData : []);
        }
      }
    } catch (err) {
      setError("Share failed: " + String(err));
    } finally {
      setSaving(false);
    }
  };

  const removeShare = async (shareId: number) => {
    if (!selectedHunt) return;
    try {
      const res = await fetch("/api/treasures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "unshare", share_id: shareId }),
      });

      if (res.ok) {
        setHuntShares(huntShares.filter(s => s.id !== shareId));
        setSuccess("Share removed");
      }
    } catch (err) {
      console.error("Unshare failed:", err);
    }
  };

  // ============================================
  // RENDER
  // ============================================

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
            <button
              onClick={() => openCreateModal()}
              className="px-4 py-2 bg-accent rounded-lg hover:bg-accent-hover flex items-center gap-2"
            >
              <span>+</span> New Hunt
            </button>
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
          <TabButton active={activeTab === "my-hunts"} onClick={() => setActiveTab("my-hunts")}>
            My Hunts
          </TabButton>
          {user && (
            <TabButton active={activeTab === "shared-with-me"} onClick={() => setActiveTab("shared-with-me")}>
              Shared with Me
              {sharedWithMe.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 bg-warning/20 text-warning text-xs rounded">
                  {sharedWithMe.length}
                </span>
              )}
            </TabButton>
          )}
          <TabButton active={activeTab === "community"} onClick={() => setActiveTab("community")}>
            Community
          </TabButton>
          {user && (
            <TabButton active={activeTab === "stats"} onClick={() => setActiveTab("stats")}>
              Stats
            </TabButton>
          )}
        </div>

        {/* Tab Content */}
        {activeTab === "my-hunts" && (
          !user ? (
            <LoginPrompt />
          ) : (
            <MyHuntsTab
              hunts={hunts}
              selectedHunt={selectedHunt}
              loading={loading}
              filterStatus={filterStatus}
              filterServer={filterServer}
              onFilterStatusChange={setFilterStatus}
              onFilterServerChange={setFilterServer}
              onSelectHunt={selectHunt}
              onCreateHunt={() => openCreateModal()}
            >
              {selectedHunt ? (
                <HuntDetails
                  hunt={selectedHunt}
                  loot={huntLoot}
                  childHunts={childHunts}
                  shares={huntShares}
                  isOwner={selectedHunt.user_id === user?.id}
                  onEdit={() => openEditModal(selectedHunt)}
                  onDelete={() => handleDeleteHunt(selectedHunt.id)}
                  onShare={openShareOptionsModal}
                  onAddLoot={openLootModal}
                  onAddChainedMap={() => openCreateModal(selectedHunt.id)}
                  onSelectChildHunt={selectHunt}
                  onRemoveShare={removeShare}
                  onLocationSelect={(x, y) => {
                    setFormData({
                      ...formData,
                      name: selectedHunt.name,
                      description: selectedHunt.description || "",
                      server: selectedHunt.server,
                      map_quality: selectedHunt.map_quality?.toString() || "",
                      difficulty: selectedHunt.difficulty,
                      x: x.toString(),
                      y: y.toString(),
                      status: selectedHunt.status,
                      treasure_type: "treasure_chest",
                      parent_hunt_id: selectedHunt.parent_hunt_id?.toString() || "",
                      screenshot_url: selectedHunt.screenshot_url || "",
                    });
                    setModalMode("edit");
                    setShowModal(true);
                  }}
                />
              ) : (
                <div className="bg-bg-secondary rounded-lg p-8 text-center text-text-muted">
                  Select a treasure hunt to view details
                </div>
              )}
            </MyHuntsTab>
          )
        )}

        {activeTab === "shared-with-me" && (
          <SharedWithMeTab hunts={sharedWithMe} onSelectHunt={selectHunt} />
        )}

        {activeTab === "community" && (
          <CommunityTab
            treasures={sharedTreasures}
            serverFilter={communityServer}
            userId={user?.id}
            onServerFilterChange={setCommunityServer}
            onVote={handleVote}
          />
        )}

        {activeTab === "stats" && user && stats && (
          <StatsTab stats={stats} />
        )}

        {/* Modal */}
        <TreasureModal
          isOpen={showModal}
          mode={modalMode}
          formData={formData}
          lootData={lootData}
          selectedHunt={selectedHunt}
          saving={saving}
          uploading={uploading}
          uploadPreview={uploadPreview}
          screenshotMode={screenshotMode}
          userSearchQuery={userSearchQuery}
          userSearchResults={userSearchResults}
          selectedShareUser={selectedShareUser}
          shareMessage={shareMessage}
          error={error}
          onClose={() => setShowModal(false)}
          onSubmit={handleSubmit}
          onFormDataChange={setFormData}
          onLootDataChange={setLootData}
          onScreenshotUpload={handleScreenshotUpload}
          onScreenshotModeChange={setScreenshotMode}
          onUploadPreviewChange={setUploadPreview}
          onUserSearchQueryChange={setUserSearchQuery}
          onSearchUsers={searchUsers}
          onSelectShareUser={setSelectedShareUser}
          onShareMessageChange={setShareMessage}
          onShareWithUser={shareWithUser}
          onOpenShareFriend={openShareFriendModal}
          onOpenShareCommunity={() => openShareModal(selectedHunt || undefined)}
        />
      </div>
    </div>
  );
}

// Tab Button Component
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
      onClick={onClick}
      className={`px-4 py-2 rounded-t ${
        active
          ? "bg-accent text-white"
          : "bg-bg-secondary text-text-secondary hover:bg-bg-tertiary"
      }`}
    >
      {children}
    </button>
  );
}
