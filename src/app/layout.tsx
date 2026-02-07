import type { Metadata, Viewport } from "next";
import "./globals.css";
import Header from "@/components/Header";
import BetaBanner from "@/components/BetaBanner";
import Footer from "@/components/Footer";
import { AuthProvider } from "@/components/AuthProvider";
import { ThemeProvider } from "@/components/ThemeProvider";
import { InfoSectionsProvider } from "@/components/InfoSectionsProvider";
import { SiteSettingsProvider } from "@/components/SiteSettingsProvider";
import PWAInstall from "@/components/PWAInstall";
import JsonLd from "@/components/JsonLd";
import {
  DEFAULT_SEO,
  DEFAULT_OG_IMAGE,
  DEFAULT_TWITTER,
  BASE_URL,
  generateWebsiteSchema,
  generateOrganizationSchema,
  generateSoftwareAppSchema,
} from "@/lib/seo";

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: DEFAULT_SEO.title,
    template: "%s | Wurm Tools",
  },
  description: DEFAULT_SEO.description,
  keywords: DEFAULT_SEO.keywords,
  authors: [{ name: "Wurm Tools Community" }],
  creator: "Wurm Tools",
  publisher: "Wurm Tools",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Wurm Tools",
  },
  openGraph: {
    type: "website",
    locale: DEFAULT_SEO.locale,
    url: BASE_URL,
    siteName: DEFAULT_SEO.siteName,
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    images: [DEFAULT_OG_IMAGE],
  },
  twitter: {
    card: DEFAULT_TWITTER.card,
    title: DEFAULT_SEO.title,
    description: DEFAULT_SEO.description,
    images: [DEFAULT_OG_IMAGE.url],
    site: DEFAULT_TWITTER.site,
    creator: DEFAULT_TWITTER.creator,
  },
  alternates: {
    canonical: BASE_URL,
  },
  category: "Gaming Tools",
  classification: "Game Companion Application",
  other: {
    "application-name": "Wurm Tools",
    "msapplication-TileColor": "#6366f1",
    "msapplication-config": "/browserconfig.xml",
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
  // Generate structured data schemas
  const schemas = [
    generateWebsiteSchema(),
    generateOrganizationSchema(),
    generateSoftwareAppSchema(),
  ];

  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icon.svg" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <JsonLd data={schemas} />
      </head>
      <body className="antialiased min-h-screen flex flex-col bg-bg-primary text-text-primary">
        <ThemeProvider>
          <AuthProvider>
            <SiteSettingsProvider>
              <InfoSectionsProvider>
                <Header />
                <BetaBanner />
                <main className="flex-1">{children}</main>
                <Footer />
                <PWAInstall />
              </InfoSectionsProvider>
            </SiteSettingsProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
