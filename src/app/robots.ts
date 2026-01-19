import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://wurm.tools";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Authentication pages - no need to index
          "/login",
          "/register",
          "/forgot",
          "/reset-password",
          // User-specific pages
          "/dashboard",
          "/settings",
          // Admin pages
          "/admin",
          "/admin/*",
          // Data management
          "/data",
          // API routes
          "/api/*",
        ],
      },
      {
        // Block aggressive crawlers
        userAgent: "GPTBot",
        disallow: ["/"],
      },
      {
        userAgent: "CCBot",
        disallow: ["/"],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
