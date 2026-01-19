import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Disclaimer",
  description:
    "Legal disclaimer for Wurm Tools. Read about our terms of use, privacy policy, and relationship with Wurm Online.",
  keywords: [
    "Wurm Tools disclaimer",
    "terms of use",
    "legal notice",
    "privacy",
  ],
  path: "/disclaimer",
});

export default function DisclaimerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
