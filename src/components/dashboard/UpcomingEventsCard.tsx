"use client";

import Link from "next/link";
import {
  Calendar,
  Hammer,
  Sparkles,
  Shield,
  Church,
  ShoppingCart,
  Swords,
  PartyPopper,
  Pin,
  Plus,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { DashboardStats } from "./types";
import { formatEventDate } from "./utils";
import { Skeleton } from "@/components/Skeleton";

const EVENT_TYPE_ICONS: Record<string, LucideIcon> = {
  impalong: Hammer,
  rift: Sparkles,
  unique: Shield,
  sermon: Church,
  market: ShoppingCart,
  pvp: Swords,
  community: PartyPopper,
  personal: Pin,
};

interface UpcomingEventsCardProps {
  events: DashboardStats["events"] | null;
  loading?: boolean;
}

export function UpcomingEventsCardSkeleton() {
  return (
    <div className="bg-bg-secondary rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Skeleton className="w-7 h-7 rounded" />
          <Skeleton className="h-5 w-32" />
        </div>
        <Skeleton className="h-4 w-14" />
      </div>
      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-lg" />
        ))}
      </div>
    </div>
  );
}

export default function UpcomingEventsCard({ events, loading }: UpcomingEventsCardProps) {
  if (loading || !events) return <UpcomingEventsCardSkeleton />;

  const isEmpty = events.upcoming.length === 0;

  return (
    <section className="bg-bg-secondary rounded-xl border border-border p-6" aria-label="Upcoming events">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Calendar className="w-6 h-6 text-accent" aria-hidden="true" />
          <h3 className="font-semibold text-text-primary">Upcoming Events</h3>
        </div>
        <Link href="/events" className="text-accent text-sm hover:underline">View all</Link>
      </div>

      {isEmpty ? (
        <div className="text-center py-6">
          <PartyPopper className="w-10 h-10 text-text-muted/30 mx-auto mb-2" aria-hidden="true" />
          <p className="text-sm text-text-muted mb-3">No upcoming events</p>
          <Link
            href="/events"
            className="inline-flex items-center gap-1.5 text-xs text-accent hover:underline"
          >
            <Plus className="w-3.5 h-3.5" aria-hidden="true" />
            Browse events
          </Link>
        </div>
      ) : (
        <div className="space-y-3" role="list" aria-label="Event list">
          {events.upcoming.map((event) => {
            const EventIcon = EVENT_TYPE_ICONS[event.event_type] || Pin;
            return (
              <Link
                key={event.id}
                href={`/events?id=${event.id}`}
                className="p-3 bg-bg-tertiary rounded-lg flex items-center gap-3 hover:bg-bg-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-secondary"
                role="listitem"
                aria-label={`${event.title} - ${formatEventDate(event.start_date)} on ${event.server}`}
              >
                <EventIcon className="w-5 h-5 text-accent flex-shrink-0" aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-text-primary truncate">{event.title}</div>
                  <div className="flex items-center gap-2 text-xs text-text-muted">
                    <span>{formatEventDate(event.start_date)}</span>
                    <span aria-hidden="true">&middot;</span>
                    <span>{event.server}</span>
                    {event.status === "maybe" && (
                      <span className="text-warning">(maybe)</span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
