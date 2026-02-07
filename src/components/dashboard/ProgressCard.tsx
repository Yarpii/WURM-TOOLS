"use client";

import Link from "next/link";
import { Trophy, Crown, User, Shield } from "lucide-react";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/Skeleton";

interface ProgressCardProps {
  achievements: DashboardStats["achievements"] | null;
  leaderboard: DashboardStats["leaderboard"] | null;
  characters: DashboardStats["characters"] | null;
  alliances: DashboardStats["alliances"] | null;
  loading?: boolean;
}

export function ProgressCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-24 w-full rounded-lg mb-6" />
      <div className="grid grid-cols-2 gap-4 text-center">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-16 w-full" />
      </div>
      <Skeleton className="h-16 w-full rounded-lg mt-6" />
    </div>
  );
}

export default function ProgressCard({ achievements, leaderboard, characters, alliances, loading }: ProgressCardProps) {
  if (loading || !achievements || !leaderboard || !characters || !alliances) return <ProgressCardSkeleton />;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Progress and achievements">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary">Progress</h3>
        <Link href="/achievements" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {/* Level Progress */}
      <div className="bg-gradient-to-r from-accent/20 to-accent/10 rounded-lg p-4 mb-6" role="region" aria-label="Level progress">
        <div className="flex items-center justify-between mb-2">
          <span className="text-text-secondary">Level {achievements.level}</span>
          <span className="text-accent font-bold">Level {achievements.level + 1}</span>
        </div>
        <div
          className="h-3 bg-bg-tertiary rounded-full overflow-hidden"
          role="progressbar"
          aria-valuenow={Math.min((achievements.total_xp % 1000) / 10, 100)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Level progress: ${achievements.total_xp.toLocaleString()} XP`}
        >
          <div
            className="h-full bg-gradient-to-r from-accent to-accent-hover transition-all"
            style={{ width: `${Math.min((achievements.total_xp % 1000) / 10, 100)}%` }}
          />
        </div>
        <div className="text-center text-sm text-text-muted mt-2">
          {achievements.total_xp.toLocaleString()} XP Total
        </div>
      </div>

      {/* Achievement & Leaderboard */}
      <div className="grid grid-cols-2 gap-4 text-center">
        <div role="region" aria-label="Achievements unlocked">
          <div className="text-3xl font-bold text-accent flex items-center justify-center gap-1">
            <Trophy className="w-6 h-6" aria-hidden="true" />
            {achievements.unlocked}
          </div>
          <div className="text-xs text-text-muted">Achievements</div>
        </div>
        <div role="region" aria-label="Leaderboard rank">
          <div className="text-3xl font-bold text-warning">#{leaderboard.rank || "\u2014"}</div>
          <div className="text-xs text-text-muted">
            {leaderboard.total_players > 0 ? `of ${leaderboard.total_players}` : "Rank"}
          </div>
        </div>
      </div>

      {/* Character Info */}
      {characters.main_character ? (
        <Link
          href="/characters"
          className="mt-6 p-4 bg-bg-tertiary rounded-lg block hover:bg-bg-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
          aria-label={`Main character: ${characters.main_character.name} on ${characters.main_character.server}`}
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              {characters.main_character.is_premium ? (
                <Crown className="w-5 h-5 text-warning" aria-hidden="true" />
              ) : (
                <User className="w-5 h-5 text-accent" aria-hidden="true" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium text-text-primary truncate">
                {characters.main_character.name}
              </div>
              <div className="flex items-center gap-2 text-xs text-text-muted">
                <span>{characters.main_character.server}</span>
                {characters.main_character.is_premium && (
                  <span className="text-warning">Premium</span>
                )}
              </div>
            </div>
            {characters.total > 1 && (
              <span className="text-xs text-text-muted">+{characters.total - 1}</span>
            )}
          </div>
        </Link>
      ) : characters.total > 0 ? (
        <Link
          href="/characters"
          className="mt-6 p-4 bg-bg-tertiary rounded-lg block hover:bg-bg-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
          aria-label="Set your main character"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <User className="w-5 h-5 text-accent" aria-hidden="true" />
            </div>
            <div>
              <div className="font-medium text-text-primary">No main set</div>
              <div className="text-sm text-text-muted">
                {characters.total} character{characters.total !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        </Link>
      ) : null}

      {/* Alliance Info */}
      {alliances.alliance_name && (
        <div className="mt-4 p-4 bg-bg-tertiary rounded-lg" role="region" aria-label="Alliance membership">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/20 flex items-center justify-center">
              <Shield className="w-5 h-5 text-accent" aria-hidden="true" />
            </div>
            <div>
              <div className="font-medium text-text-primary">{alliances.alliance_name}</div>
              <div className="text-sm text-text-muted">
                {alliances.is_leader ? "Alliance Leader" : "Member"}
              </div>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
