import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Marketplace - Buy & Sell Items",
  description:
    "Trade items in Wurm Online's community marketplace. Post buy and sell orders, find the best deals, and connect with traders across all servers.",
  keywords: [
    "Wurm Online marketplace",
    "buy Wurm items",
    "sell Wurm items",
    "trading",
    "market orders",
    "Wurm economy",
    "item trading",
    "silver trading",
  ],
  path: "/market",
});

export default function MarketLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
