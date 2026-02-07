"use client";

import Link from "next/link";
import { Star, Shield, Zap } from "lucide-react";
import { DashboardStats } from "./types";
import { formatMemberSince, getInitials } from "./utils";
import { Skeleton } from "@/components/Skeleton";

interface DashboardHeaderProps {
  stats: DashboardStats | null;
  loading?: boolean;
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const empty = 5 - full;
  return (
    <span className="text-warning inline-flex gap-0.5" role="img" aria-label={`${rating} out of 5 stars`}>
      {Array.from({ length: full }, (_, i) => (
        <Star key={`full-${i}`} className="w-3.5 h-3.5 fill-current" />
      ))}
      {Array.from({ length: empty }, (_, i) => (
        <Star key={`empty-${i}`} className="w-3.5 h-3.5" />
      ))}
    </span>
  );
}

export function DashboardHeaderSkeleton() {
  return (
    <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-2xl border border-border p-6 mb-8">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        <Skeleton className="w-20 h-20 rounded-full flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-7 w-64" />
          <Skeleton className="h-4 w-48" />
          <div className="flex gap-4 mt-4">
            <Skeleton className="h-6 w-20" />
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-28" />
          </div>
        </div>
        <div className="w-full md:w-48 space-y-2">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-full rounded-full" />
          <Skeleton className="h-3 w-16" />
        </div>
      </div>
    </div>
  );
}

export default function DashboardHeader({ stats, loading }: DashboardHeaderProps) {
  if (loading || !stats) return <DashboardHeaderSkeleton />;

  return (
    <header className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-2xl border border-border p-6 mb-8" role="banner" aria-label="Dashboard profile summary">
      <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
        {/* Avatar */}
        <div className="w-20 h-20 rounded-full bg-accent/30 flex items-center justify-center text-accent font-bold text-2xl flex-shrink-0 border-2 border-accent/50" aria-hidden="true">
          {stats.profile.avatar_url ? (
            <img
              src={stats.profile.avatar_url}
              alt={`${stats.profile.display_name || stats.profile.username}'s avatar`}
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
              <span className="ml-2 inline-flex items-center gap-1">
                <span aria-hidden="true">•</span>
                <Shield className="w-3.5 h-3.5 text-accent inline" aria-hidden="true" />
                <span className="text-accent">{stats.alliances.alliance_name}</span>
                {stats.alliances.is_leader && " (Leader)"}
              </span>
            )}
          </p>

          {/* Quick Stats Row */}
          <div className="flex flex-wrap gap-4 mt-4" role="list" aria-label="Quick stats">
            <div className="flex items-center gap-2 text-sm" role="listitem">
              <span className="text-text-muted">Level</span>
              <span className="px-2 py-0.5 bg-accent/20 text-accent rounded font-semibold">
                {stats.achievements.level}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm" role="listitem">
              <Zap className="w-3.5 h-3.5 text-warning" aria-hidden="true" />
              <span className="text-text-muted">XP</span>
              <span className="text-text-primary font-semibold">{stats.achievements.total_xp.toLocaleString()}</span>
            </div>
            <div className="flex items-center gap-2 text-sm" role="listitem">
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
        <div className="w-full md:w-48" role="region" aria-label="Profile completeness">
          <div className="text-sm text-text-secondary mb-2">Profile Completeness</div>
          <div className="h-3 bg-bg-tertiary rounded-full overflow-hidden" role="progressbar" aria-valuenow={stats.profile.completeness} aria-valuemin={0} aria-valuemax={100} aria-label={`Profile ${stats.profile.completeness}% complete`}>
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
    </header>
  );
}
