import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Trade Matching",
  description:
    "Find matching trades in Wurm Online. Our smart matching system connects buyers with sellers automatically for faster trading.",
  keywords: [
    "Wurm Online trading",
    "trade matching",
    "find trades",
    "Wurm marketplace",
    "trade finder",
    "buy sell matching",
  ],
  path: "/trades",
});

export default function TradesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
