import type { Metadata } from "next";
import "./globals.css";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

export const metadata: Metadata = {
  title: "Blackforge Tools - Community Hub for Wurm Online",
  description: "Your all-in-one toolkit for Wurm Online: crafting calculators, skill optimizer, marketplace, merchant directory, and community features.",
  keywords: ["Wurm Online", "crafting", "calculator", "skills", "materials", "recipes", "marketplace", "merchants", "community"],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased min-h-screen flex flex-col bg-bg-primary text-text-primary">
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <main className="flex-1">{children}</main>
            <Footer />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
