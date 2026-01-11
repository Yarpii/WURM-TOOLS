import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BetaBanner from "@/components/BetaBanner";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import PWAInstall from "@/components/PWAInstall";

export const metadata: Metadata = {
  title: "Blackforge Tools - Community Hub for Wurm Online",
  description: "Your all-in-one toolkit for Wurm Online: crafting calculators, skill optimizer, marketplace, merchant directory, and community features.",
  keywords: ["Wurm Online", "crafting", "calculator", "skills", "materials", "recipes", "marketplace", "merchants", "community"],
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Blackforge",
  },
};

export const viewport: Viewport = {
  themeColor: "#6366f1",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-bg-primary text-text-primary">
        <ThemeProvider>
          <AuthProvider>
            <Header />
            <BetaBanner />
            <main className="flex-1">{children}</main>
            <Footer />
            <PWAInstall />
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
