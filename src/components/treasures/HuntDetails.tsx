"use client";

import { useState } from "react";
import type { TreasureHunt, TreasureLoot, TreasureHuntShare } from "@/lib/types";
import { MiniMap } from "@/components/MiniMap";
import { STATUS_LABELS, DIFFICULTY_LABELS, RARITY_COLORS } from "./constants";

interface HuntDetailsProps {
  hunt: TreasureHunt;
  loot: TreasureLoot[];
  childHunts: TreasureHunt[];
  shares: TreasureHuntShare[];
  isOwner: boolean;
  onEdit: () => void;
  onDelete: () => void;
  onShare: () => void;
  onAddLoot: () => void;
  onAddChainedMap: () => void;
  onSelectChildHunt: (hunt: TreasureHunt) => void;
  onRemoveShare: (shareId: number) => void;
  onLocationSelect?: (x: number, y: number) => void;
}

export function HuntDetails({
  hunt,
  loot,
  childHunts,
  shares,
  isOwner,
  onEdit,
  onDelete,
  onShare,
  onAddLoot,
  onAddChainedMap,
  onSelectChildHunt,
  onRemoveShare,
  onLocationSelect,
}: HuntDetailsProps) {
  const [showMiniMap, setShowMiniMap] = useState(false);

  return (
    <div className="bg-bg-secondary rounded-lg p-6">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h2 className="text-2xl font-bold">{hunt.name}</h2>
          <p className="text-text-secondary">{hunt.server}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowMiniMap(!showMiniMap)}
            className={`px-3 py-1 rounded text-sm ${
              showMiniMap
                ? "bg-accent text-white"
                : "bg-accent/20 text-accent hover:bg-accent/30"
            }`}
          >
            {showMiniMap ? "Hide Map" : "Show Map"}
          </button>
          {isOwner && (
            <>
              <button
                onClick={onShare}
                className="px-3 py-1 bg-info/20 text-info rounded hover:bg-info/30 text-sm"
              >
                Share
              </button>
              <button
                onClick={onEdit}
                className="px-3 py-1 bg-bg-tertiary rounded hover:bg-bg-hover text-sm"
              >
                Edit
              </button>
              <button
                onClick={onDelete}
                className="px-3 py-1 bg-danger/20 text-danger rounded hover:bg-danger/30 text-sm"
              >
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Status & Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-bg-tertiary rounded p-3">
          <div className="text-text-muted text-xs">Status</div>
          <div className={`font-semibold ${STATUS_LABELS[hunt.status].color.split(" ")[1]}`}>
            {STATUS_LABELS[hunt.status].label}
          </div>
        </div>
        <div className="bg-bg-tertiary rounded p-3">
          <div className="text-text-muted text-xs">Difficulty</div>
          <div className="font-semibold">{DIFFICULTY_LABELS[hunt.difficulty].label}</div>
          <div className="text-xs text-text-muted">{DIFFICULTY_LABELS[hunt.difficulty].radius}</div>
        </div>
        <div className="bg-bg-tertiary rounded p-3">
          <div className="text-text-muted text-xs">Map QL</div>
          <div className="font-semibold">{hunt.map_quality || "Unknown"}</div>
        </div>
        <div className="bg-bg-tertiary rounded p-3">
          <div className="text-text-muted text-xs">Location</div>
          <div className="font-semibold">
            {hunt.x && hunt.y ? `${hunt.x}, ${hunt.y}` : "Not found yet"}
          </div>
        </div>
      </div>

      {/* Parent Hunt Link */}
      {hunt.parent_hunt_id && hunt.parent_hunt_name && (
        <div className="mb-4 p-3 bg-bg-tertiary rounded-lg">
          <span className="text-text-muted text-sm">Found in chest from: </span>
          <span className="text-accent font-medium">{hunt.parent_hunt_name}</span>
        </div>
      )}

      {/* Description */}
      {hunt.description && (
        <p className="text-text-secondary mb-6">{hunt.description}</p>
      )}

      {/* Screenshot */}
      {hunt.screenshot_url && (
        <div className="mb-6">
          <h3 className="font-semibold mb-2">Screenshot</h3>
          <img
            src={hunt.screenshot_url}
            alt="Treasure map screenshot"
            className="max-w-full rounded-lg border border-border max-h-64 object-contain"
          />
        </div>
      )}

      {/* Mini Map Panel */}
      {showMiniMap && (
        <div className="mb-6 p-4 bg-bg-tertiary rounded-lg">
          <MiniMap
            server={hunt.server}
            markerX={hunt.x || undefined}
            markerY={hunt.y || undefined}
            height={250}
            onLocationSelect={isOwner && onLocationSelect ? onLocationSelect : undefined}
          />
          {isOwner && !hunt.x && !hunt.y && (
            <p className="text-xs text-text-muted mt-2 text-center">
              Click on the map to set the treasure location
            </p>
          )}
        </div>
      )}

      {/* Loot Section */}
      <LootSection
        loot={loot}
        huntStatus={hunt.status}
        onAddLoot={onAddLoot}
        onAddChainedMap={onAddChainedMap}
      />

      {/* Chained Maps Section */}
      {childHunts.length > 0 && (
        <ChainedMapsSection
          childHunts={childHunts}
          onSelectHunt={onSelectChildHunt}
        />
      )}

      {/* Shared With Section */}
      {shares.length > 0 && (
        <SharesSection shares={shares} onRemoveShare={onRemoveShare} />
      )}
    </div>
  );
}

// Loot Section Component
function LootSection({
  loot,
  huntStatus,
  onAddLoot,
  onAddChainedMap,
}: {
  loot: TreasureLoot[];
  huntStatus: string;
  onAddLoot: () => void;
  onAddChainedMap: () => void;
}) {
  return (
    <div className="border-t border-border pt-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Loot ({loot.length})</h3>
        {huntStatus === "completed" && (
          <div className="flex gap-2">
            <button
              onClick={onAddChainedMap}
              className="px-3 py-1 bg-warning/20 text-warning rounded hover:bg-warning/30 text-sm"
            >
              + Map from Chest
            </button>
            <button
              onClick={onAddLoot}
              className="px-3 py-1 bg-accent rounded hover:bg-accent-hover text-sm"
            >
              + Add Loot
            </button>
          </div>
        )}
      </div>

      {loot.length === 0 ? (
        <p className="text-text-muted text-center py-4">
          {huntStatus === "completed"
            ? "No loot recorded yet. Add your finds!"
            : "Complete the hunt to record loot."}
        </p>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {loot.map((item) => (
            <div key={item.id} className="bg-bg-tertiary rounded p-2 text-sm">
              <div className="font-medium">{item.item_name}</div>
              <div className="text-text-muted">
                {item.quantity}x {item.quality && `QL${item.quality}`}
                {item.rarity && (
                  <span className={`ml-1 ${RARITY_COLORS[item.rarity] || ""}`}>
                    ({item.rarity})
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Chained Maps Section Component
function ChainedMapsSection({
  childHunts,
  onSelectHunt,
}: {
  childHunts: TreasureHunt[];
  onSelectHunt: (hunt: TreasureHunt) => void;
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="font-semibold mb-4">Maps Found in This Chest ({childHunts.length})</h3>
      <div className="space-y-2">
        {childHunts.map((child) => (
          <div
            key={child.id}
            onClick={() => onSelectHunt(child)}
            className="p-3 bg-bg-tertiary rounded-lg cursor-pointer hover:bg-bg-hover flex items-center justify-between"
          >
            <div>
              <span className="font-medium">{child.name}</span>
              <span className={`ml-2 px-2 py-0.5 rounded text-xs ${STATUS_LABELS[child.status].color}`}>
                {STATUS_LABELS[child.status].label}
              </span>
            </div>
            <span className={`text-xs ${DIFFICULTY_LABELS[child.difficulty].color}`}>
              {DIFFICULTY_LABELS[child.difficulty].label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Shares Section Component
function SharesSection({
  shares,
  onRemoveShare,
}: {
  shares: TreasureHuntShare[];
  onRemoveShare: (shareId: number) => void;
}) {
  return (
    <div className="border-t border-border pt-4 mt-4">
      <h3 className="font-semibold mb-4">Shared With ({shares.length})</h3>
      <div className="space-y-2">
        {shares.map((share) => (
          <div
            key={share.id}
            className="p-3 bg-bg-tertiary rounded-lg flex items-center justify-between"
          >
            <span className="font-medium">{share.shared_with_username}</span>
            <button
              onClick={() => onRemoveShare(share.id)}
              className="text-danger hover:text-danger/80 text-sm"
            >
              Remove
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
