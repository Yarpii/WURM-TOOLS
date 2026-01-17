"use client";

import Link from "next/link";
import { WURM_SERVERS } from "@/lib/constants";
import type {
  TreasureHunt,
  SharedTreasure,
  TreasureStats,
  TreasureDifficulty,
} from "@/lib/types";
import { HuntCard } from "./HuntCard";
import { STATUS_LABELS, DIFFICULTY_LABELS, TREASURE_TYPES } from "./constants";

// ============================================
// MY HUNTS TAB
// ============================================
interface MyHuntsTabProps {
  hunts: TreasureHunt[];
  selectedHunt: TreasureHunt | null;
  loading: boolean;
  filterStatus: string;
  filterServer: string;
  onFilterStatusChange: (status: string) => void;
  onFilterServerChange: (server: string) => void;
  onSelectHunt: (hunt: TreasureHunt) => void;
  onCreateHunt: () => void;
  children: React.ReactNode; // For HuntDetails
}

export function MyHuntsTab({
  hunts,
  selectedHunt,
  loading,
  filterStatus,
  filterServer,
  onFilterStatusChange,
  onFilterServerChange,
  onSelectHunt,
  onCreateHunt,
  children,
}: MyHuntsTabProps) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Hunt List */}
      <div className="lg:col-span-1">
        {/* Filters */}
        <div className="flex gap-2 mb-4">
          <select
            value={filterStatus}
            onChange={(e) => onFilterStatusChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none text-sm"
          >
            <option value="">All Status</option>
            {Object.entries(STATUS_LABELS).map(([key, { label }]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>
          <select
            value={filterServer}
            onChange={(e) => onFilterServerChange(e.target.value)}
            className="flex-1 px-3 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none text-sm"
          >
            <option value="">All Servers</option>
            {WURM_SERVERS.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* Hunt Cards */}
        {loading ? (
          <div className="text-center py-8 text-text-muted">Loading...</div>
        ) : hunts.length === 0 ? (
          <div className="text-center py-8 bg-bg-secondary rounded-lg">
            <p className="text-text-secondary mb-4">No treasure hunts yet.</p>
            <button onClick={onCreateHunt} className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
              Start Your First Hunt
            </button>
          </div>
        ) : (
          <div className="space-y-3 max-h-[600px] overflow-y-auto">
            {hunts.map((hunt) => (
              <HuntCard
                key={hunt.id}
                hunt={hunt}
                isSelected={selectedHunt?.id === hunt.id}
                onClick={() => onSelectHunt(hunt)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Hunt Details */}
      <div className="lg:col-span-2">
        {children}
      </div>
    </div>
  );
}

// ============================================
// SHARED WITH ME TAB
// ============================================
interface SharedWithMeTabProps {
  hunts: (TreasureHunt & { shared_by_username: string })[];
  onSelectHunt: (hunt: TreasureHunt) => void;
}

export function SharedWithMeTab({ hunts, onSelectHunt }: SharedWithMeTabProps) {
  if (hunts.length === 0) {
    return (
      <div className="text-center py-12 bg-bg-secondary rounded-lg">
        <p className="text-text-secondary">No treasure hunts have been shared with you yet.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {hunts.map((hunt) => (
        <div
          key={hunt.id}
          className="p-4 bg-bg-secondary rounded-lg border border-border hover:border-accent cursor-pointer"
          onClick={() => onSelectHunt(hunt)}
        >
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-semibold truncate">{hunt.name}</h3>
            <span className={`px-2 py-0.5 rounded text-xs ${STATUS_LABELS[hunt.status].color}`}>
              {STATUS_LABELS[hunt.status].label}
            </span>
          </div>
          <div className="flex items-center gap-4 text-sm text-text-secondary mb-2">
            <span>{hunt.server}</span>
            <span className={`px-2 py-0.5 rounded text-xs ${DIFFICULTY_LABELS[hunt.difficulty].color}`}>
              {DIFFICULTY_LABELS[hunt.difficulty].label}
            </span>
          </div>
          <div className="text-xs text-info">
            Shared by: {hunt.shared_by_username}
          </div>
          {hunt.x && hunt.y && (
            <div className="text-xs text-text-muted mt-1">
              Location: {hunt.x}, {hunt.y}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================
// COMMUNITY TAB
// ============================================
interface CommunityTabProps {
  treasures: SharedTreasure[];
  serverFilter: string;
  userId?: number;
  onServerFilterChange: (server: string) => void;
  onVote: (treasureId: number, voteType: "up" | "down") => void;
}

export function CommunityTab({
  treasures,
  serverFilter,
  userId,
  onServerFilterChange,
  onVote,
}: CommunityTabProps) {
  return (
    <div>
      <div className="flex gap-2 mb-6">
        <select
          value={serverFilter}
          onChange={(e) => onServerFilterChange(e.target.value)}
          className="px-3 py-2 bg-bg-secondary border border-border rounded focus:border-accent focus:outline-none"
        >
          <option value="">All Servers</option>
          {WURM_SERVERS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {treasures.length === 0 ? (
        <div className="text-center py-12 bg-bg-secondary rounded-lg">
          <p className="text-text-secondary mb-4">No shared treasure locations yet.</p>
          <p className="text-text-muted text-sm">
            Complete a treasure hunt with coordinates to share it with the community.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {treasures.map((treasure) => (
            <div key={treasure.id} className="bg-bg-secondary rounded-lg p-4 border border-border">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <span className="text-2xl mr-2">{TREASURE_TYPES[treasure.treasure_type].icon}</span>
                  <h3 className="font-semibold inline">{treasure.name}</h3>
                </div>
                {treasure.is_verified && (
                  <span className="px-2 py-0.5 bg-success/20 text-success rounded text-xs">Verified</span>
                )}
              </div>
              <p className="text-text-secondary text-sm mb-2">{treasure.server}</p>
              <p className="text-text-muted text-sm mb-3">
                Coordinates: {treasure.x}, {treasure.y}
              </p>
              {treasure.description && (
                <p className="text-sm text-text-secondary mb-3 line-clamp-2">{treasure.description}</p>
              )}
              <div className="flex items-center justify-between">
                <div className="flex gap-2">
                  {userId && (
                    <>
                      <button
                        onClick={() => onVote(treasure.id, "up")}
                        className={`px-2 py-1 rounded text-sm ${
                          treasure.user_vote === "up" ? "bg-success/20 text-success" : "bg-bg-tertiary"
                        }`}
                      >
                        ↑ {treasure.upvotes}
                      </button>
                      <button
                        onClick={() => onVote(treasure.id, "down")}
                        className={`px-2 py-1 rounded text-sm ${
                          treasure.user_vote === "down" ? "bg-danger/20 text-danger" : "bg-bg-tertiary"
                        }`}
                      >
                        ↓ {treasure.downvotes}
                      </button>
                    </>
                  )}
                </div>
                <span className="text-xs text-text-muted">by {treasure.username}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// STATS TAB
// ============================================
interface StatsTabProps {
  stats: TreasureStats;
}

export function StatsTab({ stats }: StatsTabProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <div className="bg-bg-secondary rounded-lg p-6 text-center">
        <div className="text-3xl font-bold text-accent">{stats.total_hunts}</div>
        <div className="text-text-muted">Total Hunts</div>
      </div>
      <div className="bg-bg-secondary rounded-lg p-6 text-center">
        <div className="text-3xl font-bold text-success">{stats.completed_hunts}</div>
        <div className="text-text-muted">Completed</div>
      </div>
      <div className="bg-bg-secondary rounded-lg p-6 text-center">
        <div className="text-3xl font-bold text-warning">{stats.in_progress_hunts}</div>
        <div className="text-text-muted">In Progress</div>
      </div>
      <div className="bg-bg-secondary rounded-lg p-6 text-center">
        <div className="text-3xl font-bold">{stats.total_loot_items}</div>
        <div className="text-text-muted">Items Found</div>
      </div>

      <div className="col-span-2 bg-bg-secondary rounded-lg p-6">
        <h3 className="font-semibold mb-4">By Difficulty</h3>
        <div className="space-y-2">
          {Object.entries(stats.by_difficulty).map(([diff, count]) => (
            <div key={diff} className="flex items-center justify-between">
              <span className={`px-2 py-0.5 rounded text-sm ${DIFFICULTY_LABELS[diff as TreasureDifficulty].color}`}>
                {DIFFICULTY_LABELS[diff as TreasureDifficulty].label}
              </span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="col-span-2 bg-bg-secondary rounded-lg p-6">
        <h3 className="font-semibold mb-4">By Server</h3>
        <div className="space-y-2 max-h-40 overflow-y-auto">
          {Object.entries(stats.by_server).map(([server, count]) => (
            <div key={server} className="flex items-center justify-between">
              <span>{server}</span>
              <span className="font-semibold">{count}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ============================================
// LOGIN PROMPT
// ============================================
export function LoginPrompt() {
  return (
    <div className="text-center py-12 bg-bg-secondary rounded-lg">
      <p className="text-text-secondary mb-4">Please log in to track your treasure hunts.</p>
      <Link href="/login" className="px-4 py-2 bg-accent rounded hover:bg-accent-hover">
        Log In
      </Link>
    </div>
  );
}
