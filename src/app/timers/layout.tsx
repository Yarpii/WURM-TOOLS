import type { Metadata } from "next";
import { generatePageMetadata } from "@/lib/seo";

export const metadata: Metadata = generatePageMetadata({
  title: "Timer Dashboard",
  description:
    "Never miss a timer in Wurm Online again. Track sleep bonus, crop growth, animal breeding, meditation cooldowns, and more with customizable alerts.",
  keywords: [
    "Wurm Online timers",
    "sleep bonus timer",
    "crop timer",
    "meditation timer",
    "animal breeding",
    "Wurm alerts",
    "timer dashboard",
  ],
  path: "/timers",
});

export default function TimersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
