import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Crafting Calculator",
  description:
    "Calculate exact material requirements for Wurm Online crafting. Get full recipe breakdowns, quality predictions, skill grinding guides, and advanced crafting simulations.",
  keywords: [
    "Wurm Online crafting",
    "crafting calculator",
    "material calculator",
    "recipe calculator",
    "Wurm crafting guide",
    "skill training",
    "crafting materials",
    "Wurm Online tools",
  ],
  path: "/crafting",
});

export default function CraftingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
