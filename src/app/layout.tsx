import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "Blackforge.Tools - Wurm Online Utilities",
  description: "Forged for Wurm Online adventurers - Crafting calculator, material management, recipe tools and more",
  keywords: ["Wurm Online", "crafting", "calculator", "blacksmith", "forge", "materials", "recipes"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased min-h-screen flex flex-col">
        <AuthProvider>
          <Header />
          <main className="flex-1">
            {children}
          </main>
          <Footer />
        </AuthProvider>
      </body>
    </html>
  );
}
