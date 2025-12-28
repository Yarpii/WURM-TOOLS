"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { Alliance, AllianceInvite } from "@/lib/types";

type TabType = "browse" | "create" | "my-alliance" | "invites";

export default function AlliancesPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<TabType>("browse");
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [myAlliance, setMyAlliance] = useState<Alliance | null>(null);
  const [invites, setInvites] = useState<AllianceInvite[]>([]);
  const [loading, setLoading] = useState(true);

  // Create form state
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    tag: "",
    is_public: true,
    max_members: 50,
  });
  const [formError, setFormError] = useState("");
  const [formSuccess, setFormSuccess] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const fetchAlliances = async () => {
    try {
      const res = await fetch("/api/alliances");
      const data = await res.json();
      setAlliances(data.alliances || []);
    } catch (err) {
      console.error("Failed to fetch alliances:", err);
    }
  };

  const fetchMyAlliance = async () => {
    if (!user) return;
    try {
      const res = await fetch("/api/invites");
      const data = await res.json();
      setMyAlliance(data.current_alliance);
      setInvites(data.invites || []);
    } catch (err) {
      console.error("Failed to fetch alliance status:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchAlliances(), fetchMyAlliance()]);
      setLoading(false);
    };
    loadData();
  }, [user]);

  const handleCreateAlliance = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError("");
    setFormSuccess("");
    setSubmitting(true);

    try {
      const res = await fetch("/api/alliances", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data.error || "Failed to create alliance");
        setSubmitting(false);
        return;
      }

      setFormSuccess("Alliance created successfully!");
      setFormData({
        name: "",
        description: "",
        tag: "",
        is_public: true,
        max_members: 50,
      });

      await Promise.all([fetchAlliances(), fetchMyAlliance()]);
      setActiveTab("my-alliance");
      setSubmitting(false);
    } catch (err) {
      setFormError("Connection error: " + String(err));
      setSubmitting(false);
    }
  };

  const handleRespondToInvite = async (inviteId: number, accept: boolean) => {
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invite_id: inviteId, accept }),
      });

      if (res.ok) {
        await fetchMyAlliance();
        if (accept) {
          setActiveTab("my-alliance");
        }
      }
    } catch (err) {
      console.error("Failed to respond to invite:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Alliances</h1>
        <p className="text-text-secondary">
          Join or create an alliance to connect with other players
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">{alliances.length}</div>
          <div className="text-sm text-text-muted">Public Alliances</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-accent">
            {alliances.reduce((sum, a) => sum + (a.member_count || 0), 0)}
          </div>
          <div className="text-sm text-text-muted">Total Members</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-success">
            {myAlliance ? "1" : "0"}
          </div>
          <div className="text-sm text-text-muted">Your Alliance</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-warning">{invites.length}</div>
          <div className="text-sm text-text-muted">Pending Invites</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab("browse")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "browse"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Browse
        </button>
        {user && (
          <>
            {!myAlliance && (
              <button
                onClick={() => setActiveTab("create")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "create"
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                Create Alliance
              </button>
            )}
            {myAlliance && (
              <button
                onClick={() => setActiveTab("my-alliance")}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  activeTab === "my-alliance"
                    ? "bg-accent text-white"
                    : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
                }`}
              >
                My Alliance
              </button>
            )}
            <button
              onClick={() => setActiveTab("invites")}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === "invites"
                  ? "bg-accent text-white"
                  : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
              }`}
            >
              Invites
              {invites.length > 0 && (
                <span className="ml-2 px-1.5 py-0.5 text-xs bg-warning/20 text-warning rounded">
                  {invites.length}
                </span>
              )}
            </button>
          </>
        )}
      </div>

      {/* Browse Tab */}
      {activeTab === "browse" && (
        <div>
          {loading ? (
            <div className="text-center py-12 text-text-muted">Loading alliances...</div>
          ) : alliances.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">No alliances yet</div>
              <p className="text-sm text-text-muted">
                {user
                  ? "Be the first to create an alliance!"
                  : "Login to create an alliance"}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {alliances.map((alliance) => (
                <Link
                  key={alliance.id}
                  href={`/alliances/${alliance.id}`}
                  className="bg-bg-secondary rounded-lg border border-border hover:border-accent/50 transition-colors p-5 group"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent transition-colors">
                          {alliance.name}
                        </h3>
                        {alliance.tag && (
                          <span className="px-2 py-0.5 bg-accent/20 text-accent text-xs rounded font-mono">
                            [{alliance.tag}]
                          </span>
                        )}
                      </div>

                      {alliance.description && (
                        <p className="text-sm text-text-secondary mb-3 line-clamp-2">
                          {alliance.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-sm text-text-muted">
                        <span>
                          <strong className="text-text-primary">{alliance.member_count}</strong>/{alliance.max_members} members
                        </span>
                        <span>Leader: <span className="text-accent">{alliance.leader_username}</span></span>
                        <span>Created {formatDate(alliance.created_at)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {alliance.is_public ? (
                        <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">
                          Public
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-text-muted/20 text-text-muted text-xs rounded">
                          Private
                        </span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Create Tab */}
      {activeTab === "create" && user && !myAlliance && (
        <div className="max-w-2xl">
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h2 className="text-xl font-semibold text-text-primary mb-6">Create Alliance</h2>

            <form onSubmit={handleCreateAlliance} className="space-y-6">
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

              {/* Name */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Alliance Name</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  minLength={3}
                  maxLength={50}
                  placeholder="e.g., Knights of the Round Table"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Tag */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Tag (2-5 characters)</label>
                <input
                  type="text"
                  value={formData.tag}
                  onChange={(e) => setFormData({ ...formData, tag: e.target.value.toUpperCase() })}
                  minLength={2}
                  maxLength={5}
                  placeholder="e.g., KRT"
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none font-mono"
                />
                <p className="text-xs text-text-muted mt-1">
                  Short tag shown next to alliance name
                </p>
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  maxLength={500}
                  rows={4}
                  placeholder="Describe your alliance..."
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
                />
              </div>

              {/* Max Members */}
              <div>
                <label className="block text-sm text-text-secondary mb-2">Max Members</label>
                <input
                  type="number"
                  value={formData.max_members}
                  onChange={(e) => setFormData({ ...formData, max_members: parseInt(e.target.value) || 50 })}
                  min={5}
                  max={100}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              {/* Public */}
              <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.is_public}
                    onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">Public Alliance</div>
                    <p className="text-sm text-text-muted mt-1">
                      Public alliances are visible to everyone. Private alliances can only be seen by members.
                    </p>
                  </div>
                </label>
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
                {submitting ? "Creating..." : "Create Alliance"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* My Alliance Tab */}
      {activeTab === "my-alliance" && user && myAlliance && (
        <div>
          <Link
            href={`/alliances/${myAlliance.id}`}
            className="bg-bg-secondary rounded-xl border border-border p-6 block hover:border-accent/50 transition-colors"
          >
            <div className="flex items-center gap-4 mb-4">
              <h2 className="text-xl font-semibold text-text-primary">{myAlliance.name}</h2>
              {myAlliance.tag && (
                <span className="px-2 py-1 bg-accent/20 text-accent text-sm rounded font-mono">
                  [{myAlliance.tag}]
                </span>
              )}
            </div>

            {myAlliance.description && (
              <p className="text-text-secondary mb-4">{myAlliance.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span>
                <strong className="text-text-primary">{myAlliance.member_count}</strong>/{myAlliance.max_members} members
              </span>
              <span>Leader: <span className="text-accent">{myAlliance.leader_username}</span></span>
            </div>

            <div className="mt-4 pt-4 border-t border-border text-sm text-accent">
              Click to view alliance details and manage members
            </div>
          </Link>
        </div>
      )}

      {/* Invites Tab */}
      {activeTab === "invites" && user && (
        <div>
          {invites.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-text-muted mb-2">No pending invites</div>
              <p className="text-sm text-text-muted">
                When someone invites you to an alliance, it will appear here.
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {invites.map((invite) => (
                <div
                  key={invite.id}
                  className="bg-bg-secondary rounded-lg border border-border p-5"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold text-text-primary mb-1">
                        {invite.alliance_name}
                      </h3>
                      <p className="text-sm text-text-muted">
                        Invited by <span className="text-accent">{invite.invited_by_username}</span>
                      </p>
                      <p className="text-xs text-text-muted mt-2">
                        Received {formatDate(invite.created_at)}
                        {invite.expires_at && ` · Expires ${formatDate(invite.expires_at)}`}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => handleRespondToInvite(invite.id, true)}
                        className="px-4 py-2 bg-success/20 text-success rounded-lg hover:bg-success/30 transition-colors text-sm font-medium"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => handleRespondToInvite(invite.id, false)}
                        className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors text-sm font-medium"
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Login Prompt */}
      {!user && activeTab !== "browse" && (
        <div className="text-center py-12">
          <div className="text-text-muted mb-4">Please login to access this feature</div>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </Link>
        </div>
      )}
    </div>
  );
}
