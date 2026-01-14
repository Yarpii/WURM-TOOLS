/**
 * Static URL helper for serving assets from CDN/subdomain
 *
 * In production, static assets (images, uploads) can be served from
 * a separate subdomain (e.g., rare.wurm.tools) for better performance
 * and CDN distribution.
 *
 * Set NEXT_PUBLIC_STATIC_URL environment variable to enable this.
 * Example: NEXT_PUBLIC_STATIC_URL=https://rare.wurm.tools
 */

/**
 * Get the base URL for static assets
 * Returns empty string for same-origin, or the CDN URL if configured
 */
export function getStaticBaseUrl(): string {
  return process.env.NEXT_PUBLIC_STATIC_URL || "";
}

/**
 * Convert a relative path to a full static URL
 * @param path - Relative path starting with / (e.g., /uploads/avatars/image.jpg)
 * @returns Full URL if CDN configured, or same path if not
 */
export function getStaticUrl(path: string): string {
  const baseUrl = getStaticBaseUrl();
  if (!baseUrl) {
    return path;
  }
  // Ensure path starts with /
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${baseUrl}${normalizedPath}`;
}

/**
 * Check if static assets should be served from external URL
 */
export function isStaticCdnEnabled(): boolean {
  return !!process.env.NEXT_PUBLIC_STATIC_URL;
}
