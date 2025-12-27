import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WurmCalc - WURM Online Crafting Calculator",
  description: "Calculate total base materials for any craftable item in WURM Online",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
