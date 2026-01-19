import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Community Resources",
  description:
    "Access community-shared resources for Wurm Online. Find guides, tutorials, spreadsheets, and tools created by the community.",
  keywords: [
    "Wurm Online resources",
    "community guides",
    "Wurm tutorials",
    "player resources",
    "Wurm tools",
    "community content",
  ],
  path: "/resources",
});

export default function ResourcesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
