import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Crafting Projects",
  description:
    "Plan and track your Wurm Online crafting projects. Create material lists, set goals, and collaborate with other players on large builds.",
  keywords: [
    "Wurm Online projects",
    "crafting projects",
    "build planner",
    "material lists",
    "Wurm planning",
    "construction tracker",
  ],
  path: "/projects",
});

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
