import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Cooking & Affinity Calculator",
  description:
    "Calculate cooking affinities in Wurm Online. Find the perfect recipes for any skill affinity, track CCFP nutrition, and discover your player number.",
  keywords: [
    "Wurm Online cooking",
    "affinity calculator",
    "cooking affinities",
    "CCFP calculator",
    "player number",
    "Wurm recipes",
    "cooking guide",
    "affinity finder",
  ],
  path: "/cooking",
});

export default function CookingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
