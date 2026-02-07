"use client";

import Link from "next/link";
import { ArrowLeftRight, Plus } from "lucide-react";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/Skeleton";

interface TradingCardProps {
  trades: DashboardStats["trades"] | null;
  merchants: DashboardStats["merchants"] | null;
  loading?: boolean;
}

export function TradingCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-20" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-9 w-12 mb-3" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full col-span-2" />
      </div>
    </div>
  );
}

export default function TradingCard({ trades, merchants, loading }: TradingCardProps) {
  if (loading || !trades || !merchants) return <TradingCardSkeleton />;

  const isEmpty = trades.total_matches === 0 && merchants.total === 0;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Trading summary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <ArrowLeftRight className="w-4 h-4 text-accent" aria-hidden="true" />
          Trading
        </h3>
        <Link href="/trades" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-4">
          <ArrowLeftRight className="w-8 h-8 text-text-muted/50 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No trades yet</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Start trading
          </Link>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-text-primary mb-2" aria-label={`${trades.total_matches} total trade matches`}>{trades.total_matches}</div>
          <div className="grid grid-cols-2 gap-2 text-sm" role="list" aria-label="Trade breakdown">
            <div className="flex items-center gap-2" role="listitem">
              <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true"></span>
              <span className="text-text-muted">Complete:</span>
              <span className="text-text-primary font-medium">{trades.completed}</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <span className="w-2 h-2 rounded-full bg-warning" aria-hidden="true"></span>
              <span className="text-text-muted">Pending:</span>
              <span className="text-text-primary font-medium">{trades.pending}</span>
            </div>
            <div className="col-span-2 flex items-center gap-2" role="listitem">
              <span className="text-text-muted">Merchants:</span>
              <span className="text-text-primary">
                {merchants.active} active / {merchants.total} total
              </span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
