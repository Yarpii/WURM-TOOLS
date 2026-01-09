"use client";

import { useState, useEffect } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";

interface DashboardStats {
  profile: {
    username: string;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string;
    completeness: number;
    missing_fields: string[];
  };
  orders: {
    total: number;
    active: number;
    completed: number;
    buy: number;
    sell: number;
  };
  projects: {
    total: number;
    in_progress: number;
    completed: number;
    total_items: number;
    active_projects: Array<{
      id: number;
      name: string;
      progress: number;
      item_count: number;
    }>;
  };
  merchants: {
    total: number;
    active: number;
  };
  alliances: {
    member_of: number;
    is_leader: boolean;
    alliance_name: string | null;
  };
  trades: {
    total_matches: number;
    completed: number;
    pending: number;
  };
  reputation: {
    avg_rating: number;
    total_ratings: number;
  };
  achievements: {
    unlocked: number;
    total_xp: number;
    level: number;
  };
  treasures: {
    total_hunts: number;
    active_hunts: number;
    completed_hunts: number;
    shared_with_me: number;
    total_loot: number;
  };
  timers: {
    total: number;
    active: number;
    recent: Array<{
      id: number;
      name: string;
      timer_type: string;
      end_time: string;
    }>;
  };
  characters: {
    total: number;
    main_character: {
      name: string;
      server: string;
      is_premium: boolean;
    } | null;
  };
  leaderboard: {
    rank: number;
    total_players: number;
  };
  skills: {
    total: number;
    at_goal: number;
    closest_to_goal: Array<{
      id: number;
      skill_name: string;
      current_level: number;
      target_level: number;
      progress: number;
    }>;
  };
  events: {
    upcoming: Array<{
      id: number;
      title: string;
      event_type: string;
      start_date: string;
      server: string;
      status: string;
    }>;
  };
  activity: {
    recent_orders: Array<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>;
    recent_hunts: Array<{
      id: number;
      name: string;
      status: string;
      server: string;
      updated_at: string;
    }>;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-success bg-success/20",
  completed: "text-accent bg-accent/20",
  cancelled: "text-danger bg-danger/20",
  expired: "text-text-muted bg-bg-tertiary",
};

const ORDER_TYPE_ICONS: Record<string, string> = {
  buy: "🛒",
  sell: "💰",
  trade: "🔄",
};

const TIMER_TYPE_ICONS: Record<string, string> = {
  sleep_bonus: "💤",
  fatigue: "⚡",
  sermon: "🙏",
  meditation: "🧘",
  custom: "⏰",
};

const EVENT_TYPE_ICONS: Record<string, string> = {
  impalong: "🔨",
  rift: "🌀",
  unique: "🐉",
  sermon: "🙏",
  market: "🛒",
  pvp: "⚔️",
  community: "🎉",
  personal: "📌",
};

const HUNT_STATUS_ICONS: Record<string, string> = {
  new: "📜",
  reading: "🔍",
  searching: "🧭",
  found: "📍",
  digging: "⛏️",
  completed: "✅",
  abandoned: "❌",
};

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        const res = await fetch("/api/dashboard");
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Failed to load dashboard");
          return;
        }

        setStats(data.stats);
      } catch (err) {
        setError("Failed to load dashboard: " + String(err));
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      fetchDashboard();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading]);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
      if (diffHours === 0) {
        const diffMins = Math.floor(diffMs / (1000 * 60));
        return diffMins <= 1 ? "Just now" : `${diffMins}m ago`;
      }
      return `${diffHours}h ago`;
    }
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const formatMemberSince = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", { month: "long", year: "numeric" });
  };

  const getInitials = (name: string) => {
    return name.slice(0, 2).toUpperCase();
  };

  const renderStars = (rating: number) => {
    return (
      <span className="text-warning">
        {"★".repeat(Math.floor(rating))}
        {"☆".repeat(5 - Math.floor(rating))}
      </span>
    );
  };

  const formatTimerRemaining = (endTime: string) => {
    const end = new Date(endTime);
    const now = new Date();
    const diffMs = end.getTime() - now.getTime();

    if (diffMs <= 0) return "Expired";

    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    return `${hours}h ${minutes}m`;
  };

  const formatEventDate = (dateStr: string) => {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Tomorrow";
    if (diffDays < 7) return `In ${diffDays} days`;
    return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  if (!authLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Login Required</h2>
          <p className="text-text-muted mb-6">Please login to access your dashboard.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="text-center py-12 text-text-muted">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-danger/20 border border-danger/50 rounded-lg p-4 text-danger">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with Profile Summary */}
      <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-2xl border border-border p-6 mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
          {/* Avatar */}
          <div className="w-20 h-20 rounded-full bg-accent/30 flex items-center justify-center text-accent font-bold text-2xl flex-shrink-0 border-2 border-accent/50">
            {stats.profile.avatar_url ? (
              <img
                src={stats.profile.avatar_url}
                alt={stats.profile.display_name || stats.profile.username}
                className="w-full h-full rounded-full object-cover"
              />
            ) : (
              getInitials(stats.profile.display_name || stats.profile.username)
            )}
          </div>

          {/* Info */}
          <div className="flex-1">
            <h1 className="text-2xl font-bold text-text-primary mb-1">
              Welcome back, {stats.profile.display_name || stats.profile.username}!
            </h1>
            <p className="text-text-secondary">
              Member since {formatMemberSince(stats.profile.created_at)}
              {stats.alliances.alliance_name && (
                <span className="ml-2">
                  • <span className="text-accent">{stats.alliances.alliance_name}</span>
                  {stats.alliances.is_leader && " (Leader)"}
                </span>
              )}
            </p>

            {/* Quick Stats Row */}
            <div className="flex flex-wrap gap-4 mt-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-muted">Level</span>
                <span className="px-2 py-0.5 bg-accent/20 text-accent rounded font-semibold">
                  {stats.achievements.level}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-muted">XP</span>
                <span className="text-text-primary font-semibold">{stats.achievements.total_xp.toLocaleString()}</span>
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-text-muted">Reputation</span>
                {stats.reputation.total_ratings > 0 ? (
                  <span className="flex items-center gap-1">
                    {renderStars(stats.reputation.avg_rating)}
                    <span className="text-text-secondary">({stats.reputation.total_ratings})</span>
                  </span>
                ) : (
                  <span className="text-text-muted">No ratings yet</span>
                )}
              </div>
            </div>
          </div>

          {/* Profile Completeness */}
          <div className="w-full md:w-48">
            <div className="text-sm text-text-secondary mb-2">Profile Completeness</div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className={`h-full transition-all ${
                  stats.profile.completeness === 100
                    ? "bg-success"
                    : stats.profile.completeness >= 60
                    ? "bg-warning"
                    : "bg-danger"
                }`}
                style={{ width: `${stats.profile.completeness}%` }}
              />
            </div>
            <div className="flex justify-between text-xs mt-1">
              <span className="text-text-muted">{stats.profile.completeness}%</span>
              {stats.profile.missing_fields.length > 0 && (
                <Link href="/settings" className="text-accent hover:underline">
                  Complete profile
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
        <Link
          href="/market"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">🛒</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Market</div>
        </Link>
        <Link
          href="/treasures"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">🗺️</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Treasures</div>
        </Link>
        <Link
          href="/timers"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">⏱️</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Timers</div>
        </Link>
        <Link
          href="/projects"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">📋</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Projects</div>
        </Link>
        <Link
          href="/crafting"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">🔨</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Crafting</div>
        </Link>
        <Link
          href="/characters"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">👤</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Characters</div>
        </Link>
        <Link
          href="/settings"
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-xl mb-1">⚙️</div>
          <div className="text-xs font-medium text-text-primary group-hover:text-accent">Settings</div>
        </Link>
      </div>

      {/* Stats Grid - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">
        {/* Orders */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Market Orders</h3>
            <Link href="/market" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          <div className="text-3xl font-bold text-text-primary mb-2">{stats.orders.total}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-text-muted">Active:</span>
              <span className="text-text-primary font-medium">{stats.orders.active}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-accent"></span>
              <span className="text-text-muted">Done:</span>
              <span className="text-text-primary font-medium">{stats.orders.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Buy:</span>
              <span className="text-text-primary">{stats.orders.buy}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-text-muted">Sell:</span>
              <span className="text-text-primary">{stats.orders.sell}</span>
            </div>
          </div>
        </div>

        {/* Projects */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Projects</h3>
            <Link href="/projects" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          <div className="flex items-center gap-4 mb-3">
            <div className="text-3xl font-bold text-text-primary">{stats.projects.in_progress}</div>
            <div className="text-sm text-text-muted">active</div>
          </div>
          {stats.projects.active_projects.length > 0 ? (
            <div className="space-y-2">
              {stats.projects.active_projects.slice(0, 2).map((project) => (
                <div key={project.id} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-text-primary truncate">{project.name}</span>
                    <span className="text-text-muted">{project.progress}%</span>
                  </div>
                  <div className="h-1.5 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-accent transition-all"
                      style={{ width: `${project.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-text-muted">
              {stats.projects.completed} completed • {stats.projects.total_items} items
            </div>
          )}
        </div>

        {/* Trades & Reputation */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Trading</h3>
            <Link href="/trades" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          <div className="text-3xl font-bold text-text-primary mb-2">{stats.trades.total_matches}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-success"></span>
              <span className="text-text-muted">Complete:</span>
              <span className="text-text-primary font-medium">{stats.trades.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-warning"></span>
              <span className="text-text-muted">Pending:</span>
              <span className="text-text-primary font-medium">{stats.trades.pending}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-text-muted">Merchants:</span>
              <span className="text-text-primary">
                {stats.merchants.active} active / {stats.merchants.total} total
              </span>
            </div>
          </div>
        </div>

      </div>

      {/* Treasure Hunts - Featured Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🗺️</span>
              <h3 className="font-semibold text-text-primary">Treasure Hunts</h3>
            </div>
            <Link href="/treasures" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-text-primary">{stats.treasures.total_hunts}</div>
              <div className="text-xs text-text-muted">Total</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-warning">{stats.treasures.active_hunts}</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-success">{stats.treasures.completed_hunts}</div>
              <div className="text-xs text-text-muted">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-accent">{stats.treasures.total_loot}</div>
              <div className="text-xs text-text-muted">Loot Items</div>
            </div>
          </div>
          {stats.treasures.shared_with_me > 0 && (
            <div className="mt-4 pt-4 border-t border-accent/20 text-center">
              <span className="text-info text-sm">📨 {stats.treasures.shared_with_me} hunt{stats.treasures.shared_with_me !== 1 ? 's' : ''} shared with you</span>
            </div>
          )}
        </div>

        {/* Active Timers Summary */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">⏱️</span>
              <h3 className="font-semibold text-text-primary">Timers</h3>
            </div>
            <Link href="/timers" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          {stats.timers.active > 0 ? (
            <div className="space-y-3">
              <div className="text-center mb-4">
                <div className="text-2xl font-bold text-warning">{stats.timers.active}</div>
                <div className="text-xs text-text-muted">Active Timers</div>
              </div>
              {stats.timers.recent.slice(0, 2).map((timer) => (
                <div key={timer.id} className="p-3 bg-bg-tertiary rounded-lg flex items-center gap-3">
                  <span className="text-lg">{TIMER_TYPE_ICONS[timer.timer_type] || "⏰"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{timer.name}</div>
                    <div className="text-xs text-warning">{formatTimerRemaining(timer.end_time)}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-muted">
              <div className="text-3xl mb-2">😴</div>
              <p className="text-sm">No active timers</p>
              <Link href="/timers" className="text-accent text-xs hover:underline mt-2 inline-block">
                Create a timer
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Skills & Events Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Skills Progress */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📊</span>
              <h3 className="font-semibold text-text-primary">Skill Progress</h3>
            </div>
            <Link href="/skills" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          {stats.skills.closest_to_goal.length > 0 ? (
            <div className="space-y-3">
              <div className="flex justify-between text-sm text-text-muted mb-2">
                <span>{stats.skills.at_goal} at goal</span>
                <span>{stats.skills.total} tracking</span>
              </div>
              {stats.skills.closest_to_goal.map((skill) => (
                <div key={skill.id} className="space-y-1">
                  <div className="flex justify-between text-sm">
                    <span className="text-text-primary font-medium">{skill.skill_name}</span>
                    <span className="text-text-muted">
                      {skill.current_level.toFixed(1)} → {skill.target_level}
                    </span>
                  </div>
                  <div className="h-2 bg-bg-tertiary rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all"
                      style={{ width: `${skill.progress}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-muted">
              <div className="text-3xl mb-2">🎯</div>
              <p className="text-sm">No skill goals set</p>
              <Link href="/skills" className="text-accent text-xs hover:underline mt-2 inline-block">
                Track your skills
              </Link>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📅</span>
              <h3 className="font-semibold text-text-primary">Upcoming Events</h3>
            </div>
            <Link href="/events" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          {stats.events.upcoming.length > 0 ? (
            <div className="space-y-3">
              {stats.events.upcoming.map((event) => (
                <Link
                  key={event.id}
                  href={`/events?id=${event.id}`}
                  className="p-3 bg-bg-tertiary rounded-lg flex items-center gap-3 hover:bg-bg-hover transition-colors"
                >
                  <span className="text-xl">{EVENT_TYPE_ICONS[event.event_type] || "📌"}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-text-primary truncate">{event.title}</div>
                    <div className="flex items-center gap-2 text-xs text-text-muted">
                      <span>{formatEventDate(event.start_date)}</span>
                      <span>•</span>
                      <span>{event.server}</span>
                      {event.status === "maybe" && (
                        <span className="text-warning">(maybe)</span>
                      )}
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-6 text-text-muted">
              <div className="text-3xl mb-2">🎉</div>
              <p className="text-sm">No upcoming events</p>
              <Link href="/events" className="text-accent text-xs hover:underline mt-2 inline-block">
                Browse events
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Activity Feed & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-bg-secondary rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Recent Activity</h3>

          {stats.activity.recent_orders.length === 0 && stats.activity.recent_hunts.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-2">📭</div>
              <p>No recent activity</p>
              <p className="text-sm mt-1">Create your first order or treasure hunt!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Recent Treasure Hunts */}
              {stats.activity.recent_hunts.length > 0 && (
                <>
                  {stats.activity.recent_hunts.map((hunt) => (
                    <Link
                      key={`hunt-${hunt.id}`}
                      href="/treasures"
                      className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors"
                    >
                      <div className="text-xl">
                        {HUNT_STATUS_ICONS[hunt.status] || "🗺️"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div>
                          <span className="text-text-primary font-medium">Treasure Hunt</span>
                          <span className="text-text-muted"> - </span>
                          <span className="text-text-secondary truncate">{hunt.name}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-xs bg-accent/20 text-accent">
                          {hunt.status}
                        </span>
                        <span className="text-xs text-text-muted whitespace-nowrap">
                          {formatDate(hunt.updated_at)}
                        </span>
                      </div>
                    </Link>
                  ))}
                </>
              )}

              {/* Recent Orders */}
              {stats.activity.recent_orders.map((order) => (
                <div
                  key={`order-${order.id}`}
                  className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg"
                >
                  <div className="text-xl">
                    {ORDER_TYPE_ICONS[order.order_type]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div>
                      <span className="text-text-primary font-medium">
                        {order.order_type.charAt(0).toUpperCase() + order.order_type.slice(1)} order
                      </span>
                      <span className="text-text-muted"> - </span>
                      <span className="text-text-secondary">
                        {order.quantity}x {order.item_name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-xs ${
                        STATUS_COLORS[order.status] || "text-gray-400 bg-gray-500/20"
                      }`}
                    >
                      {order.status}
                    </span>
                    <span className="text-xs text-text-muted whitespace-nowrap">
                      {formatDate(order.created_at)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Achievements & Level */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Progress</h3>
            <Link href="/achievements" className="text-accent text-sm hover:underline">View all</Link>
          </div>

          {/* Level Progress */}
          <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary">Level {stats.achievements.level}</span>
              <span className="text-accent font-bold">Level {stats.achievements.level + 1}</span>
            </div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all"
                style={{ width: `${Math.min((stats.achievements.total_xp % 1000) / 10, 100)}%` }}
              />
            </div>
            <div className="text-center text-sm text-text-muted mt-2">
              {stats.achievements.total_xp.toLocaleString()} XP Total
            </div>
          </div>

          {/* Achievement & Leaderboard */}
          <div className="grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-3xl font-bold text-accent">{stats.achievements.unlocked}</div>
              <div className="text-xs text-text-muted">Achievements</div>
            </div>
            <div>
              <div className="text-3xl font-bold text-warning">#{stats.leaderboard.rank || "—"}</div>
              <div className="text-xs text-text-muted">
                {stats.leaderboard.total_players > 0 ? `of ${stats.leaderboard.total_players}` : "Rank"}
              </div>
            </div>
          </div>

          {/* Character Info */}
          {stats.characters.main_character ? (
            <Link href="/characters" className="mt-6 p-4 bg-bg-tertiary rounded-lg block hover:bg-bg-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-lg">
                  {stats.characters.main_character.is_premium ? "👑" : "👤"}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-text-primary truncate">
                    {stats.characters.main_character.name}
                  </div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{stats.characters.main_character.server}</span>
                    {stats.characters.main_character.is_premium && (
                      <span className="text-warning">Premium</span>
                    )}
                  </div>
                </div>
                {stats.characters.total > 1 && (
                  <span className="text-xs text-text-muted">+{stats.characters.total - 1}</span>
                )}
              </div>
            </Link>
          ) : stats.characters.total > 0 ? (
            <Link href="/characters" className="mt-6 p-4 bg-bg-tertiary rounded-lg block hover:bg-bg-hover transition-colors">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  👤
                </div>
                <div>
                  <div className="font-medium text-text-primary">No main set</div>
                  <div className="text-sm text-text-muted">
                    {stats.characters.total} character{stats.characters.total !== 1 ? "s" : ""}
                  </div>
                </div>
              </div>
            </Link>
          ) : null}

          {/* Alliance Info */}
          {stats.alliances.alliance_name && (
            <div className="mt-4 p-4 bg-bg-tertiary rounded-lg">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center text-accent">
                  🛡️
                </div>
                <div>
                  <div className="font-medium text-text-primary">{stats.alliances.alliance_name}</div>
                  <div className="text-sm text-text-muted">
                    {stats.alliances.is_leader ? "Alliance Leader" : "Member"}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
