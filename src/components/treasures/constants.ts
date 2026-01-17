import type {
  TreasureHuntStatus,
  TreasureDifficulty,
  SharedTreasureType,
} from "@/lib/types";

export const DIFFICULTY_LABELS: Record<TreasureDifficulty, { label: string; color: string; radius: string }> = {
  easy: { label: "Easy", color: "bg-success/20 text-success", radius: "15 tiles" },
  challenging: { label: "Challenging", color: "bg-warning/20 text-warning", radius: "10 tiles" },
  difficult: { label: "Difficult", color: "bg-danger/20 text-danger", radius: "5 tiles" },
};

export const STATUS_LABELS: Record<TreasureHuntStatus, { label: string; color: string }> = {
  new: { label: "New Map", color: "bg-accent/20 text-accent" },
  reading: { label: "Reading", color: "bg-info/20 text-info" },
  searching: { label: "Searching", color: "bg-warning/20 text-warning" },
  found: { label: "Found!", color: "bg-success/20 text-success" },
  digging: { label: "Digging", color: "bg-warning/20 text-warning" },
  completed: { label: "Completed", color: "bg-success/20 text-success" },
  abandoned: { label: "Abandoned", color: "bg-text-muted/20 text-text-muted" },
};

export const TREASURE_TYPES: Record<SharedTreasureType, { label: string; icon: string }> = {
  treasure_chest: { label: "Treasure Chest", icon: "📦" },
  rare_spawn: { label: "Rare Spawn", icon: "🦁" },
  unique_item: { label: "Unique Item", icon: "💎" },
  hidden_cache: { label: "Hidden Cache", icon: "🗝️" },
  archaeology: { label: "Archaeology Site", icon: "🏺" },
  other: { label: "Other", icon: "❓" },
};

export const RARITY_COLORS: Record<string, string> = {
  rare: "text-warning",
  supreme: "text-cyan-400",
  fantastic: "text-purple-400",
};

export type TabType = "my-hunts" | "shared-with-me" | "community" | "stats";
export type ModalMode = "create" | "edit" | "loot" | "share" | "share-friend" | "share-options";
