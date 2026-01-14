import type { NextConfig } from "next";

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
};

export default nextConfig;
