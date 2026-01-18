"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import type { ArchaeologyPinpoint, ArchaeologySiteType } from "@/lib/types";

// Site types for dropdown
const SITE_TYPES: { value: ArchaeologySiteType; label: string; icon: string }[] = [
  { value: "old_deed", label: "Old Deed", icon: "M2.25 12l8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" },
  { value: "ruins", label: "Ruins", icon: "M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" },
  { value: "settlement", label: "Settlement", icon: "M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" },
  { value: "tower", label: "Tower", icon: "M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" },
  { value: "guard_tower", label: "Guard Tower", icon: "M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" },
  { value: "mine", label: "Mine", icon: "M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" },
  { value: "bridge", label: "Bridge", icon: "M13.5 21v-7.5a.75.75 0 01.75-.75h3a.75.75 0 01.75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349m-16.5 11.65V9.35m0 0a3.001 3.001 0 003.75-.615A2.993 2.993 0 009.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 002.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 003.75.614m-16.5 0a3.004 3.004 0 01-.621-4.72L4.318 3.44A1.5 1.5 0 015.378 3h13.243a1.5 1.5 0 011.06.44l1.19 1.189a3 3 0 01-.621 4.72m-13.5 8.65h3.75a.75.75 0 00.75-.75V13.5a.75.75 0 00-.75-.75H6.75a.75.75 0 00-.75.75v3.75c0 .415.336.75.75.75z" },
  { value: "road", label: "Road/Highway", icon: "M9 6.75V15m6-6v8.25m.503 3.498l4.875-2.437c.381-.19.622-.58.622-1.006V4.82c0-.836-.88-1.38-1.628-1.006l-3.869 1.934c-.317.159-.69.159-1.006 0L9.503 3.252a1.125 1.125 0 00-1.006 0L3.622 5.689C3.24 5.88 3 6.27 3 6.695V19.18c0 .836.88 1.38 1.628 1.006l3.869-1.934c.317-.159.69-.159 1.006 0l4.994 2.497c.317.158.69.158 1.006 0z" },
  { value: "other", label: "Other", icon: "M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" },
  { value: "unknown", label: "Unknown", icon: "M15 10.5a3 3 0 11-6 0 3 3 0 016 0z M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" },
];

// Available servers
const SERVERS = [
  "harmony", "melody", "cadence", "defiance", "elevation",
  "independence", "deliverance", "exodus", "celebration",
  "pristine", "release", "xanadu"
];

export default function ArchaeologyPage() {
  const { user } = useAuth();
  const [pinpoints, setPinpoints] = useState<ArchaeologyPinpoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // View state
  const [viewMode, setViewMode] = useState<"list" | "my">( "list");
  const [selectedPinpoint, setSelectedPinpoint] = useState<ArchaeologyPinpoint | null>(null);

  // Filters
  const [filterServer, setFilterServer] = useState<string>("");
  const [filterSiteType, setFilterSiteType] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Form state
  const [showForm, setShowForm] = useState(false);
  const [editingPinpoint, setEditingPinpoint] = useState<ArchaeologyPinpoint | null>(null);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    server: "harmony",
    x: 0,
    y: 0,
    site_type: "unknown" as ArchaeologySiteType,
    deed_name: "",
    former_owner: "",
    estimated_age: "",
    findings: "",
    notable_items: "",
    is_public: false,
  });
  const [formError, setFormError] = useState<string>("");
  const [formLoading, setFormLoading] = useState(false);

  // Fetch pinpoints
  const fetchPinpoints = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();

      if (viewMode === "my" && user) {
        params.set("my_pinpoints", "true");
      }
      if (filterServer) params.set("server", filterServer);
      if (filterSiteType) params.set("site_type", filterSiteType);
      if (searchQuery) params.set("search", searchQuery);

      const res = await fetch(`/api/archaeology?${params}`);
      const data = await res.json();

      if (res.ok) {
        setPinpoints(Array.isArray(data) ? data : []);
      } else {
        setError(data.error || "Failed to fetch pinpoints");
      }
    } catch (err) {
      setError("Failed to fetch pinpoints");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPinpoints();
  }, [viewMode, filterServer, filterSiteType, user]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchPinpoints();
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) {
      setFormError("You must be logged in to create pinpoints");
      return;
    }

    setFormLoading(true);
    setFormError("");

    try {
      const action = editingPinpoint ? "update" : "create";
      const body: Record<string, unknown> = {
        action,
        ...formData,
      };

      if (editingPinpoint) {
        body.pinpoint_id = editingPinpoint.id;
      }

      const res = await fetch("/api/archaeology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (res.ok && data.success) {
        setShowForm(false);
        setEditingPinpoint(null);
        resetForm();
        fetchPinpoints();
      } else {
        setFormError(data.error || "Failed to save pinpoint");
      }
    } catch (err) {
      setFormError("Failed to save pinpoint");
    } finally {
      setFormLoading(false);
    }
  };

  // Handle delete
  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this pinpoint?")) return;

    try {
      const res = await fetch("/api/archaeology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", pinpoint_id: id }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        fetchPinpoints();
        if (selectedPinpoint?.id === id) {
          setSelectedPinpoint(null);
        }
      }
    } catch (err) {
      console.error("Failed to delete pinpoint:", err);
    }
  };

  // Handle vote
  const handleVote = async (id: number, voteType: "up" | "down") => {
    if (!user) return;

    try {
      const res = await fetch("/api/archaeology", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "vote", pinpoint_id: id, vote_type: voteType }),
      });

      if (res.ok) {
        fetchPinpoints();
        if (selectedPinpoint?.id === id) {
          const updated = await fetch(`/api/archaeology?id=${id}`);
          const data = await updated.json();
          setSelectedPinpoint(data);
        }
      }
    } catch (err) {
      console.error("Failed to vote:", err);
    }
  };

  // Handle edit
  const handleEdit = (pinpoint: ArchaeologyPinpoint) => {
    setEditingPinpoint(pinpoint);
    setFormData({
      name: pinpoint.name,
      description: pinpoint.description || "",
      server: pinpoint.server,
      x: pinpoint.x,
      y: pinpoint.y,
      site_type: pinpoint.site_type,
      deed_name: pinpoint.deed_name || "",
      former_owner: pinpoint.former_owner || "",
      estimated_age: pinpoint.estimated_age || "",
      findings: pinpoint.findings || "",
      notable_items: pinpoint.notable_items || "",
      is_public: pinpoint.is_public,
    });
    setShowForm(true);
  };

  // Reset form
  const resetForm = () => {
    setFormData({
      name: "",
      description: "",
      server: "harmony",
      x: 0,
      y: 0,
      site_type: "unknown",
      deed_name: "",
      former_owner: "",
      estimated_age: "",
      findings: "",
      notable_items: "",
      is_public: false,
    });
    setFormError("");
  };

  // Get site type info
  const getSiteType = (type: ArchaeologySiteType) => {
    return SITE_TYPES.find(t => t.value === type) || SITE_TYPES[SITE_TYPES.length - 1];
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-950/20 to-stone-950 py-8 px-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-amber-100 mb-2">
            Archaeology Pinpoints
          </h1>
          <p className="text-stone-400">
            Discover and share locations of old deeds, ruins, and archaeological sites across Wurm Online.
            Mark your private finds or share them with the community.
          </p>
        </div>

        {/* Stats & Actions Bar */}
        <div className="flex flex-wrap gap-4 mb-6">
          {/* View Mode Tabs */}
          <div className="flex bg-stone-800/50 rounded-lg p-1">
            <button
              onClick={() => setViewMode("list")}
              className={`px-4 py-2 rounded-md transition-colors ${
                viewMode === "list"
                  ? "bg-amber-600 text-white"
                  : "text-stone-400 hover:text-stone-200"
              }`}
            >
              All Pinpoints
            </button>
            {user && (
              <button
                onClick={() => setViewMode("my")}
                className={`px-4 py-2 rounded-md transition-colors ${
                  viewMode === "my"
                    ? "bg-amber-600 text-white"
                    : "text-stone-400 hover:text-stone-200"
                }`}
              >
                My Pinpoints
              </button>
            )}
          </div>

          {/* Add Button */}
          {user && (
            <button
              onClick={() => {
                resetForm();
                setEditingPinpoint(null);
                setShowForm(true);
              }}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg flex items-center gap-2 transition-colors"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add Pinpoint
            </button>
          )}

          {/* Filters */}
          <div className="flex-1 flex flex-wrap gap-3">
            <input
              type="text"
              placeholder="Search pinpoints..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="px-3 py-2 bg-stone-800/70 border border-stone-700 rounded-lg text-stone-200 placeholder-stone-500 focus:border-amber-500 focus:outline-none min-w-[200px]"
            />
            <select
              value={filterServer}
              onChange={(e) => setFilterServer(e.target.value)}
              className="px-3 py-2 bg-stone-800/70 border border-stone-700 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Servers</option>
              {SERVERS.map(s => (
                <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
              ))}
            </select>
            <select
              value={filterSiteType}
              onChange={(e) => setFilterSiteType(e.target.value)}
              className="px-3 py-2 bg-stone-800/70 border border-stone-700 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
            >
              <option value="">All Types</option>
              {SITE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Pinpoints List */}
          <div className="lg:col-span-2">
            {loading ? (
              <div className="bg-stone-800/50 rounded-lg p-8 text-center">
                <div className="animate-spin h-8 w-8 border-2 border-amber-500 border-t-transparent rounded-full mx-auto mb-4"></div>
                <p className="text-stone-400">Loading pinpoints...</p>
              </div>
            ) : error ? (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-200">
                {error}
              </div>
            ) : pinpoints.length === 0 ? (
              <div className="bg-stone-800/50 rounded-lg p-8 text-center">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                <p className="text-stone-400 mb-4">
                  {viewMode === "my" ? "You haven't created any pinpoints yet." : "No pinpoints found."}
                </p>
                {user && (
                  <button
                    onClick={() => {
                      resetForm();
                      setEditingPinpoint(null);
                      setShowForm(true);
                    }}
                    className="px-4 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg transition-colors"
                  >
                    Create Your First Pinpoint
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {pinpoints.map((pinpoint) => {
                  const siteType = getSiteType(pinpoint.site_type);
                  const isOwner = user?.id === pinpoint.user_id;

                  return (
                    <div
                      key={pinpoint.id}
                      onClick={() => setSelectedPinpoint(pinpoint)}
                      className={`bg-stone-800/50 rounded-lg p-4 cursor-pointer border transition-all hover:bg-stone-800/70 ${
                        selectedPinpoint?.id === pinpoint.id
                          ? "border-amber-500"
                          : "border-stone-700"
                      }`}
                    >
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="p-3 bg-amber-900/30 rounded-lg text-amber-400">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d={siteType.icon} />
                          </svg>
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-medium text-amber-100 truncate">{pinpoint.name}</h3>
                              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-stone-400">
                                <span className="capitalize">{pinpoint.server}</span>
                                <span>|</span>
                                <span>({pinpoint.x}, {pinpoint.y})</span>
                                <span>|</span>
                                <span>{siteType.label}</span>
                              </div>
                            </div>

                            {/* Status badges */}
                            <div className="flex items-center gap-2">
                              {!pinpoint.is_public && (
                                <span className="px-2 py-1 text-xs bg-stone-700 text-stone-300 rounded">
                                  Private
                                </span>
                              )}
                              {pinpoint.is_verified && (
                                <span className="px-2 py-1 text-xs bg-green-900/50 text-green-400 rounded flex items-center gap-1">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                  </svg>
                                  Verified
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Deed name if available */}
                          {pinpoint.deed_name && (
                            <p className="text-sm text-amber-200/70 mt-1">
                              Former deed: {pinpoint.deed_name}
                            </p>
                          )}

                          {/* Description preview */}
                          {pinpoint.description && (
                            <p className="text-sm text-stone-400 mt-2 line-clamp-2">
                              {pinpoint.description}
                            </p>
                          )}

                          {/* Footer */}
                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-4 text-sm">
                              {/* Voting for public pinpoints */}
                              {pinpoint.is_public && (
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVote(pinpoint.id, "up");
                                    }}
                                    disabled={!user || isOwner}
                                    className={`p-1 rounded transition-colors ${
                                      pinpoint.user_vote === "up"
                                        ? "text-green-400"
                                        : "text-stone-500 hover:text-green-400"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M3.293 9.707a1 1 0 010-1.414l6-6a1 1 0 011.414 0l6 6a1 1 0 01-1.414 1.414L11 5.414V17a1 1 0 11-2 0V5.414L4.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                  <span className="text-stone-300">{pinpoint.upvotes - pinpoint.downvotes}</span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleVote(pinpoint.id, "down");
                                    }}
                                    disabled={!user || isOwner}
                                    className={`p-1 rounded transition-colors ${
                                      pinpoint.user_vote === "down"
                                        ? "text-red-400"
                                        : "text-stone-500 hover:text-red-400"
                                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                                  >
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                      <path fillRule="evenodd" d="M16.707 10.293a1 1 0 010 1.414l-6 6a1 1 0 01-1.414 0l-6-6a1 1 0 111.414-1.414L9 14.586V3a1 1 0 012 0v11.586l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                  </button>
                                </div>
                              )}

                              <span className="text-stone-500">
                                by {pinpoint.username || "Unknown"}
                              </span>
                            </div>

                            {/* Owner actions */}
                            {isOwner && (
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleEdit(pinpoint);
                                  }}
                                  className="p-1 text-stone-400 hover:text-amber-400 transition-colors"
                                  title="Edit"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path d="M17.414 2.586a2 2 0 00-2.828 0L7 10.172V13h2.828l7.586-7.586a2 2 0 000-2.828z" />
                                    <path fillRule="evenodd" d="M2 6a2 2 0 012-2h4a1 1 0 010 2H4v10h10v-4a1 1 0 112 0v4a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" clipRule="evenodd" />
                                  </svg>
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDelete(pinpoint.id);
                                  }}
                                  className="p-1 text-stone-400 hover:text-red-400 transition-colors"
                                  title="Delete"
                                >
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" />
                                  </svg>
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Detail Panel */}
          <div className="lg:col-span-1">
            {selectedPinpoint ? (
              <div className="bg-stone-800/50 rounded-lg p-6 border border-stone-700 sticky top-4">
                <div className="flex items-start justify-between mb-4">
                  <h2 className="text-xl font-bold text-amber-100">{selectedPinpoint.name}</h2>
                  <button
                    onClick={() => setSelectedPinpoint(null)}
                    className="p-1 text-stone-400 hover:text-stone-200"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Location */}
                  <div>
                    <h4 className="text-sm font-medium text-stone-400 mb-1">Location</h4>
                    <p className="text-stone-200">
                      {selectedPinpoint.server.charAt(0).toUpperCase() + selectedPinpoint.server.slice(1)} ({selectedPinpoint.x}, {selectedPinpoint.y})
                    </p>
                  </div>

                  {/* Type */}
                  <div>
                    <h4 className="text-sm font-medium text-stone-400 mb-1">Site Type</h4>
                    <p className="text-stone-200">{getSiteType(selectedPinpoint.site_type).label}</p>
                  </div>

                  {/* Deed name */}
                  {selectedPinpoint.deed_name && (
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-1">Former Deed Name</h4>
                      <p className="text-amber-200">{selectedPinpoint.deed_name}</p>
                    </div>
                  )}

                  {/* Former owner */}
                  {selectedPinpoint.former_owner && (
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-1">Former Owner</h4>
                      <p className="text-stone-200">{selectedPinpoint.former_owner}</p>
                    </div>
                  )}

                  {/* Estimated age */}
                  {selectedPinpoint.estimated_age && (
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-1">Active Period</h4>
                      <p className="text-stone-200">{selectedPinpoint.estimated_age}</p>
                    </div>
                  )}

                  {/* Description */}
                  {selectedPinpoint.description && (
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-1">Description</h4>
                      <p className="text-stone-300 whitespace-pre-wrap">{selectedPinpoint.description}</p>
                    </div>
                  )}

                  {/* Findings */}
                  {selectedPinpoint.findings && (
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-1">Findings</h4>
                      <p className="text-stone-300 whitespace-pre-wrap">{selectedPinpoint.findings}</p>
                    </div>
                  )}

                  {/* Notable items */}
                  {selectedPinpoint.notable_items && (
                    <div>
                      <h4 className="text-sm font-medium text-stone-400 mb-1">Notable Items</h4>
                      <p className="text-amber-200 whitespace-pre-wrap">{selectedPinpoint.notable_items}</p>
                    </div>
                  )}

                  {/* Metadata */}
                  <div className="pt-4 border-t border-stone-700">
                    <p className="text-sm text-stone-500">
                      Added by {selectedPinpoint.username || "Unknown"} on{" "}
                      {new Date(selectedPinpoint.created_at).toLocaleDateString()}
                    </p>
                    {selectedPinpoint.is_verified && (
                      <p className="text-sm text-green-400 mt-1">
                        Verified {selectedPinpoint.verified_at && `on ${new Date(selectedPinpoint.verified_at).toLocaleDateString()}`}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-stone-800/30 rounded-lg p-8 text-center border border-stone-700/50">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-4 text-stone-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />
                </svg>
                <p className="text-stone-400">Select a pinpoint to view details</p>
              </div>
            )}
          </div>
        </div>

        {/* Create/Edit Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
            <div className="bg-stone-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold text-amber-100">
                    {editingPinpoint ? "Edit Pinpoint" : "Add New Pinpoint"}
                  </h2>
                  <button
                    onClick={() => {
                      setShowForm(false);
                      setEditingPinpoint(null);
                      resetForm();
                    }}
                    className="p-2 text-stone-400 hover:text-stone-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>

                {formError && (
                  <div className="mb-4 p-3 bg-red-900/30 border border-red-700 rounded-lg text-red-200 text-sm">
                    {formError}
                  </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Name <span className="text-red-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                      placeholder="e.g., Ancient Deed Ruins"
                    />
                  </div>

                  {/* Server & Coordinates */}
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Server <span className="text-red-400">*</span>
                      </label>
                      <select
                        required
                        value={formData.server}
                        onChange={(e) => setFormData({ ...formData, server: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                      >
                        {SERVERS.map(s => (
                          <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        X Coordinate <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.x}
                        onChange={(e) => setFormData({ ...formData, x: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Y Coordinate <span className="text-red-400">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        value={formData.y}
                        onChange={(e) => setFormData({ ...formData, y: parseInt(e.target.value) || 0 })}
                        className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Site Type */}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">Site Type</label>
                    <select
                      value={formData.site_type}
                      onChange={(e) => setFormData({ ...formData, site_type: e.target.value as ArchaeologySiteType })}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                    >
                      {SITE_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Deed Name & Former Owner */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Former Deed Name
                      </label>
                      <input
                        type="text"
                        value={formData.deed_name}
                        onChange={(e) => setFormData({ ...formData, deed_name: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                        placeholder="If known..."
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-300 mb-1">
                        Former Owner
                      </label>
                      <input
                        type="text"
                        value={formData.former_owner}
                        onChange={(e) => setFormData({ ...formData, former_owner: e.target.value })}
                        className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                        placeholder="If known..."
                      />
                    </div>
                  </div>

                  {/* Estimated Age */}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">
                      Active Period
                    </label>
                    <input
                      type="text"
                      value={formData.estimated_age}
                      onChange={(e) => setFormData({ ...formData, estimated_age: e.target.value })}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none"
                      placeholder="e.g., 2015-2018, Early Wurm, etc."
                    />
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      rows={3}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none resize-none"
                      placeholder="Describe the location..."
                    />
                  </div>

                  {/* Findings */}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">Findings</label>
                    <textarea
                      value={formData.findings}
                      onChange={(e) => setFormData({ ...formData, findings: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none resize-none"
                      placeholder="What archaeology fragments or items were found here?"
                    />
                  </div>

                  {/* Notable Items */}
                  <div>
                    <label className="block text-sm font-medium text-stone-300 mb-1">Notable Items</label>
                    <textarea
                      value={formData.notable_items}
                      onChange={(e) => setFormData({ ...formData, notable_items: e.target.value })}
                      rows={2}
                      className="w-full px-3 py-2 bg-stone-700/50 border border-stone-600 rounded-lg text-stone-200 focus:border-amber-500 focus:outline-none resize-none"
                      placeholder="Any particularly interesting or rare finds?"
                    />
                  </div>

                  {/* Public Toggle */}
                  <div className="flex items-center gap-3 p-4 bg-stone-700/30 rounded-lg">
                    <input
                      type="checkbox"
                      id="is_public"
                      checked={formData.is_public}
                      onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                      className="w-5 h-5 bg-stone-600 border-stone-500 rounded text-amber-500 focus:ring-amber-500"
                    />
                    <label htmlFor="is_public" className="flex-1">
                      <span className="text-stone-200 font-medium">Make this pinpoint public</span>
                      <p className="text-sm text-stone-400">
                        Public pinpoints are visible to all users and can receive votes
                      </p>
                    </label>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-700">
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false);
                        setEditingPinpoint(null);
                        resetForm();
                      }}
                      className="px-4 py-2 text-stone-400 hover:text-stone-200 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={formLoading}
                      className="px-6 py-2 bg-amber-600 hover:bg-amber-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {formLoading ? (
                        <span className="flex items-center gap-2">
                          <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                          Saving...
                        </span>
                      ) : (
                        editingPinpoint ? "Update Pinpoint" : "Create Pinpoint"
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
