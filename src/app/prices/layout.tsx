import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Price Guide",
  description:
    "Check current prices for items in Wurm Online. View price history, market trends, and find the best deals across all servers.",
  keywords: [
    "Wurm Online prices",
    "price guide",
    "item prices",
    "market prices",
    "price history",
    "Wurm economy",
    "trading prices",
  ],
  path: "/prices",
});

export default function PricesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
