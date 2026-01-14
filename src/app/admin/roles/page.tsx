"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminGuard from "@/components/AdminGuard";

interface Role {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  color: string;
  icon: string;
  priority: number;
  is_system: boolean;
  is_default: boolean;
}

interface Permission {
  id: number;
  name: string;
  display_name: string;
  description: string | null;
  category: string;
}

interface RoleStats {
  total_roles: number;
  total_permissions: number;
  roles_with_users: { role_id: number; role_name: string; user_count: number }[];
}

interface RoleUser {
  user_id: number;
  username: string;
  display_name: string | null;
  avatar_url: string | null;
  assigned_at: string;
}

function RolesContent() {
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [stats, setStats] = useState<RoleStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Edit role state
  const [editingRole, setEditingRole] = useState<Role | null>(null);
  const [rolePermissions, setRolePermissions] = useState<number[]>([]);
  const [roleUsers, setRoleUsers] = useState<RoleUser[]>([]);

  // New role form
  const [showNewRole, setShowNewRole] = useState(false);
  const [newRole, setNewRole] = useState({
    name: "",
    display_name: "",
    description: "",
    color: "#6b7280",
    icon: "user",
    priority: 0,
  });

  useEffect(() => {
    loadRoles();
  }, []);

  const loadRoles = async () => {
    try {
      const res = await fetch("/api/admin/roles");
      if (!res.ok) throw new Error("Failed to load roles");
      const data = await res.json();
      setRoles(data.roles || []);
      setPermissions(data.permissions || []);
      setStats(data.stats || null);
    } catch (err) {
      showMessage("error", "Failed to load roles: " + String(err));
    } finally {
      setLoading(false);
    }
  };

  const loadRoleDetails = async (roleId: number) => {
    try {
      const res = await fetch(`/api/admin/roles/${roleId}`);
      if (!res.ok) throw new Error("Failed to load role details");
      const data = await res.json();
      setEditingRole(data.role);
      setRolePermissions(data.permissions.map((p: Permission) => p.id));
      setRoleUsers(data.users || []);
    } catch (err) {
      showMessage("error", "Failed to load role: " + String(err));
    }
  };

  const handleCreateRole = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch("/api/admin/roles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newRole),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create role");

      showMessage("success", "Role created successfully");
      setShowNewRole(false);
      setNewRole({
        name: "",
        display_name: "",
        description: "",
        color: "#6b7280",
        icon: "user",
        priority: 0,
      });
      loadRoles();
    } catch (err) {
      showMessage("error", String(err));
    }
  };

  const handleUpdateRole = async () => {
    if (!editingRole) return;

    try {
      const res = await fetch(`/api/admin/roles/${editingRole.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          display_name: editingRole.display_name,
          description: editingRole.description,
          color: editingRole.color,
          icon: editingRole.icon,
          priority: editingRole.priority,
          permissions: rolePermissions,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update role");

      showMessage("success", "Role updated successfully");
      loadRoles();
    } catch (err) {
      showMessage("error", String(err));
    }
  };

  const handleDeleteRole = async (roleId: number) => {
    if (!confirm("Are you sure you want to delete this role?")) return;

    try {
      const res = await fetch(`/api/admin/roles/${roleId}`, {
        method: "DELETE",
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to delete role");

      showMessage("success", "Role deleted");
      setEditingRole(null);
      loadRoles();
    } catch (err) {
      showMessage("error", String(err));
    }
  };

  const togglePermission = (permId: number) => {
    if (rolePermissions.includes(permId)) {
      setRolePermissions(rolePermissions.filter((id) => id !== permId));
    } else {
      setRolePermissions([...rolePermissions, permId]);
    }
  };

  const showMessage = (type: "success" | "error", text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 4000);
  };

  const getUserCount = (roleId: number) => {
    return stats?.roles_with_users.find((r) => r.role_id === roleId)?.user_count || 0;
  };

  const permissionsByCategory = permissions.reduce((acc, perm) => {
    if (!acc[perm.category]) acc[perm.category] = [];
    acc[perm.category].push(perm);
    return acc;
  }, {} as Record<string, Permission[]>);

  const iconOptions = [
    { value: "user", label: "User" },
    { value: "shield-check", label: "Shield Check" },
    { value: "shield", label: "Shield" },
    { value: "hand-helping", label: "Hand Helping" },
    { value: "pencil", label: "Pencil" },
    { value: "badge-check", label: "Badge Check" },
    { value: "star", label: "Star" },
    { value: "crown", label: "Crown" },
    { value: "hammer", label: "Hammer" },
    { value: "heart", label: "Heart" },
  ];

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-bg-tertiary rounded w-1/4"></div>
          <div className="h-64 bg-bg-tertiary rounded"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Link
              href="/admin"
              className="text-text-secondary hover:text-white transition-colors"
            >
              Admin
            </Link>
            <span className="text-text-muted">/</span>
            <h1 className="text-3xl font-bold text-text-primary">Roles & Permissions</h1>
          </div>
          <p className="text-text-secondary">
            Manage community roles and their permissions
          </p>
        </div>
        <button
          onClick={() => setShowNewRole(true)}
          className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
        >
          + New Role
        </button>
      </div>

      {/* Message */}
      {message && (
        <div
          className={`mb-6 p-4 rounded-lg ${
            message.type === "success"
              ? "bg-success/20 text-success border border-success/30"
              : "bg-red-500/20 text-red-400 border border-red-500/30"
          }`}
        >
          {message.text}
        </div>
      )}

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-bg-secondary border border-border p-4 rounded-xl">
            <div className="text-2xl font-bold text-white">{stats.total_roles}</div>
            <div className="text-text-secondary text-sm">Total Roles</div>
          </div>
          <div className="bg-bg-secondary border border-border p-4 rounded-xl">
            <div className="text-2xl font-bold text-accent">{stats.total_permissions}</div>
            <div className="text-text-secondary text-sm">Permissions</div>
          </div>
          <div className="bg-bg-secondary border border-border p-4 rounded-xl">
            <div className="text-2xl font-bold text-success">
              {stats.roles_with_users.reduce((sum, r) => sum + r.user_count, 0)}
            </div>
            <div className="text-text-secondary text-sm">Role Assignments</div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="lg:col-span-1 bg-bg-secondary border border-border rounded-xl p-6">
          <h2 className="text-lg font-semibold text-accent mb-4">Roles</h2>
          <div className="space-y-2">
            {roles.map((role) => (
              <button
                key={role.id}
                onClick={() => loadRoleDetails(role.id)}
                className={`w-full text-left p-3 rounded-lg border transition-colors ${
                  editingRole?.id === role.id
                    ? "border-accent bg-accent/10"
                    : "border-transparent bg-white/5 hover:bg-white/10"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: role.color }}
                  />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-white truncate">
                      {role.display_name}
                    </div>
                    <div className="text-text-muted text-sm">
                      {getUserCount(role.id)} users • Priority {role.priority}
                    </div>
                  </div>
                  {role.is_system && (
                    <span className="text-xs px-2 py-0.5 rounded bg-white/10 text-text-secondary">
                      System
                    </span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Role Editor */}
        <div className="lg:col-span-2">
          {editingRole ? (
            <div className="bg-bg-secondary border border-border rounded-xl p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: editingRole.color }}
                  />
                  <h2 className="text-xl font-semibold text-white">
                    {editingRole.display_name}
                  </h2>
                  {editingRole.is_system && (
                    <span className="text-xs px-2 py-0.5 rounded bg-amber-500/20 text-amber-400">
                      System Role
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleUpdateRole}
                    className="px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg text-sm font-medium transition-colors"
                  >
                    Save Changes
                  </button>
                  {!editingRole.is_system && (
                    <button
                      onClick={() => handleDeleteRole(editingRole.id)}
                      className="px-4 py-2 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-lg text-sm transition-colors"
                    >
                      Delete
                    </button>
                  )}
                </div>
              </div>

              {/* Role Properties */}
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Display Name
                  </label>
                  <input
                    type="text"
                    value={editingRole.display_name}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, display_name: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={editingRole.priority}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, priority: parseInt(e.target.value) || 0 })
                    }
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Color
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="color"
                      value={editingRole.color}
                      onChange={(e) =>
                        setEditingRole({ ...editingRole, color: e.target.value })
                      }
                      className="w-12 h-10 rounded cursor-pointer bg-transparent"
                    />
                    <input
                      type="text"
                      value={editingRole.color}
                      onChange={(e) =>
                        setEditingRole({ ...editingRole, color: e.target.value })
                      }
                      className="flex-1 px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Icon
                  </label>
                  <select
                    value={editingRole.icon}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, icon: e.target.value })
                    }
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  >
                    {iconOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="md:col-span-2">
                  <label className="block text-text-secondary text-sm mb-2">
                    Description
                  </label>
                  <textarea
                    value={editingRole.description || ""}
                    onChange={(e) =>
                      setEditingRole({ ...editingRole, description: e.target.value })
                    }
                    rows={2}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                  />
                </div>
              </div>

              {/* Permissions */}
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-white mb-4">Permissions</h3>
                <div className="space-y-4">
                  {Object.entries(permissionsByCategory).map(([category, perms]) => (
                    <div key={category} className="bg-white/5 rounded-lg p-4">
                      <h4 className="text-accent font-medium mb-3 capitalize">{category}</h4>
                      <div className="grid sm:grid-cols-2 gap-2">
                        {perms.map((perm) => (
                          <label
                            key={perm.id}
                            className="flex items-start gap-2 cursor-pointer p-2 rounded hover:bg-white/5"
                          >
                            <input
                              type="checkbox"
                              checked={rolePermissions.includes(perm.id)}
                              onChange={() => togglePermission(perm.id)}
                              className="mt-1 rounded"
                            />
                            <div>
                              <div className="text-white text-sm">{perm.display_name}</div>
                              {perm.description && (
                                <div className="text-text-muted text-xs">{perm.description}</div>
                              )}
                            </div>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Users with this role */}
              {roleUsers.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-white mb-4">
                    Users with this Role ({roleUsers.length})
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {roleUsers.map((user) => (
                      <Link
                        key={user.user_id}
                        href={`/members/${user.user_id}`}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
                      >
                        {user.avatar_url ? (
                          <img
                            src={user.avatar_url}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-accent/30 flex items-center justify-center text-xs">
                            {user.username[0].toUpperCase()}
                          </div>
                        )}
                        <span className="text-white text-sm">
                          {user.display_name || user.username}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-bg-secondary border border-border rounded-xl p-12 text-center">
              <div className="text-text-muted mb-2">Select a role to edit</div>
              <p className="text-text-secondary text-sm">
                Click on a role from the list to view and edit its permissions
              </p>
            </div>
          )}
        </div>
      </div>

      {/* New Role Modal */}
      {showNewRole && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-bg-secondary border border-border rounded-xl w-full max-w-lg p-6">
            <h2 className="text-xl font-bold text-accent mb-4">Create New Role</h2>
            <form onSubmit={handleCreateRole} className="space-y-4">
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Name (lowercase, alphanumeric)
                </label>
                <input
                  type="text"
                  value={newRole.name}
                  onChange={(e) => setNewRole({ ...newRole, name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, "") })}
                  required
                  pattern="[a-z][a-z0-9_]*"
                  placeholder="e.g., event_host"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Display Name
                </label>
                <input
                  type="text"
                  value={newRole.display_name}
                  onChange={(e) => setNewRole({ ...newRole, display_name: e.target.value })}
                  required
                  placeholder="e.g., Event Host"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                />
              </div>
              <div>
                <label className="block text-text-secondary text-sm mb-2">
                  Description
                </label>
                <textarea
                  value={newRole.description}
                  onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                  rows={2}
                  placeholder="What does this role do?"
                  className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Color
                  </label>
                  <input
                    type="color"
                    value={newRole.color}
                    onChange={(e) => setNewRole({ ...newRole, color: e.target.value })}
                    className="w-full h-10 rounded cursor-pointer bg-transparent"
                  />
                </div>
                <div>
                  <label className="block text-text-secondary text-sm mb-2">
                    Priority
                  </label>
                  <input
                    type="number"
                    value={newRole.priority}
                    onChange={(e) => setNewRole({ ...newRole, priority: parseInt(e.target.value) || 0 })}
                    className="w-full px-4 py-2 bg-bg-tertiary border border-border rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-accent"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-accent hover:bg-accent-hover rounded-lg font-medium transition-colors"
                >
                  Create Role
                </button>
                <button
                  type="button"
                  onClick={() => setShowNewRole(false)}
                  className="px-4 py-2 bg-bg-tertiary border border-border hover:bg-white/10 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function RolesPage() {
  return (
    <AdminGuard>
      <RolesContent />
    </AdminGuard>
  );
}
