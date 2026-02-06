"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { Alliance, AllianceInvite } from "@/lib/types";
import InfoSection from "@/components/InfoSection";

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

      <InfoSection>
      {/* Feature Sections */}
      {/* Stronger Together */}
      <div className="mt-16 mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
          Stronger Together
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 to-violet-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
            <div className="relative bg-bg-secondary/80 backdrop-blur-sm rounded-xl p-6 border border-indigo-500/20 hover:border-indigo-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-indigo-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Unite Players</h3>
              <p className="text-text-secondary text-sm">
                Bring together like-minded adventurers. Build a community within Wurm with shared goals and values.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-violet-500/20 to-purple-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
            <div className="relative bg-bg-secondary/80 backdrop-blur-sm rounded-xl p-6 border border-violet-500/20 hover:border-violet-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-violet-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-violet-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Coordinate Activities</h3>
              <p className="text-text-secondary text-sm">
                Plan group hunts, defend territory, and organize events together. Strength in numbers makes everything possible.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 to-slate-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
            <div className="relative bg-bg-secondary/80 backdrop-blur-sm rounded-xl p-6 border border-purple-500/20 hover:border-purple-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-purple-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Grow Together</h3>
              <p className="text-text-secondary text-sm">
                Share knowledge, resources, and skills. Help new members grow while experienced players mentor the next generation.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Alliance Benefits */}
      <div className="mb-12 bg-gradient-to-br from-indigo-500/5 to-violet-500/5 rounded-xl p-8 border border-indigo-500/10">
        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Why Join an Alliance?
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Access to shared resources and community storage",
            "Organized group hunts and unique slaying events",
            "Help with deed projects and terraforming",
            "Protection and support from fellow members",
            "Learn skills faster from experienced players",
            "Build lasting friendships in the Wurm community",
          ].map((benefit, i) => (
            <div key={i} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-violet-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-text-secondary">{benefit}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Explore More Tools */}
      <div className="mb-12">
        <h2 className="text-xl font-bold text-text-primary mb-6 text-center">Explore More Tools</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Link
            href="/members"
            className="group bg-bg-secondary hover:bg-bg-tertiary rounded-lg p-5 border border-border hover:border-lime-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-lime-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary group-hover:text-lime-400 transition-colors">Members</h3>
            </div>
            <p className="text-sm text-text-muted">Browse community members and find potential alliance recruits</p>
          </Link>

          <Link
            href="/events"
            className="group bg-bg-secondary hover:bg-bg-tertiary rounded-lg p-5 border border-border hover:border-fuchsia-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-fuchsia-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-fuchsia-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary group-hover:text-fuchsia-400 transition-colors">Events</h3>
            </div>
            <p className="text-sm text-text-muted">Discover community events to attend with your alliance</p>
          </Link>

          <Link
            href="/merchants"
            className="group bg-bg-secondary hover:bg-bg-tertiary rounded-lg p-5 border border-border hover:border-blue-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary group-hover:text-blue-400 transition-colors">Merchants</h3>
            </div>
            <p className="text-sm text-text-muted">Find merchants for alliance supplies and equipment</p>
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-indigo-500/10 via-violet-500/10 to-purple-500/10 rounded-xl p-8 border border-indigo-500/20">
        <h2 className="text-2xl font-bold text-text-primary mb-3">Ready to Join Forces?</h2>
        <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
          Create your own alliance or join an existing one. Build something greater together with fellow adventurers.
        </p>
        {user ? (
          myAlliance ? (
            <Link
              href={`/alliances/${myAlliance.id}`}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
              View My Alliance
            </Link>
          ) : (
            <button
              onClick={() => setActiveTab("create")}
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Create an Alliance
            </button>
          )
        ) : (
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
            </svg>
            Login to Get Started
          </Link>
        )}
      </div>
      </InfoSection>
    </div>
  );
}
