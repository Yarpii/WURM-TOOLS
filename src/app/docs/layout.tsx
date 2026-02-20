import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Documentation",
  description:
    "How to use Wurm Tools calculators — crafting, skill grinder, cooking affinity, and more. Includes the underlying Wurm Online formulas so you can verify and understand every result.",
  keywords: [
    "Wurm Online",
    "documentation",
    "calculator guide",
    "crafting formulas",
    "skill gain formula",
    "Gaussian skill check",
    "The Curve",
    "sweet spot",
    "cooking affinity",
    "how to use",
  ],
  path: "/docs",
});

export default function DocsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
