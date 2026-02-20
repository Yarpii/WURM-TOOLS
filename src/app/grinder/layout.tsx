import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Skill Grinder",
  description:
    "Simulate Wurm Online skill gain to find the optimal difficulty, estimate actions needed, and plan your grind path from your current skill to your target.",
  keywords: [
    "Wurm Online",
    "skill grinder",
    "skill gain simulator",
    "skill calculator",
    "crafting skill",
    "skill path planner",
    "grinding guide",
    "action timer",
    "sleep bonus",
    "Gaussian skill check",
  ],
  path: "/grinder",
});

export default function GrinderLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
