import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Merchant Directory",
  description:
    "Find merchants across all Wurm Online servers. Browse merchant inventories, compare prices, and locate the best shops for your needs.",
  keywords: [
    "Wurm Online merchants",
    "merchant directory",
    "Wurm shops",
    "find merchants",
    "merchant locator",
    "Wurm vendors",
    "shopping guide",
  ],
  path: "/merchants",
});

export default function MerchantsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
