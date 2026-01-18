import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Alliances",
  description:
    "Find and join alliances in Wurm Online. Browse alliance listings, connect with communities, and manage your alliance membership.",
  keywords: [
    "Wurm Online alliances",
    "Wurm guilds",
    "alliance directory",
    "find alliance",
    "Wurm community",
    "alliance recruitment",
  ],
  path: "/alliances",
});

export default function AlliancesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
