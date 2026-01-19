import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Archaeology - Old Deed Locations",
  description:
    "Discover historical deed locations in Wurm Online. Find old settlements, explore archaeology pinpoints, and uncover the history of Wurm servers.",
  keywords: [
    "Wurm Online archaeology",
    "old deeds",
    "historical locations",
    "Wurm history",
    "deed finder",
    "archaeology spots",
  ],
  path: "/archaeology",
});

export default function ArchaeologyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
