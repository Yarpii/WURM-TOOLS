"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import type { AdminUser, UserStats } from "./types";

interface MembersTabProps {
  showMessage: (type: "success" | "error", text: string) => void;
}

export default function MembersTab({ showMessage }: MembersTabProps) {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ total: 0, visible: 0, banned: 0, admins: 0 });
  const [banReason, setBanReason] = useState("");
  const [banningUserId, setBanningUserId] = useState<number | null>(null);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/admin/members");
      const data = await res.json();
      setUsers(data.users || []);
      setUserStats(data.stats || { total: 0, visible: 0, banned: 0, admins: 0 });
    } catch (err) {
      console.error("Failed to load users:", err);
    }
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const handleBanUser = async (userId: number) => {
    if (!banReason || banReason.length < 3) {
      showMessage("error", "Please provide a ban reason (at least 3 characters)");
      return;
    }

    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "ban", reason: banReason }),
    });

    if (res.ok) {
      showMessage("success", "User banned successfully");
      setBanReason("");
      setBanningUserId(null);
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to ban user");
    }
  };

  const handleUnbanUser = async (userId: number) => {
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "unban" }),
    });

    if (res.ok) {
      showMessage("success", "User unbanned successfully");
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to unban user");
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!confirm("Are you sure you want to delete this user? This action cannot be undone.")) {
      return;
    }

    const res = await fetch(`/api/admin/members/${userId}`, { method: "DELETE" });

    if (res.ok) {
      showMessage("success", "User deleted successfully");
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to delete user");
    }
  };

  const handleUpdateUserRole = async (userId: number, role: "user" | "admin") => {
    const res = await fetch(`/api/admin/members/${userId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role }),
    });

    if (res.ok) {
      showMessage("success", "User role updated");
      loadUsers();
    } else {
      const data = await res.json();
      showMessage("error", data.error || "Failed to update role");
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-bg-secondary border border-border p-4 rounded-xl">
          <div className="text-2xl font-bold text-white">{userStats.total}</div>
          <div className="text-text-secondary text-sm">Total Users</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl">
          <div className="text-2xl font-bold text-success">{userStats.visible}</div>
          <div className="text-text-secondary text-sm">Visible in List</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl">
          <div className="text-2xl font-bold text-red-400">{userStats.banned}</div>
          <div className="text-text-secondary text-sm">Banned</div>
        </div>
        <div className="bg-bg-secondary border border-border p-4 rounded-xl">
          <div className="text-2xl font-bold text-accent">{userStats.admins}</div>
          <div className="text-text-secondary text-sm">Admins</div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-4">
        <Link
          href="/admin/roles"
          className="px-4 py-2 bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors"
        >
          Manage Roles & Permissions
        </Link>
      </div>

      {/* Users List */}
      <div className="bg-bg-secondary border border-border p-6 rounded-xl">
        <h2 className="text-accent text-xl font-semibold mb-4">All Users</h2>
        <div className="space-y-3">
          {users.map((user) => (
            <div
              key={user.id}
              className={`p-4 rounded-lg border ${
                user.is_banned
                  ? "bg-red-500/10 border-red-500/30"
                  : "bg-white/5 border-border"
              }`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <Link
                      href={`/members/${user.id}`}
                      className="font-medium text-white hover:text-accent transition-colors"
                    >
                      {user.username}
                    </Link>
                    {user.display_name && user.display_name !== user.username && (
                      <span className="text-text-secondary">({user.display_name})</span>
                    )}
                    <span
                      className={`text-xs px-2 py-0.5 rounded ${
                        user.role === "admin" ? "bg-accent text-white" : "bg-white/10 text-text-secondary"
                      }`}
                    >
                      {user.role}
                    </span>
                    {user.is_banned && (
                      <span className="text-xs px-2 py-0.5 rounded bg-red-500/30 text-red-400">
                        BANNED
                      </span>
                    )}
                    {user.show_in_members_list && (
                      <span className="text-xs px-2 py-0.5 rounded bg-success/30 text-success">
                        Visible
                      </span>
                    )}
                  </div>
                  <div className="text-text-muted text-sm mt-1">
                    {user.email} • Joined {formatDate(user.created_at)}
                    {user.location && ` • ${user.location}`}
                    {user.wurm_server && ` • ${user.wurm_server}`}
                  </div>
                  {user.is_banned && user.ban_reason && (
                    <div className="text-red-400 text-sm mt-1">
                      Ban reason: {user.ban_reason}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {/* Role Toggle */}
                  <select
                    value={user.role}
                    onChange={(e) => handleUpdateUserRole(user.id, e.target.value as "user" | "admin")}
                    className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg text-white"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>

                  {/* Manage Roles */}
                  <Link
                    href={`/admin/roles?user=${user.id}`}
                    className="px-3 py-1.5 text-sm bg-accent/20 text-accent hover:bg-accent/30 rounded-lg transition-colors"
                  >
                    Roles
                  </Link>

                  {/* Ban/Unban */}
                  {user.is_banned ? (
                    <button
                      onClick={() => handleUnbanUser(user.id)}
                      className="px-3 py-1.5 text-sm bg-success/20 text-success hover:bg-success/30 rounded-lg transition-colors"
                    >
                      Unban
                    </button>
                  ) : banningUserId === user.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={banReason}
                        onChange={(e) => setBanReason(e.target.value)}
                        placeholder="Ban reason..."
                        className="px-3 py-1.5 text-sm bg-bg-tertiary border border-border rounded-lg text-white w-40"
                      />
                      <button
                        onClick={() => handleBanUser(user.id)}
                        className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setBanningUserId(null);
                          setBanReason("");
                        }}
                        className="px-3 py-1.5 text-sm bg-white/10 text-text-secondary hover:bg-white/20 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setBanningUserId(user.id)}
                      className="px-3 py-1.5 text-sm bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 rounded-lg transition-colors"
                    >
                      Ban
                    </button>
                  )}

                  {/* Delete */}
                  <button
                    onClick={() => handleDeleteUser(user.id)}
                    className="px-3 py-1.5 text-sm bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}

          {users.length === 0 && (
            <div className="text-center text-text-muted py-10">No users found.</div>
          )}
        </div>
      </div>
    </div>
  );
}
