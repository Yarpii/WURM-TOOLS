import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Achievements",
  description:
    "Track your Wurm Online achievements and goals. Set targets, monitor progress, and celebrate your accomplishments with the community.",
  keywords: [
    "Wurm Online achievements",
    "goal tracking",
    "Wurm goals",
    "achievement tracker",
    "progress tracking",
    "Wurm milestones",
  ],
  path: "/achievements",
});

export default function AchievementsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
