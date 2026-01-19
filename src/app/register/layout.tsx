import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Create Account",
  description: "Join the Wurm Tools community. Create a free account to access all features and connect with other Wurm Online players.",
  path: "/register",
  noIndex: true,
});

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
