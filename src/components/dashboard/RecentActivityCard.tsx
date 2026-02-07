"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Coins,
  ArrowLeftRight,
  Scroll,
  Search,
  Compass,
  MapPin,
  Pickaxe,
  CheckCircle2,
  XCircle,
  Map,
  Inbox,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardStats } from "./types";
import { formatDate, STATUS_COLORS } from "./utils";
import { Skeleton } from "@/components/Skeleton";

const ORDER_TYPE_ICONS: Record<string, LucideIcon> = {
  buy: ShoppingCart,
  sell: Coins,
  trade: ArrowLeftRight,
};

const HUNT_STATUS_ICONS: Record<string, LucideIcon> = {
  new: Scroll,
  reading: Search,
  searching: Compass,
  found: MapPin,
  digging: Pickaxe,
  completed: CheckCircle2,
  abandoned: XCircle,
};

interface RecentActivityCardProps {
  activity: DashboardStats["activity"] | null;
  loading?: boolean;
}

export function RecentActivityCardSkeleton() {
  return (
    <div className="lg:col-span-2 bg-bg-secondary rounded-xl border border-border p-6">
      <Skeleton className="h-5 w-28 mb-4" />
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function RecentActivityCard({ activity, loading }: RecentActivityCardProps) {
  if (loading || !activity) return <RecentActivityCardSkeleton />;

  const isEmpty = activity.recent_orders.length === 0 && activity.recent_hunts.length === 0;

  return (
    <section className="lg:col-span-2 bg-bg-secondary rounded-xl border border-border p-6" aria-label="Recent activity">
      <h3 className="font-semibold text-text-primary mb-4">Recent Activity</h3>

      {isEmpty ? (
        <div className="text-center py-8">
          <Inbox className="w-12 h-12 text-text-muted/30 mx-auto mb-3" aria-hidden="true" />
          <p className="text-text-muted mb-1">No recent activity</p>
          <p className="text-sm text-text-muted mb-4">Create your first order or treasure hunt!</p>
          <div className="flex justify-center gap-3">
            <Link
              href="/market"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New order
            </Link>
            <span className="text-text-muted" aria-hidden="true">&middot;</span>
            <Link
              href="/treasures"
              className="inline-flex items-center gap-1.5 text-sm text-accent hover:underline"
            >
              <Plus className="w-3.5 h-3.5" aria-hidden="true" />
              New hunt
            </Link>
          </div>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Activity feed">
          {/* Recent Treasure Hunts */}
          {activity.recent_hunts.map((hunt) => {
            const HuntIcon = HUNT_STATUS_ICONS[hunt.status] || Map;
            return (
              <Link
                key={`hunt-${hunt.id}`}
                href="/treasures"
                className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg hover:bg-bg-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
                role="listitem"
                aria-label={`Treasure hunt: ${hunt.name}, status: ${hunt.status}`}
              >
                <HuntIcon className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div>
                    <span className="text-text-primary font-medium">Treasure Hunt</span>
                    <span className="text-text-muted"> - </span>
                    <span className="text-text-secondary truncate">{hunt.name}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="px-2 py-0.5 rounded text-xs bg-accent/20 text-accent">
                    {hunt.status}
                  </span>
                  <span className="text-xs text-text-muted whitespace-nowrap">
                    {formatDate(hunt.updated_at)}
                  </span>
                </div>
              </Link>
            );
          })}

          {/* Recent Orders */}
          {activity.recent_orders.map((order) => {
            const OrderIcon = ORDER_TYPE_ICONS[order.order_type] || ShoppingCart;
            return (
              <div
                key={`order-${order.id}`}
                className="flex items-center gap-4 p-3 bg-bg-tertiary rounded-lg"
                role="listitem"
                aria-label={`${order.order_type} order: ${order.quantity}x ${order.item_name}, status: ${order.status}`}
              >
                <OrderIcon className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
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
                <div className="flex items-center gap-2 flex-shrink-0">
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
            );
          })}
        </div>
      )}
    </section>
  );
}
