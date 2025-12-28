"use client";

import { useState, useEffect, use } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import type { Alliance, AllianceMember, AllianceInvite } from "@/lib/types";

type TabType = "members" | "invites" | "settings";

export default function AllianceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const { user } = useAuth();
  const [alliance, setAlliance] = useState<Alliance | null>(null);
  const [members, setMembers] = useState<AllianceMember[]>([]);
  const [invites, setInvites] = useState<AllianceInvite[]>([]);
  const [currentMember, setCurrentMember] = useState<AllianceMember | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("members");

  // Invite form
  const [inviteUsername, setInviteUsername] = useState("");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");

  // Settings form
  const [settingsForm, setSettingsForm] = useState({
    name: "",
    description: "",
    tag: "",
    is_public: true,
    max_members: 50,
  });
  const [settingsError, setSettingsError] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchAlliance = async () => {
    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load alliance");
        return;
      }

      setAlliance(data.alliance);
      setSettingsForm({
        name: data.alliance.name,
        description: data.alliance.description || "",
        tag: data.alliance.tag || "",
        is_public: data.alliance.is_public,
        max_members: data.alliance.max_members,
      });
    } catch (err) {
      setError("Failed to load alliance: " + String(err));
    }
  };

  const fetchMembers = async () => {
    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}/members`);
      const data = await res.json();

      if (res.ok) {
        setMembers(data.members || []);
        if (user) {
          const me = data.members?.find((m: AllianceMember) => m.user_id === user.id);
          setCurrentMember(me || null);
        }
      }
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  };

  const fetchInvites = async () => {
    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}/invites`);
      const data = await res.json();

      if (res.ok) {
        setInvites(data.invites || []);
      }
    } catch (err) {
      console.error("Failed to fetch invites:", err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await fetchAlliance();
      await fetchMembers();
      setLoading(false);
    };
    loadData();
  }, [resolvedParams.id, user]);

  useEffect(() => {
    if (currentMember && currentMember.role !== "member") {
      fetchInvites();
    }
  }, [currentMember]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");

    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: inviteUsername }),
      });

      const data = await res.json();

      if (!res.ok) {
        setInviteError(data.error || "Failed to send invite");
        return;
      }

      setInviteSuccess(`Invite sent to ${inviteUsername}!`);
      setInviteUsername("");
      await fetchInvites();
    } catch (err) {
      setInviteError("Failed to send invite: " + String(err));
    }
  };

  const handleCancelInvite = async (inviteId: number) => {
    try {
      await fetch(`/api/alliances/${resolvedParams.id}/invites?invite_id=${inviteId}`, {
        method: "DELETE",
      });
      await fetchInvites();
    } catch (err) {
      console.error("Failed to cancel invite:", err);
    }
  };

  const handleUpdateRole = async (userId: number, role: string) => {
    try {
      await fetch(`/api/alliances/${resolvedParams.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, role }),
      });
      await fetchMembers();
    } catch (err) {
      console.error("Failed to update role:", err);
    }
  };

  const handleRemoveMember = async (userId: number) => {
    if (!confirm("Are you sure you want to remove this member?")) return;

    try {
      await fetch(`/api/alliances/${resolvedParams.id}/members?user_id=${userId}`, {
        method: "DELETE",
      });
      await fetchMembers();
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  };

  const handleLeaveAlliance = async () => {
    if (!confirm("Are you sure you want to leave this alliance?")) return;

    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}/members`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.href = "/alliances";
      }
    } catch (err) {
      console.error("Failed to leave alliance:", err);
    }
  };

  const handleTransferLeadership = async (userId: number) => {
    if (!confirm("Are you sure you want to transfer leadership? This action cannot be undone.")) return;

    try {
      await fetch(`/api/alliances/${resolvedParams.id}/members`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, transfer_leadership: true }),
      });
      await fetchMembers();
      await fetchAlliance();
    } catch (err) {
      console.error("Failed to transfer leadership:", err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSettingsError("");
    setSettingsSuccess("");
    setSaving(true);

    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settingsForm),
      });

      const data = await res.json();

      if (!res.ok) {
        setSettingsError(data.error || "Failed to save settings");
        setSaving(false);
        return;
      }

      setAlliance(data.alliance);
      setSettingsSuccess("Settings saved successfully!");
      setSaving(false);
    } catch (err) {
      setSettingsError("Failed to save settings: " + String(err));
      setSaving(false);
    }
  };

  const handleDeleteAlliance = async () => {
    if (!confirm("Are you sure you want to delete this alliance? This action cannot be undone.")) return;

    try {
      const res = await fetch(`/api/alliances/${resolvedParams.id}`, {
        method: "DELETE",
      });

      if (res.ok) {
        window.location.href = "/alliances";
      }
    } catch (err) {
      console.error("Failed to delete alliance:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const canManage = currentMember?.role === "leader" || currentMember?.role === "officer" || user?.role === "admin";
  const isLeader = currentMember?.role === "leader" || user?.role === "admin";

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-text-muted">Loading alliance...</div>
      </div>
    );
  }

  if (error || !alliance) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <div className="text-6xl mb-4">404</div>
          <h2 className="text-xl font-semibold text-text-primary mb-2">Alliance Not Found</h2>
          <p className="text-text-muted mb-6">{error || "This alliance doesn't exist."}</p>
          <Link
            href="/alliances"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Back to Alliances
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href="/alliances"
        className="inline-flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-6"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
        </svg>
        Back to Alliances
      </Link>

      {/* Header */}
      <div className="bg-bg-secondary rounded-xl border border-border p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-text-primary">{alliance.name}</h1>
              {alliance.tag && (
                <span className="px-2 py-1 bg-accent/20 text-accent text-sm rounded font-mono">
                  [{alliance.tag}]
                </span>
              )}
              {alliance.is_public ? (
                <span className="px-2 py-1 bg-success/20 text-success text-xs rounded">Public</span>
              ) : (
                <span className="px-2 py-1 bg-text-muted/20 text-text-muted text-xs rounded">Private</span>
              )}
            </div>

            {alliance.description && (
              <p className="text-text-secondary mb-4">{alliance.description}</p>
            )}

            <div className="flex items-center gap-4 text-sm text-text-muted">
              <span>
                <strong className="text-text-primary">{alliance.member_count}</strong>/{alliance.max_members} members
              </span>
              <span>Leader: <span className="text-accent">{alliance.leader_username}</span></span>
              <span>Created {formatDate(alliance.created_at)}</span>
            </div>
          </div>

          {currentMember && currentMember.role !== "leader" && (
            <button
              onClick={handleLeaveAlliance}
              className="px-4 py-2 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors text-sm font-medium"
            >
              Leave Alliance
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 border-b border-border pb-2">
        <button
          onClick={() => setActiveTab("members")}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            activeTab === "members"
              ? "bg-accent text-white"
              : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
          }`}
        >
          Members ({members.length})
        </button>
        {canManage && (
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
        )}
        {isLeader && (
          <button
            onClick={() => setActiveTab("settings")}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-accent text-white"
                : "text-text-secondary hover:text-text-primary hover:bg-bg-hover"
            }`}
          >
            Settings
          </button>
        )}
      </div>

      {/* Members Tab */}
      {activeTab === "members" && (
        <div className="grid gap-4">
          {members.map((member) => (
            <div
              key={member.id}
              className="bg-bg-secondary rounded-lg border border-border p-4 flex items-center gap-4"
            >
              {/* Avatar */}
              <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg flex-shrink-0">
                {member.avatar_url ? (
                  <img
                    src={member.avatar_url}
                    alt={member.display_name || member.username}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  getInitials(member.display_name || member.username)
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-text-primary">
                    {member.display_name || member.username}
                  </span>
                  {member.display_name && (
                    <span className="text-sm text-text-muted">@{member.username}</span>
                  )}
                  <span
                    className={`px-2 py-0.5 rounded text-xs ${
                      member.role === "leader"
                        ? "bg-warning/20 text-warning"
                        : member.role === "officer"
                        ? "bg-info/20 text-info"
                        : "bg-text-muted/20 text-text-muted"
                    }`}
                  >
                    {member.role.charAt(0).toUpperCase() + member.role.slice(1)}
                  </span>
                </div>
                <div className="text-sm text-text-muted">
                  Joined {formatDate(member.joined_at)}
                  {member.invited_by_username && ` · Invited by ${member.invited_by_username}`}
                </div>
              </div>

              {/* Actions */}
              {isLeader && member.user_id !== user?.id && member.role !== "leader" && (
                <div className="flex gap-2">
                  <select
                    value={member.role}
                    onChange={(e) => handleUpdateRole(member.user_id, e.target.value)}
                    className="px-3 py-1.5 bg-bg-tertiary rounded text-sm border border-border focus:border-accent focus:outline-none"
                  >
                    <option value="member">Member</option>
                    <option value="officer">Officer</option>
                  </select>
                  <button
                    onClick={() => handleTransferLeadership(member.user_id)}
                    className="px-3 py-1.5 bg-warning/20 text-warning rounded text-sm hover:bg-warning/30 transition-colors"
                  >
                    Make Leader
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.user_id)}
                    className="px-3 py-1.5 bg-danger/20 text-danger rounded text-sm hover:bg-danger/30 transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Invites Tab */}
      {activeTab === "invites" && canManage && (
        <div className="space-y-6">
          {/* Invite Form */}
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-4">Invite Member</h3>

            <form onSubmit={handleInvite} className="flex gap-4">
              <input
                type="text"
                value={inviteUsername}
                onChange={(e) => setInviteUsername(e.target.value)}
                placeholder="Username to invite"
                required
                className="flex-1 px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
              />
              <button
                type="submit"
                className="px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors font-medium"
              >
                Send Invite
              </button>
            </form>

            {inviteError && (
              <div className="mt-4 p-3 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                {inviteError}
              </div>
            )}
            {inviteSuccess && (
              <div className="mt-4 p-3 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                {inviteSuccess}
              </div>
            )}
          </div>

          {/* Pending Invites */}
          <div>
            <h3 className="text-lg font-semibold text-text-primary mb-4">Pending Invites</h3>

            {invites.length === 0 ? (
              <div className="text-center py-8 text-text-muted">No pending invites</div>
            ) : (
              <div className="grid gap-4">
                {invites.map((invite) => (
                  <div
                    key={invite.id}
                    className="bg-bg-secondary rounded-lg border border-border p-4 flex items-center justify-between"
                  >
                    <div>
                      <span className="font-medium text-text-primary">{invite.username}</span>
                      <span className="text-sm text-text-muted ml-2">
                        Invited by {invite.invited_by_username} · {formatDate(invite.created_at)}
                      </span>
                    </div>
                    <button
                      onClick={() => handleCancelInvite(invite.id)}
                      className="px-3 py-1.5 bg-danger/20 text-danger rounded text-sm hover:bg-danger/30 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && isLeader && (
        <div className="max-w-2xl">
          <div className="bg-bg-secondary rounded-xl border border-border p-6">
            <h3 className="text-lg font-semibold text-text-primary mb-6">Alliance Settings</h3>

            <form onSubmit={handleSaveSettings} className="space-y-6">
              {settingsError && (
                <div className="p-4 bg-danger/10 border border-danger/30 rounded-lg text-danger text-sm">
                  {settingsError}
                </div>
              )}
              {settingsSuccess && (
                <div className="p-4 bg-success/10 border border-success/30 rounded-lg text-success text-sm">
                  {settingsSuccess}
                </div>
              )}

              <div>
                <label className="block text-sm text-text-secondary mb-2">Alliance Name</label>
                <input
                  type="text"
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  required
                  minLength={3}
                  maxLength={50}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Tag</label>
                <input
                  type="text"
                  value={settingsForm.tag}
                  onChange={(e) => setSettingsForm({ ...settingsForm, tag: e.target.value.toUpperCase() })}
                  minLength={2}
                  maxLength={5}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Description</label>
                <textarea
                  value={settingsForm.description}
                  onChange={(e) => setSettingsForm({ ...settingsForm, description: e.target.value })}
                  maxLength={500}
                  rows={4}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-sm text-text-secondary mb-2">Max Members</label>
                <input
                  type="number"
                  value={settingsForm.max_members}
                  onChange={(e) => setSettingsForm({ ...settingsForm, max_members: parseInt(e.target.value) || 50 })}
                  min={members.length}
                  max={100}
                  className="w-full px-4 py-3 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
                />
              </div>

              <div className="p-4 bg-bg-tertiary rounded-lg border border-border">
                <label className="flex items-start gap-4 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={settingsForm.is_public}
                    onChange={(e) => setSettingsForm({ ...settingsForm, is_public: e.target.checked })}
                    className="mt-1 w-5 h-5 rounded border-border bg-bg-secondary checked:bg-accent checked:border-accent focus:ring-accent"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-text-primary">Public Alliance</div>
                    <p className="text-sm text-text-muted mt-1">
                      Public alliances are visible to everyone.
                    </p>
                  </div>
                </label>
              </div>

              <button
                type="submit"
                disabled={saving}
                className={`w-full py-3 rounded-lg font-medium transition-all ${
                  saving
                    ? "bg-bg-tertiary cursor-not-allowed text-text-muted"
                    : "bg-accent hover:bg-accent-hover text-white"
                }`}
              >
                {saving ? "Saving..." : "Save Settings"}
              </button>
            </form>

            {/* Danger Zone */}
            <div className="mt-8 pt-6 border-t border-danger/30">
              <h4 className="text-lg font-semibold text-danger mb-4">Danger Zone</h4>
              <button
                onClick={handleDeleteAlliance}
                className="px-6 py-3 bg-danger/20 text-danger rounded-lg hover:bg-danger/30 transition-colors font-medium"
              >
                Delete Alliance
              </button>
              <p className="text-sm text-text-muted mt-2">
                This action cannot be undone. All members will be removed.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
