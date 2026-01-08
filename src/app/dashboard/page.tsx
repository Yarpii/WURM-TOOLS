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
  activity: {
    recent_orders: Array<{
      id: number;
      order_type: string;
      item_name: string;
      quantity: number;
      status: string;
      created_at: string;
    }>;
  };
}

const STATUS_COLORS: Record<string, string> = {
  active: "text-green-400 bg-green-500/20",
  completed: "text-blue-400 bg-blue-500/20",
  cancelled: "text-red-400 bg-red-500/20",
  expired: "text-gray-400 bg-gray-500/20",
};

const ORDER_TYPE_ICONS: Record<string, string> = {
  buy: "🛒",
  sell: "💰",
  trade: "🔄",
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
      <span className="text-yellow-400">
        {"★".repeat(Math.floor(rating))}
        {"☆".repeat(5 - Math.floor(rating))}
      </span>
    );
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
        <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-4 text-red-400">
          {error}
        </div>
      </div>
    );
  }

  if (!stats) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header with Profile Summary */}
      <div className="bg-gradient-to-r from-accent/20 to-purple-500/20 rounded-2xl border border-border p-6 mb-8">
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
                    ? "bg-green-500"
                    : stats.profile.completeness >= 60
                    ? "bg-yellow-500"
                    : "bg-red-500"
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
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Link
          href="/market"
          className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-2xl mb-2">🛒</div>
          <div className="text-sm font-medium text-text-primary group-hover:text-accent">New Order</div>
        </Link>
        <Link
          href="/projects"
          className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-2xl mb-2">📋</div>
          <div className="text-sm font-medium text-text-primary group-hover:text-accent">Projects</div>
        </Link>
        <Link
          href="/merchants"
          className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-2xl mb-2">🏪</div>
          <div className="text-sm font-medium text-text-primary group-hover:text-accent">Merchants</div>
        </Link>
        <Link
          href="/crafting"
          className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-2xl mb-2">🔨</div>
          <div className="text-sm font-medium text-text-primary group-hover:text-accent">Crafting</div>
        </Link>
        <Link
          href="/settings"
          className="bg-bg-secondary rounded-lg border border-border p-4 hover:border-accent/50 transition-colors text-center group"
        >
          <div className="text-2xl mb-2">⚙️</div>
          <div className="text-sm font-medium text-text-primary group-hover:text-accent">Settings</div>
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Orders */}
        <div className="bg-bg-secondary rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-text-primary">Market Orders</h3>
            <Link href="/market" className="text-accent text-sm hover:underline">View all</Link>
          </div>
          <div className="text-3xl font-bold text-text-primary mb-2">{stats.orders.total}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-text-muted">Active:</span>
              <span className="text-text-primary font-medium">{stats.orders.active}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
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
          <div className="text-3xl font-bold text-text-primary mb-2">{stats.projects.total}</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
              <span className="text-text-muted">Active:</span>
              <span className="text-text-primary font-medium">{stats.projects.in_progress}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-text-muted">Done:</span>
              <span className="text-text-primary font-medium">{stats.projects.completed}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <span className="text-text-muted">Total items tracked:</span>
              <span className="text-text-primary">{stats.projects.total_items}</span>
            </div>
          </div>
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
              <span className="w-2 h-2 rounded-full bg-green-500"></span>
              <span className="text-text-muted">Complete:</span>
              <span className="text-text-primary font-medium">{stats.trades.completed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-yellow-500"></span>
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

      {/* Activity Feed & Achievements */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-bg-secondary rounded-xl border border-border p-6">
          <h3 className="font-semibold text-text-primary mb-4">Recent Activity</h3>

          {stats.activity.recent_orders.length === 0 ? (
            <div className="text-center py-8 text-text-muted">
              <div className="text-4xl mb-2">📭</div>
              <p>No recent activity</p>
              <p className="text-sm mt-1">Create your first order to get started!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {stats.activity.recent_orders.slice(0, 8).map((order) => (
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
          <div className="bg-gradient-to-r from-accent/20 to-purple-500/20 rounded-lg p-4 mb-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-text-secondary">Level {stats.achievements.level}</span>
              <span className="text-accent font-bold">Level {stats.achievements.level + 1}</span>
            </div>
            <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-accent to-purple-500 transition-all"
                style={{ width: `${Math.min((stats.achievements.total_xp % 1000) / 10, 100)}%` }}
              />
            </div>
            <div className="text-center text-sm text-text-muted mt-2">
              {stats.achievements.total_xp.toLocaleString()} XP Total
            </div>
          </div>

          {/* Achievement Count */}
          <div className="text-center">
            <div className="text-4xl font-bold text-accent mb-1">{stats.achievements.unlocked}</div>
            <div className="text-text-muted">Achievements Unlocked</div>
          </div>

          {/* Alliance Info */}
          {stats.alliances.alliance_name && (
            <div className="mt-6 p-4 bg-bg-tertiary rounded-lg">
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
