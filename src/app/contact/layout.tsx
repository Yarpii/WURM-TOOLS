import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Contact Us",
  description:
    "Get in touch with the Wurm Tools team. Send feedback, report bugs, suggest features, or ask questions about our Wurm Online tools.",
  keywords: [
    "contact Wurm Tools",
    "Wurm feedback",
    "bug report",
    "feature request",
    "support",
  ],
  path: "/contact",
});

export default function ContactLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
