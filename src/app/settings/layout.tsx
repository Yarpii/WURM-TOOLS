import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Settings",
  description: "Manage your Wurm Tools account settings, preferences, and notifications.",
  path: "/settings",
  noIndex: true,
});

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
