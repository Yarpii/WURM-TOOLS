import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Community Events",
  description:
    "Find and join Wurm Online community events. Discover impalongs, rifts, hunts, and community gatherings across all servers. Easy RSVP and event calendar.",
  keywords: [
    "Wurm Online events",
    "impalongs",
    "rifts",
    "community events",
    "Wurm gatherings",
    "event calendar",
    "Wurm community",
  ],
  path: "/events",
});

export default function EventsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
