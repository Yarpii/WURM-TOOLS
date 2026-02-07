"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/components/AuthProvider";
import Link from "next/link";
import { RefreshCw } from "lucide-react";
import type { DashboardStats } from "@/components/dashboard/types";
import {
  DashboardHeader,
  QuickActions,
  OrdersCard,
  ProjectsCard,
  TradingCard,
  TreasureHuntsCard,
  TimersCard,
  SkillProgressCard,
  UpcomingEventsCard,
  RecentActivityCard,
  ProgressCard,
} from "@/components/dashboard";

export default function DashboardPage() {
  const { user, loading: authLoading } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const fetchDashboard = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    setError("");

    try {
      const res = await fetch("/api/dashboard");
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to load dashboard");
        return;
      }

      setStats(data.stats);
      setLastRefreshed(new Date());
    } catch (err) {
      setError("Failed to load dashboard: " + String(err));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (user) {
      fetchDashboard();
    } else if (!authLoading) {
      setLoading(false);
    }
  }, [user, authLoading, fetchDashboard]);

  if (!authLoading && !user) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-bg-secondary rounded-xl border border-border p-8 text-center" role="alert">
          <h2 className="text-xl font-semibold text-text-primary mb-2">Login Required</h2>
          <p className="text-text-muted mb-6">Please login to access your dashboard.</p>
          <Link
            href="/login"
            className="inline-block px-6 py-2 bg-accent text-white rounded-lg hover:bg-accent-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
          >
            Login
          </Link>
        </div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-danger/20 border border-danger/50 rounded-lg p-4 text-danger" role="alert">
          <p>{error}</p>
          <button
            onClick={() => fetchDashboard()}
            className="mt-3 text-sm underline hover:no-underline focus:outline-none focus:ring-2 focus:ring-danger rounded"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <main className="max-w-7xl mx-auto px-4 py-8" aria-label="Dashboard">
      {/* Refresh Bar */}
      <div className="flex items-center justify-end mb-2 gap-3">
        {error && (
          <span className="text-xs text-danger" role="alert">{error}</span>
        )}
        {lastRefreshed && !loading && (
          <span className="text-xs text-text-muted">
            Updated {lastRefreshed.toLocaleTimeString()}
          </span>
        )}
        <button
          onClick={() => fetchDashboard(true)}
          disabled={refreshing || loading}
          className="inline-flex items-center gap-1.5 text-xs text-text-secondary hover:text-accent disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-accent rounded px-2 py-1"
          aria-label="Refresh dashboard data"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} aria-hidden="true" />
          {refreshing ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {/* Header with Profile Summary */}
      <DashboardHeader stats={stats} loading={loading} />

      {/* Quick Actions */}
      <QuickActions loading={loading} />

      {/* Stats Grid - Row 1 */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-6">
        <OrdersCard orders={stats?.orders ?? null} loading={loading} />
        <ProjectsCard projects={stats?.projects ?? null} loading={loading} />
        <TradingCard trades={stats?.trades ?? null} merchants={stats?.merchants ?? null} loading={loading} />
      </div>

      {/* Treasure Hunts & Timers - Featured Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <TreasureHuntsCard treasures={stats?.treasures ?? null} loading={loading} />
        <TimersCard timers={stats?.timers ?? null} loading={loading} />
      </div>

      {/* Skills & Events Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <SkillProgressCard skills={stats?.skills ?? null} loading={loading} />
        <UpcomingEventsCard events={stats?.events ?? null} loading={loading} />
      </div>

      {/* Activity Feed & Progress */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RecentActivityCard activity={stats?.activity ?? null} loading={loading} />
        <ProgressCard
          achievements={stats?.achievements ?? null}
          leaderboard={stats?.leaderboard ?? null}
          characters={stats?.characters ?? null}
          alliances={stats?.alliances ?? null}
          loading={loading}
        />
      </div>
    </main>
  );
}
