import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Skill Optimizer",
  description:
    "Optimize your skill training in Wurm Online. Calculate skill gains, find the best items to craft, track your progress, and plan your path to mastery.",
  keywords: [
    "Wurm Online skills",
    "skill optimizer",
    "skill calculator",
    "training guide",
    "skill gain",
    "grinding guide",
    "skill tracker",
    "Wurm leveling",
  ],
  path: "/skills",
});

export default function SkillsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
