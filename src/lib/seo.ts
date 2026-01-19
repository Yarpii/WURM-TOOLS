import type { Metadata } from "next";

// Base URL for the site
export const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "https://wurm.tools";

// Default SEO values
export const DEFAULT_SEO = {
  siteName: "Wurm Tools",
  title: "Wurm Tools - Community Hub for Wurm Online",
  description:
    "Your all-in-one toolkit for Wurm Online: crafting calculators, cooking affinities, skill optimizer, marketplace, merchant directory, interactive map, and community features.",
  keywords: [
    "Wurm Online",
    "crafting calculator",
    "cooking affinity",
    "skill optimizer",
    "marketplace",
    "merchants",
    "community",
    "MMO tools",
    "game companion",
    "Wurm toolkit",
  ],
  locale: "en_US",
  type: "website" as const,
};

// OG Image defaults
export const DEFAULT_OG_IMAGE = {
  url: `${BASE_URL}/og-image.svg`,
  width: 1200,
  height: 630,
  alt: "Wurm Tools - Community Hub for Wurm Online",
  type: "image/svg+xml",
};

// Twitter defaults
export const DEFAULT_TWITTER = {
  card: "summary_large_image" as const,
  site: "@wurmtools",
  creator: "@wurmtools",
};

/**
 * Generate metadata for a page
 */
export function generatePageMetadata({
  title,
  description,
  keywords,
  path = "",
  ogImage,
  noIndex = false,
  type = "website",
}: {
  title: string;
  description: string;
  keywords?: string[];
  path?: string;
  ogImage?: {
    url: string;
    width?: number;
    height?: number;
    alt?: string;
  };
  noIndex?: boolean;
  type?: "website" | "article" | "profile";
}): Metadata {
  const fullTitle = title.includes("Wurm Tools")
    ? title
    : `${title} | Wurm Tools`;
  const canonicalUrl = `${BASE_URL}${path}`;

  const ogImageData = ogImage
    ? {
        url: ogImage.url.startsWith("http") ? ogImage.url : `${BASE_URL}${ogImage.url}`,
        width: ogImage.width || DEFAULT_OG_IMAGE.width,
        height: ogImage.height || DEFAULT_OG_IMAGE.height,
        alt: ogImage.alt || title,
      }
    : DEFAULT_OG_IMAGE;

  return {
    title: fullTitle,
    description,
    keywords: keywords || DEFAULT_SEO.keywords,
    authors: [{ name: "Wurm Tools Community" }],
    creator: "Wurm Tools",
    publisher: "Wurm Tools",
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: fullTitle,
      description,
      url: canonicalUrl,
      siteName: DEFAULT_SEO.siteName,
      locale: DEFAULT_SEO.locale,
      type,
      images: [ogImageData],
    },
    twitter: {
      card: DEFAULT_TWITTER.card,
      title: fullTitle,
      description,
      images: [ogImageData.url],
      site: DEFAULT_TWITTER.site,
      creator: DEFAULT_TWITTER.creator,
    },
  };
}

/**
 * Generate JSON-LD WebSite schema
 */
export function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: DEFAULT_SEO.siteName,
    description: DEFAULT_SEO.description,
    url: BASE_URL,
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${BASE_URL}/market?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };
}

/**
 * Generate JSON-LD Organization schema
 */
export function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: DEFAULT_SEO.siteName,
    url: BASE_URL,
    logo: `${BASE_URL}/icon.svg`,
    description: DEFAULT_SEO.description,
    sameAs: [
      "https://github.com/Yarpii/WURM-TOOLS",
    ],
    contactPoint: {
      "@type": "ContactPoint",
      contactType: "customer support",
      url: `${BASE_URL}/contact`,
    },
  };
}

/**
 * Generate JSON-LD SoftwareApplication schema
 */
export function generateSoftwareAppSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: DEFAULT_SEO.siteName,
    applicationCategory: "GameApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
    },
    description: DEFAULT_SEO.description,
    url: BASE_URL,
    featureList: [
      "Crafting Calculator",
      "Cooking Affinity Calculator",
      "Skill Optimizer",
      "Interactive World Map",
      "Marketplace",
      "Merchant Directory",
      "Community Events",
      "Timer Dashboard",
      "Character Management",
      "Alliance Management",
    ],
  };
}

/**
 * Generate JSON-LD BreadcrumbList schema
 */
export function generateBreadcrumbSchema(
  items: { name: string; url: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: item.url.startsWith("http") ? item.url : `${BASE_URL}${item.url}`,
    })),
  };
}

/**
 * Generate JSON-LD FAQPage schema
 */
export function generateFAQSchema(
  faqs: { question: string; answer: string }[]
) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/**
 * Generate JSON-LD for a character/profile page
 */
export function generateProfileSchema({
  name,
  description,
  url,
  image,
}: {
  name: string;
  description?: string;
  url: string;
  image?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "ProfilePage",
    mainEntity: {
      "@type": "Person",
      name,
      description,
      url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
      image: image ? (image.startsWith("http") ? image : `${BASE_URL}${image}`) : undefined,
    },
  };
}

/**
 * Generate JSON-LD for an event
 */
export function generateEventSchema({
  name,
  description,
  startDate,
  endDate,
  location,
  url,
  organizer,
}: {
  name: string;
  description: string;
  startDate: string;
  endDate?: string;
  location?: string;
  url: string;
  organizer?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "Event",
    name,
    description,
    startDate,
    endDate,
    location: location
      ? {
          "@type": "VirtualLocation",
          name: location,
          url: `${BASE_URL}/map`,
        }
      : undefined,
    url: url.startsWith("http") ? url : `${BASE_URL}${url}`,
    organizer: organizer
      ? {
          "@type": "Organization",
          name: organizer,
        }
      : undefined,
    eventAttendanceMode: "https://schema.org/OnlineEventAttendanceMode",
  };
}

/**
 * Generate JSON-LD for a how-to/guide
 */
export function generateHowToSchema({
  name,
  description,
  steps,
  totalTime,
}: {
  name: string;
  description: string;
  steps: { name: string; text: string }[];
  totalTime?: string;
}) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    name,
    description,
    totalTime,
    step: steps.map((step, index) => ({
      "@type": "HowToStep",
      position: index + 1,
      name: step.name,
      text: step.text,
    })),
  };
}
