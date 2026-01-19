import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Data Management",
  description: "Wurm Tools data management panel.",
  path: "/data",
  noIndex: true,
});

export default function DataLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
