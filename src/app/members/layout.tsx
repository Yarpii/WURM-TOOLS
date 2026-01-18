import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Community Members",
  description:
    "Browse the Wurm Tools community. Find players, connect with traders, and discover new friends across all Wurm Online servers.",
  keywords: [
    "Wurm Online players",
    "community members",
    "player directory",
    "find players",
    "Wurm community",
    "player profiles",
  ],
  path: "/members",
});

export default function MembersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
