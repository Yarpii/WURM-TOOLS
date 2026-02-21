import type { NextConfig } from "next";

// SECURITY: Define security headers for the application
const securityHeaders = [
  {
    // Prevent clickjacking attacks
    key: "X-Frame-Options",
    value: "DENY",
  },
  {
    // Prevent MIME type sniffing
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    // Enable XSS filter in browsers
    key: "X-XSS-Protection",
    value: "1; mode=block",
  },
  {
    // Control referrer information
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    // Restrict permissions/features the browser can use
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    // Force HTTPS and prevent protocol downgrade attacks
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Content Security Policy - restrict sources of content
    // Note: 'unsafe-inline' and 'unsafe-eval' needed for Next.js, but we restrict other sources
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https: blob:",
      "font-src 'self' data:",
      "connect-src 'self' https://discord.com https://discordapp.com",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "rare.wurm.tools",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.wurmonline.com",
        pathname: "/dumps/**",
      },
    ],
  },
  // Environment-based static assets configuration
  assetPrefix: process.env.NEXT_PUBLIC_STATIC_URL || undefined,

  // SECURITY: Add security headers to all responses
  async headers() {
    return [
      {
        // Apply security headers to all routes
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
