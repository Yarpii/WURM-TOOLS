import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Characters",
  description:
    "Browse and manage Wurm Online characters. View character profiles, skills, achievements, and connect with players across all servers.",
  keywords: [
    "Wurm Online characters",
    "character profiles",
    "skill tracking",
    "Wurm avatars",
    "character directory",
    "player characters",
  ],
  path: "/characters",
});

export default function CharactersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
