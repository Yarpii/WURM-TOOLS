import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Branding & Style",
  description: "Customize site branding, colors, social links, and SEO settings.",
  path: "/admin/branding",
  noIndex: true,
});

export default function BrandingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
