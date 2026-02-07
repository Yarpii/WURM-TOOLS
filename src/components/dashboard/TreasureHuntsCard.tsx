"use client";

import Link from "next/link";
import { Map, Mail, Plus } from "lucide-react";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/Skeleton";

interface TreasureHuntsCardProps {
  treasures: DashboardStats["treasures"] | null;
  loading?: boolean;
}

export function TreasureHuntsCardSkeleton() {
  return (
    <div className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded" />
          <Skeleton className="h-5 w-28" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="grid grid-cols-4 gap-4 text-center">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i}>
            <Skeleton className="h-8 w-8 mx-auto mb-1" />
            <Skeleton className="h-3 w-14 mx-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

export default function TreasureHuntsCard({ treasures, loading }: TreasureHuntsCardProps) {
  if (loading || !treasures) return <TreasureHuntsCardSkeleton />;

  const isEmpty = treasures.total_hunts === 0 && treasures.shared_with_me === 0;

  return (
    <section className="bg-gradient-to-br from-accent/10 to-accent/5 rounded-xl border border-accent/20 p-6" aria-label="Treasure hunts summary">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Map className="w-6 h-6 text-accent" aria-hidden="true" />
          <h3 className="font-semibold text-text-primary">Treasure Hunts</h3>
        </div>
        <Link href="/treasures" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-4">
          <Map className="w-10 h-10 text-accent/30 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No treasure hunts yet</p>
          <Link
            href="/treasures"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Start your first hunt
          </Link>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-4 gap-4 text-center" role="list" aria-label="Hunt statistics">
            <div role="listitem">
              <div className="text-2xl font-bold text-text-primary">{treasures.total_hunts}</div>
              <div className="text-xs text-text-muted">Total</div>
            </div>
            <div role="listitem">
              <div className="text-2xl font-bold text-warning">{treasures.active_hunts}</div>
              <div className="text-xs text-text-muted">Active</div>
            </div>
            <div role="listitem">
              <div className="text-2xl font-bold text-success">{treasures.completed_hunts}</div>
              <div className="text-xs text-text-muted">Completed</div>
            </div>
            <div role="listitem">
              <div className="text-2xl font-bold text-accent">{treasures.total_loot}</div>
              <div className="text-xs text-text-muted">Loot Items</div>
            </div>
          </div>
          {treasures.shared_with_me > 0 && (
            <div className="mt-4 pt-4 border-t border-accent/20 text-center">
              <span className="text-info text-sm inline-flex items-center gap-1.5">
                <Mail className="w-4 h-4" aria-hidden="true" />
                {treasures.shared_with_me} hunt{treasures.shared_with_me !== 1 ? "s" : ""} shared with you
              </span>
            </div>
          )}
        </>
      )}
    </section>
  );
}
