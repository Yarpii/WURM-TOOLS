"use client";

import Link from "next/link";
import { ShoppingCart, Plus } from "lucide-react";
import { DashboardStats } from "./types";
import { Skeleton } from "@/components/Skeleton";

interface OrdersCardProps {
  orders: DashboardStats["orders"] | null;
  loading?: boolean;
}

export function OrdersCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-4 w-14" />
      </div>
      <Skeleton className="h-9 w-12 mb-3" />
      <div className="grid grid-cols-2 gap-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  );
}

export default function OrdersCard({ orders, loading }: OrdersCardProps) {
  if (loading || !orders) return <OrdersCardSkeleton />;

  const isEmpty = orders.total === 0;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Market orders summary">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-text-primary flex items-center gap-2">
          <ShoppingCart className="w-4 h-4 text-accent" aria-hidden="true" />
          Market Orders
        </h3>
        <Link href="/market" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-4">
          <ShoppingCart className="w-8 h-8 text-text-muted/50 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No orders yet</p>
          <Link
            href="/market"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Create your first order
          </Link>
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-text-primary mb-2" aria-label={`${orders.total} total orders`}>{orders.total}</div>
          <div className="grid grid-cols-2 gap-2 text-sm" role="list" aria-label="Order breakdown">
            <div className="flex items-center gap-2" role="listitem">
              <span className="w-2 h-2 rounded-full bg-success" aria-hidden="true"></span>
              <span className="text-text-muted">Active:</span>
              <span className="text-text-primary font-medium">{orders.active}</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <span className="w-2 h-2 rounded-full bg-accent" aria-hidden="true"></span>
              <span className="text-text-muted">Done:</span>
              <span className="text-text-primary font-medium">{orders.completed}</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <span className="text-text-muted">Buy:</span>
              <span className="text-text-primary">{orders.buy}</span>
            </div>
            <div className="flex items-center gap-2" role="listitem">
              <span className="text-text-muted">Sell:</span>
              <span className="text-text-primary">{orders.sell}</span>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
