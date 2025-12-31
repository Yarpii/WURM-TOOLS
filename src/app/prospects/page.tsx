"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type {
  ProspectPage,
  Prospect,
  ProspectWithPage,
  ProspectStats,
  ProspectStatus,
  ProspectPriority,
} from "@/lib/types";

const STATUS_CONFIG: Record<ProspectStatus, { label: string; color: string; bg: string }> = {
  potential: { label: "Potential", color: "text-blue-400", bg: "bg-blue-500/20" },
  contacted: { label: "Contacted", color: "text-yellow-400", bg: "bg-yellow-500/20" },
  interested: { label: "Interested", color: "text-purple-400", bg: "bg-purple-500/20" },
  recruited: { label: "Recruited", color: "text-green-400", bg: "bg-green-500/20" },
  declined: { label: "Declined", color: "text-red-400", bg: "bg-red-500/20" },
  inactive: { label: "Inactive", color: "text-gray-400", bg: "bg-gray-500/20" },
};

const PRIORITY_CONFIG: Record<ProspectPriority, { label: string; color: string; icon: string }> = {
  low: { label: "Low", color: "text-gray-400", icon: "▽" },
  medium: { label: "Medium", color: "text-blue-400", icon: "◇" },
  high: { label: "High", color: "text-orange-400", icon: "△" },
  urgent: { label: "Urgent", color: "text-red-400", icon: "⚡" },
};

const PAGE_ICONS = [
  "folder", "users", "star", "target", "flag", "bookmark", "heart", "zap", "award", "briefcase"
];

const PAGE_COLORS = [
  "#3b82f6", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#22c55e", "#06b6d4", "#6366f1"
];

export default function ProspectsPage() {
  const { user, loading: authLoading } = useAuth();
  const [pages, setPages] = useState<ProspectPage[]>([]);
  const [prospects, setProspects] = useState<ProspectWithPage[]>([]);
  const [stats, setStats] = useState<ProspectStats | null>(null);
  const [activePage, setActivePage] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<ProspectStatus | "all">("all");
  const [filterPriority, setFilterPriority] = useState<ProspectPriority | "all">("all");
  const [filterQuality, setFilterQuality] = useState<number | "all">("all");

  // Modals
  const [showNewPageModal, setShowNewPageModal] = useState(false);
  const [showNewProspectModal, setShowNewProspectModal] = useState(false);
  const [showEditProspectModal, setShowEditProspectModal] = useState(false);
  const [editingProspect, setEditingProspect] = useState<Prospect | null>(null);
  const [showEditPageModal, setShowEditPageModal] = useState(false);
  const [editingPage, setEditingPage] = useState<ProspectPage | null>(null);

  // Form state
  const [newPage, setNewPage] = useState({ name: "", description: "", color: "#3b82f6", icon: "folder" });
  const [newProspect, setNewProspect] = useState({
    name: "", character_name: "", server: "", location: "", status: "potential" as ProspectStatus,
    priority: "medium" as ProspectPriority, quality_rating: 3, skills: "", notes: "", contact_info: "", source: "", tags: ""
  });

  const fetchData = useCallback(async () => {
    if (!user) return;

    try {
      const [pagesRes, prospectsRes, statsRes] = await Promise.all([
        fetch("/api/prospects/pages"),
        fetch("/api/prospects"),
        fetch("/api/prospects/stats"),
      ]);

      const pagesData = await pagesRes.json();
      const prospectsData = await prospectsRes.json();
      const statsData = await statsRes.json();

      setPages(pagesData.pages || []);
      setProspects(prospectsData.prospects || []);
      setStats(statsData.stats || null);

      if (pagesData.pages?.length > 0 && activePage === null) {
        setActivePage(pagesData.pages[0].id);
      }
    } catch (err) {
      console.error("Failed to fetch data:", err);
      setError("Failed to load prospects data");
    } finally {
      setLoading(false);
    }
  }, [user, activePage]);

  useEffect(() => {
    if (!authLoading && user) {
      fetchData();
    } else if (!authLoading && !user) {
      setLoading(false);
    }
  }, [authLoading, user, fetchData]);

  const createPage = async () => {
    if (!newPage.name.trim()) return;

    try {
      const res = await fetch("/api/prospects/pages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPage),
      });

      if (res.ok) {
        const data = await res.json();
        setShowNewPageModal(false);
        setNewPage({ name: "", description: "", color: "#3b82f6", icon: "folder" });
        fetchData();
        setActivePage(data.page_id);
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create page");
      }
    } catch {
      setError("Failed to create page");
    }
  };

  const updatePage = async () => {
    if (!editingPage) return;

    try {
      const res = await fetch(`/api/prospects/pages/${editingPage.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editingPage.name,
          description: editingPage.description,
          color: editingPage.color,
          icon: editingPage.icon,
        }),
      });

      if (res.ok) {
        setShowEditPageModal(false);
        setEditingPage(null);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update page");
      }
    } catch {
      setError("Failed to update page");
    }
  };

  const deletePage = async (pageId: number) => {
    if (!confirm("Are you sure you want to delete this page? All prospects in this page will be deleted.")) return;

    try {
      const res = await fetch(`/api/prospects/pages/${pageId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
        if (activePage === pageId) {
          setActivePage(pages.find(p => p.id !== pageId)?.id || null);
        }
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete page");
      }
    } catch {
      setError("Failed to delete page");
    }
  };

  const createProspect = async () => {
    if (!newProspect.name.trim() || !activePage) return;

    try {
      const res = await fetch("/api/prospects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...newProspect, page_id: activePage }),
      });

      if (res.ok) {
        setShowNewProspectModal(false);
        setNewProspect({
          name: "", character_name: "", server: "", location: "", status: "potential",
          priority: "medium", quality_rating: 3, skills: "", notes: "", contact_info: "", source: "", tags: ""
        });
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to create prospect");
      }
    } catch {
      setError("Failed to create prospect");
    }
  };

  const updateProspect = async () => {
    if (!editingProspect) return;

    try {
      const res = await fetch(`/api/prospects/${editingProspect.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingProspect),
      });

      if (res.ok) {
        setShowEditProspectModal(false);
        setEditingProspect(null);
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to update prospect");
      }
    } catch {
      setError("Failed to update prospect");
    }
  };

  const deleteProspect = async (prospectId: number) => {
    if (!confirm("Are you sure you want to delete this prospect?")) return;

    try {
      const res = await fetch(`/api/prospects/${prospectId}`, { method: "DELETE" });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        setError(data.error || "Failed to delete prospect");
      }
    } catch {
      setError("Failed to delete prospect");
    }
  };

  const markContact = async (prospectId: number) => {
    try {
      await fetch(`/api/prospects/${prospectId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "mark_contact" }),
      });
      fetchData();
    } catch {
      setError("Failed to mark contact");
    }
  };

  // Filter prospects
  const filteredProspects = prospects.filter((p) => {
    if (activePage && p.page_id !== activePage) return false;
    if (filterStatus !== "all" && p.status !== filterStatus) return false;
    if (filterPriority !== "all" && p.priority !== filterPriority) return false;
    if (filterQuality !== "all" && p.quality_rating !== filterQuality) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        p.name.toLowerCase().includes(q) ||
        p.character_name?.toLowerCase().includes(q) ||
        p.notes?.toLowerCase().includes(q) ||
        p.tags?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const renderStars = (rating: number, interactive = false, onChange?: (r: number) => void) => {
    return (
      <div className="flex gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={`text-lg ${interactive ? "cursor-pointer hover:scale-110" : "cursor-default"} transition-transform`}
          >
            {star <= rating ? "★" : "☆"}
          </button>
        ))}
      </div>
    );
  };

  const getIconDisplay = (icon: string) => {
    const icons: Record<string, string> = {
      folder: "📁", users: "👥", star: "⭐", target: "🎯", flag: "🚩",
      bookmark: "🔖", heart: "❤️", zap: "⚡", award: "🏆", briefcase: "💼"
    };
    return icons[icon] || "📁";
  };

  if (authLoading || loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-text-muted">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold text-text-primary mb-4">Sign In Required</h2>
          <p className="text-text-secondary mb-6">
            You need to be signed in to manage prospects.
          </p>
          <Link href="/login" className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors">
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Prospect Manager</h1>
        <p className="text-text-secondary">
          Track and manage potential recruits with custom pages and detailed information.
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-6 p-4 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400">
          {error}
          <button onClick={() => setError("")} className="float-right text-red-400 hover:text-red-300">×</button>
        </div>
      )}

      {/* Stats Dashboard */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-text-primary">{stats.total}</div>
            <div className="text-sm text-text-muted">Total Prospects</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-green-400">{stats.by_status.recruited}</div>
            <div className="text-sm text-text-muted">Recruited</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-yellow-400">{stats.by_status.contacted}</div>
            <div className="text-sm text-text-muted">Contacted</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{stats.by_status.interested}</div>
            <div className="text-sm text-text-muted">Interested</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-accent">{stats.recent_contacts}</div>
            <div className="text-sm text-text-muted">Recent Contacts</div>
          </div>
          <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
            <div className="text-2xl font-bold text-cyan-400">{stats.conversion_rate}%</div>
            <div className="text-sm text-text-muted">Conversion Rate</div>
          </div>
        </div>
      )}

      {/* Pages Tabs */}
      <div className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto pb-2">
          {pages.map((page) => (
            <button
              key={page.id}
              onClick={() => setActivePage(page.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-all whitespace-nowrap ${
                activePage === page.id
                  ? "border-accent bg-accent/20 text-text-primary"
                  : "border-border bg-bg-secondary text-text-secondary hover:border-accent/50"
              }`}
            >
              <span>{getIconDisplay(page.icon)}</span>
              <span>{page.name}</span>
              <span className="text-xs px-1.5 py-0.5 rounded bg-bg-tertiary">
                {prospects.filter(p => p.page_id === page.id).length}
              </span>
              <button
                onClick={(e) => { e.stopPropagation(); setEditingPage(page); setShowEditPageModal(true); }}
                className="ml-1 text-text-muted hover:text-text-primary"
                title="Edit page"
              >
                ✏️
              </button>
            </button>
          ))}
          <button
            onClick={() => setShowNewPageModal(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg border border-dashed border-border text-text-muted hover:border-accent hover:text-accent transition-colors whitespace-nowrap"
          >
            + New Page
          </button>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search prospects..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
        />
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value as ProspectStatus | "all")}
          className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
        >
          <option value="all">All Status</option>
          {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterPriority}
          onChange={(e) => setFilterPriority(e.target.value as ProspectPriority | "all")}
          className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
        >
          <option value="all">All Priority</option>
          {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
          ))}
        </select>
        <select
          value={filterQuality}
          onChange={(e) => setFilterQuality(e.target.value === "all" ? "all" : parseInt(e.target.value))}
          className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
        >
          <option value="all">All Quality</option>
          {[5, 4, 3, 2, 1].map((q) => (
            <option key={q} value={q}>{q} Stars+</option>
          ))}
        </select>
        {activePage && (
          <button
            onClick={() => setShowNewProspectModal(true)}
            className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            + Add Prospect
          </button>
        )}
      </div>

      {/* Prospects List */}
      {pages.length === 0 ? (
        <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
          <div className="text-4xl mb-4">📋</div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">Create Your First Page</h3>
          <p className="text-text-secondary mb-6">
            Organize your prospects into pages like &quot;Hot Leads&quot;, &quot;Guild Recruitment&quot;, or &quot;PvP Players&quot;.
          </p>
          <button
            onClick={() => setShowNewPageModal(true)}
            className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
          >
            Create Page
          </button>
        </div>
      ) : filteredProspects.length === 0 ? (
        <div className="text-center py-12 bg-bg-secondary rounded-lg border border-border">
          <div className="text-4xl mb-4">👤</div>
          <h3 className="text-xl font-semibold text-text-primary mb-2">No Prospects Yet</h3>
          <p className="text-text-secondary mb-6">
            {searchQuery || filterStatus !== "all" || filterPriority !== "all"
              ? "Try adjusting your filters"
              : "Add your first prospect to start tracking potential recruits."}
          </p>
          {activePage && (
            <button
              onClick={() => setShowNewProspectModal(true)}
              className="px-6 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
            >
              Add Prospect
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredProspects.map((prospect) => (
            <div
              key={prospect.id}
              className="bg-bg-secondary rounded-lg border border-border hover:border-accent/50 transition-colors p-5"
            >
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-lg font-semibold text-text-primary">{prospect.name}</h3>
                  {prospect.character_name && (
                    <p className="text-sm text-text-muted">Character: {prospect.character_name}</p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 rounded text-xs ${STATUS_CONFIG[prospect.status].bg} ${STATUS_CONFIG[prospect.status].color}`}>
                    {STATUS_CONFIG[prospect.status].label}
                  </span>
                  <span className={`text-sm ${PRIORITY_CONFIG[prospect.priority].color}`} title={PRIORITY_CONFIG[prospect.priority].label}>
                    {PRIORITY_CONFIG[prospect.priority].icon}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-4 mb-3 text-sm text-text-secondary">
                {prospect.server && <span>🌍 {prospect.server}</span>}
                {prospect.location && <span>📍 {prospect.location}</span>}
                <span className="text-yellow-400">{renderStars(prospect.quality_rating)}</span>
              </div>

              {prospect.skills && (
                <p className="text-sm text-text-secondary mb-2">
                  <span className="text-text-muted">Skills:</span> {prospect.skills}
                </p>
              )}

              {prospect.notes && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">{prospect.notes}</p>
              )}

              {prospect.tags && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {prospect.tags.split(",").map((tag, i) => (
                    <span key={i} className="px-2 py-0.5 bg-bg-tertiary rounded text-xs text-text-muted">
                      {tag.trim()}
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-3 border-t border-border">
                <div className="text-xs text-text-muted">
                  {prospect.last_contact ? (
                    <span>Last contact: {new Date(prospect.last_contact).toLocaleDateString()}</span>
                  ) : (
                    <span>No contact yet</span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => markContact(prospect.id)}
                    className="px-2 py-1 text-xs bg-blue-500/20 text-blue-400 rounded hover:bg-blue-500/30 transition-colors"
                    title="Mark as contacted"
                  >
                    📞
                  </button>
                  <button
                    onClick={() => { setEditingProspect(prospect); setShowEditProspectModal(true); }}
                    className="px-2 py-1 text-xs bg-accent/20 text-accent rounded hover:bg-accent/30 transition-colors"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => deleteProspect(prospect.id)}
                    className="px-2 py-1 text-xs bg-red-500/20 text-red-400 rounded hover:bg-red-500/30 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* New Page Modal */}
      {showNewPageModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-lg border border-border max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Create New Page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Page Name *</label>
                <input
                  type="text"
                  value={newPage.name}
                  onChange={(e) => setNewPage({ ...newPage, name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="e.g., Hot Leads"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Description</label>
                <textarea
                  value={newPage.description}
                  onChange={(e) => setNewPage({ ...newPage, description: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setNewPage({ ...newPage, icon })}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl ${
                        newPage.icon === icon ? "border-accent bg-accent/20" : "border-border bg-bg-tertiary"
                      }`}
                    >
                      {getIconDisplay(icon)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewPage({ ...newPage, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newPage.color === color ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewPageModal(false)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createPage}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
              >
                Create Page
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Page Modal */}
      {showEditPageModal && editingPage && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary rounded-lg border border-border max-w-md w-full p-6">
            <h2 className="text-xl font-bold text-text-primary mb-4">Edit Page</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Page Name *</label>
                <input
                  type="text"
                  value={editingPage.name}
                  onChange={(e) => setEditingPage({ ...editingPage, name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Description</label>
                <textarea
                  value={editingPage.description || ""}
                  onChange={(e) => setEditingPage({ ...editingPage, description: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  rows={2}
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Icon</label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_ICONS.map((icon) => (
                    <button
                      key={icon}
                      type="button"
                      onClick={() => setEditingPage({ ...editingPage, icon })}
                      className={`w-10 h-10 rounded-lg border flex items-center justify-center text-xl ${
                        editingPage.icon === icon ? "border-accent bg-accent/20" : "border-border bg-bg-tertiary"
                      }`}
                    >
                      {getIconDisplay(icon)}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Color</label>
                <div className="flex flex-wrap gap-2">
                  {PAGE_COLORS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setEditingPage({ ...editingPage, color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        editingPage.color === color ? "border-white" : "border-transparent"
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-6">
              <button
                onClick={() => { deletePage(editingPage.id); setShowEditPageModal(false); }}
                className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
              >
                Delete Page
              </button>
              <div className="flex gap-3">
                <button
                  onClick={() => { setShowEditPageModal(false); setEditingPage(null); }}
                  className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:text-text-primary transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={updatePage}
                  className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* New Prospect Modal */}
      {showNewProspectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-bg-secondary rounded-lg border border-border max-w-2xl w-full p-6 my-8">
            <h2 className="text-xl font-bold text-text-primary mb-4">Add New Prospect</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Name *</label>
                <input
                  type="text"
                  value={newProspect.name}
                  onChange={(e) => setNewProspect({ ...newProspect, name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="Real name or handle"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Character Name</label>
                <input
                  type="text"
                  value={newProspect.character_name}
                  onChange={(e) => setNewProspect({ ...newProspect, character_name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="In-game character name"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Server</label>
                <input
                  type="text"
                  value={newProspect.server}
                  onChange={(e) => setNewProspect({ ...newProspect, server: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="e.g., Harmony, Independence"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Location</label>
                <input
                  type="text"
                  value={newProspect.location}
                  onChange={(e) => setNewProspect({ ...newProspect, location: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="Deed or area"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Status</label>
                <select
                  value={newProspect.status}
                  onChange={(e) => setNewProspect({ ...newProspect, status: e.target.value as ProspectStatus })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Priority</label>
                <select
                  value={newProspect.priority}
                  onChange={(e) => setNewProspect({ ...newProspect, priority: e.target.value as ProspectPriority })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Quality Rating</label>
                <div className="flex items-center gap-2 py-2">
                  {renderStars(newProspect.quality_rating, true, (r) => setNewProspect({ ...newProspect, quality_rating: r }))}
                  <span className="text-text-muted text-sm">({newProspect.quality_rating}/5)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Source</label>
                <input
                  type="text"
                  value={newProspect.source}
                  onChange={(e) => setNewProspect({ ...newProspect, source: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="Where did you find them?"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Skills</label>
                <input
                  type="text"
                  value={newProspect.skills}
                  onChange={(e) => setNewProspect({ ...newProspect, skills: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="e.g., Blacksmithing 90, Carpentry 80"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Contact Info</label>
                <input
                  type="text"
                  value={newProspect.contact_info}
                  onChange={(e) => setNewProspect({ ...newProspect, contact_info: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="Discord, forum username, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={newProspect.tags}
                  onChange={(e) => setNewProspect({ ...newProspect, tags: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  placeholder="pvp, crafter, veteran, new player"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Notes</label>
                <textarea
                  value={newProspect.notes}
                  onChange={(e) => setNewProspect({ ...newProspect, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  rows={3}
                  placeholder="Additional notes about this prospect..."
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowNewProspectModal(false)}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={createProspect}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
              >
                Add Prospect
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Prospect Modal */}
      {showEditProspectModal && editingProspect && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-bg-secondary rounded-lg border border-border max-w-2xl w-full p-6 my-8">
            <h2 className="text-xl font-bold text-text-primary mb-4">Edit Prospect</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm text-text-secondary mb-1">Name *</label>
                <input
                  type="text"
                  value={editingProspect.name}
                  onChange={(e) => setEditingProspect({ ...editingProspect, name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Character Name</label>
                <input
                  type="text"
                  value={editingProspect.character_name || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, character_name: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Server</label>
                <input
                  type="text"
                  value={editingProspect.server || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, server: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Location</label>
                <input
                  type="text"
                  value={editingProspect.location || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, location: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Status</label>
                <select
                  value={editingProspect.status}
                  onChange={(e) => setEditingProspect({ ...editingProspect, status: e.target.value as ProspectStatus })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  {Object.entries(STATUS_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Priority</label>
                <select
                  value={editingProspect.priority}
                  onChange={(e) => setEditingProspect({ ...editingProspect, priority: e.target.value as ProspectPriority })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  {Object.entries(PRIORITY_CONFIG).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Quality Rating</label>
                <div className="flex items-center gap-2 py-2">
                  {renderStars(editingProspect.quality_rating, true, (r) => setEditingProspect({ ...editingProspect, quality_rating: r as 1|2|3|4|5 }))}
                  <span className="text-text-muted text-sm">({editingProspect.quality_rating}/5)</span>
                </div>
              </div>
              <div>
                <label className="block text-sm text-text-secondary mb-1">Page</label>
                <select
                  value={editingProspect.page_id}
                  onChange={(e) => setEditingProspect({ ...editingProspect, page_id: parseInt(e.target.value) })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                >
                  {pages.map((page) => (
                    <option key={page.id} value={page.id}>{page.name}</option>
                  ))}
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Skills</label>
                <input
                  type="text"
                  value={editingProspect.skills || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, skills: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Contact Info</label>
                <input
                  type="text"
                  value={editingProspect.contact_info || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, contact_info: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={editingProspect.tags || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, tags: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm text-text-secondary mb-1">Notes</label>
                <textarea
                  value={editingProspect.notes || ""}
                  onChange={(e) => setEditingProspect({ ...editingProspect, notes: e.target.value })}
                  className="w-full px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => { setShowEditProspectModal(false); setEditingProspect(null); }}
                className="px-4 py-2 bg-bg-tertiary text-text-secondary rounded-lg hover:text-text-primary transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={updateProspect}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white rounded-lg transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
