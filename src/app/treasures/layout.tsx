import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Treasure Hunting",
  description:
    "Find and track treasures in Wurm Online. Decode treasure maps, plan hunting routes, and log your discoveries across all servers.",
  keywords: [
    "Wurm Online treasures",
    "treasure hunting",
    "treasure maps",
    "Wurm loot",
    "treasure finder",
    "hunting guide",
  ],
  path: "/treasures",
});

export default function TreasuresLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
