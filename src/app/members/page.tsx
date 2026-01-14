"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RoleBadge } from "@/components/RoleBadge";

interface UserRole {
  role_name: string;
  role_display_name: string;
  role_color: string;
  role_icon?: string;
  role_priority: number;
}

interface PublicMember {
  id: number;
  username: string;
  display_name?: string;
  avatar_url?: string;
  wurm_server?: string;
  location?: string;
  created_at: string;
  primary_role?: UserRole;
}

export default function MembersPage() {
  const [members, setMembers] = useState<PublicMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterServer, setFilterServer] = useState("all");

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("/api/members");
        const data = await res.json();
        setMembers(data.members || []);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, []);

  // Get unique servers
  const servers = [...new Set(members.map((m) => m.wurm_server).filter(Boolean))];

  // Filter members
  const filteredMembers = members.filter((member) => {
    const matchesSearch =
      !searchQuery ||
      member.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.display_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesServer =
      filterServer === "all" || member.wurm_server === filterServer;
    return matchesSearch && matchesServer;
  });

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short",
      year: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-text-primary mb-2">Community Members</h1>
        <p className="text-text-secondary">
          Browse community members who have opted to be visible. Want to appear here?{" "}
          <Link href="/settings" className="text-accent hover:text-accent-hover">
            Update your settings
          </Link>
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-8">
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-text-primary">{members.length}</div>
          <div className="text-sm text-text-muted">Visible Members</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center">
          <div className="text-2xl font-bold text-accent">{servers.length}</div>
          <div className="text-sm text-text-muted">Active Servers</div>
        </div>
        <div className="bg-bg-secondary rounded-lg border border-border p-4 text-center col-span-2 sm:col-span-1">
          <div className="text-2xl font-bold text-success">{filteredMembers.length}</div>
          <div className="text-sm text-text-muted">Showing</div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-6">
        <input
          type="text"
          placeholder="Search by name..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 min-w-[200px] px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
        />
        <select
          value={filterServer}
          onChange={(e) => setFilterServer(e.target.value)}
          className="px-4 py-2 bg-bg-tertiary rounded-lg text-text-primary border border-border focus:border-accent focus:outline-none"
        >
          <option value="all">All Servers</option>
          {servers.map((server) => (
            <option key={server} value={server}>
              {server}
            </option>
          ))}
        </select>
      </div>

      {/* Members List */}
      {loading ? (
        <div className="text-center py-12 text-text-muted">Loading members...</div>
      ) : filteredMembers.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-text-muted mb-2">No members found</div>
          <p className="text-sm text-text-muted">
            {searchQuery || filterServer !== "all"
              ? "Try adjusting your filters"
              : "Be the first to make your profile visible!"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredMembers.map((member) => (
            <Link
              key={member.id}
              href={`/members/${member.id}`}
              className="bg-bg-secondary rounded-lg border border-border hover:border-accent/50 transition-colors p-5 group"
            >
              <div className="flex items-center gap-4">
                {/* Avatar */}
                <div className="w-14 h-14 rounded-full bg-accent/20 flex items-center justify-center text-accent font-bold text-lg flex-shrink-0">
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
                    <h3 className="font-semibold text-text-primary group-hover:text-accent transition-colors truncate">
                      {member.display_name || member.username}
                    </h3>
                    {member.primary_role && member.primary_role.role_name !== "member" && (
                      <RoleBadge
                        name={member.primary_role.role_name}
                        displayName={member.primary_role.role_display_name}
                        color={member.primary_role.role_color}
                        icon={member.primary_role.role_icon}
                        size="sm"
                        showIcon={false}
                      />
                    )}
                  </div>
                  {member.display_name && (
                    <p className="text-sm text-text-muted truncate">@{member.username}</p>
                  )}
                  <div className="flex items-center gap-2 mt-1 text-xs text-text-muted">
                    {member.wurm_server && (
                      <span className="px-2 py-0.5 bg-accent/10 text-accent rounded">
                        {member.wurm_server}
                      </span>
                    )}
                    {member.location && (
                      <span className="truncate">{member.location}</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-border/50 text-xs text-text-muted">
                Member since {formatDate(member.created_at)}
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
