import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "About Wurm Tools",
  description:
    "Learn about Wurm Tools, the community-driven toolkit for Wurm Online players. Discover our mission, features, and how we help the Wurm community.",
  keywords: [
    "about Wurm Tools",
    "Wurm Online tools",
    "community project",
    "Wurm companion",
    "about us",
  ],
  path: "/about",
});

export default function AboutLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
