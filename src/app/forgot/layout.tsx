import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Forgot Password",
  description: "Reset your Wurm Tools password. Enter your email to receive a password reset link.",
  path: "/forgot",
  noIndex: true,
});

export default function ForgotLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
