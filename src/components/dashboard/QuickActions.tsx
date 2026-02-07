"use client";

import Link from "next/link";
import {
  ShoppingCart,
  Map,
  Timer,
  ClipboardList,
  Hammer,
  User,
  Settings,
} from "lucide-react";
import { Skeleton } from "@/components/Skeleton";

const QUICK_ACTIONS = [
  { href: "/market", label: "Market", icon: ShoppingCart },
  { href: "/treasures", label: "Treasures", icon: Map },
  { href: "/timers", label: "Timers", icon: Timer },
  { href: "/projects", label: "Projects", icon: ClipboardList },
  { href: "/crafting", label: "Crafting", icon: Hammer },
  { href: "/characters", label: "Characters", icon: User },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function QuickActionsSkeleton() {
  return (
    <div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8">
      {Array.from({ length: 7 }).map((_, i) => (
        <div key={i} className="bg-bg-secondary rounded-lg border border-border p-3 text-center">
          <Skeleton className="w-6 h-6 mx-auto mb-2 rounded" />
          <Skeleton className="h-3 w-12 mx-auto" />
        </div>
      ))}
    </div>
  );
}

interface QuickActionsProps {
  loading?: boolean;
}

export default function QuickActions({ loading }: QuickActionsProps) {
  if (loading) return <QuickActionsSkeleton />;

  return (
    <nav className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-8" aria-label="Quick actions">
      {QUICK_ACTIONS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className="bg-bg-secondary rounded-lg border border-border p-3 hover:border-accent/50 transition-colors text-center group focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 focus:ring-offset-bg-primary"
          aria-label={`Go to ${label}`}
        >
          <Icon className="w-5 h-5 mx-auto mb-1.5 text-text-secondary group-hover:text-accent transition-colors" aria-hidden="true" />
          <div className="text-xs font-medium text-text-primary group-hover:text-accent transition-colors">{label}</div>
        </Link>
      ))}
    </nav>
  );
}
