import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Price Analytics",
  description:
    "Analyze Wurm Online market trends and price data. View charts, track price movements, and make informed trading decisions.",
  keywords: [
    "Wurm Online analytics",
    "price analysis",
    "market trends",
    "Wurm economy",
    "price charts",
    "trading analytics",
  ],
  path: "/analytics",
});

export default function AnalyticsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
