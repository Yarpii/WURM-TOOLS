import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Interactive World Map",
  description:
    "Explore Wurm Online with our interactive world map. Find deeds, locate merchants, discover resource hotspots, and navigate all servers.",
  keywords: [
    "Wurm Online map",
    "interactive map",
    "world map",
    "deed finder",
    "merchant locator",
    "server map",
    "Wurm navigation",
    "resource map",
  ],
  path: "/map",
});

export default function MapLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
