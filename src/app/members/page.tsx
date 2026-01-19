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

      {/* Feature Sections */}
      {/* Meet the Community */}
      <div className="mt-16 mb-12">
        <h2 className="text-2xl font-bold text-text-primary mb-6 text-center">
          Meet the Wurm Community
        </h2>
        <div className="grid md:grid-cols-3 gap-6">
          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-lime-500/20 to-green-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
            <div className="relative bg-bg-secondary/80 backdrop-blur-sm rounded-xl p-6 border border-lime-500/20 hover:border-lime-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-lime-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Browse Players</h3>
              <p className="text-text-secondary text-sm">
                Discover active players across all servers. Search by name or filter by server to find fellow adventurers.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/20 to-emerald-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
            <div className="relative bg-bg-secondary/80 backdrop-blur-sm rounded-xl p-6 border border-green-500/20 hover:border-green-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Connect & Trade</h3>
              <p className="text-text-secondary text-sm">
                Find crafters, merchants, and neighbors. Build relationships with trusted community members for future trades.
              </p>
            </div>
          </div>

          <div className="relative group">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/20 to-teal-500/20 rounded-xl blur-xl group-hover:blur-2xl transition-all duration-300 opacity-50" />
            <div className="relative bg-bg-secondary/80 backdrop-blur-sm rounded-xl p-6 border border-emerald-500/20 hover:border-emerald-500/40 transition-all duration-300">
              <div className="w-12 h-12 rounded-lg bg-emerald-500/20 flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-text-primary mb-2">Build Your Profile</h3>
              <p className="text-text-secondary text-sm">
                Showcase your skills and achievements. Let others know what you craft, trade, or specialize in.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Community Benefits */}
      <div className="mb-12 bg-gradient-to-br from-lime-500/5 to-green-500/5 rounded-xl p-8 border border-lime-500/10">
        <h2 className="text-xl font-bold text-text-primary mb-6 flex items-center gap-2">
          <svg className="w-6 h-6 text-lime-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          Why Join the Community?
        </h2>
        <div className="grid md:grid-cols-2 gap-4">
          {[
            "Find trusted traders and crafters on your server",
            "Discover alliance members for group activities",
            "Connect with experienced players for advice",
            "Build your reputation in the community",
            "Showcase your deeds and achievements",
            "Network for impalongs and events",
          ].map((benefit, i) => (
            <div key={i} className="flex items-start gap-3">
              <svg className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
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
            href="/alliances"
            className="group bg-bg-secondary hover:bg-bg-tertiary rounded-lg p-5 border border-border hover:border-indigo-500/50 transition-all duration-300"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h3 className="font-semibold text-text-primary group-hover:text-indigo-400 transition-colors">Alliances</h3>
            </div>
            <p className="text-sm text-text-muted">Join or create alliances to work together with other players</p>
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
            <p className="text-sm text-text-muted">Find player merchants and browse their wares</p>
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
            <p className="text-sm text-text-muted">Discover community events, impalongs, and rifts</p>
          </Link>
        </div>
      </div>

      {/* CTA Section */}
      <div className="text-center bg-gradient-to-r from-lime-500/10 via-green-500/10 to-emerald-500/10 rounded-xl p-8 border border-lime-500/20">
        <h2 className="text-2xl font-bold text-text-primary mb-3">Ready to Stand Out?</h2>
        <p className="text-text-secondary mb-6 max-w-2xl mx-auto">
          Make your profile visible to the community. Showcase your skills, find trading partners, and connect with fellow adventurers.
        </p>
        <Link
          href="/settings"
          className="inline-flex items-center gap-2 px-6 py-3 bg-lime-600 hover:bg-lime-500 text-white font-semibold rounded-lg transition-all duration-300 hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Update Profile Settings
        </Link>
      </div>
    </div>
  );
}
