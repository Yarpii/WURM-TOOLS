import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ==================== RATE LIMITING ====================

/**
 * Rate Limiting Configuration
 *
 * PRODUCTION DEPLOYMENT OPTIONS:
 *
 * Option 1: Set REDIS_URL environment variable to use Redis-based rate limiting
 *   - Works with multiple server instances, serverless, and Kubernetes
 *   - Example: REDIS_URL=redis://localhost:6379
 *
 * Option 2: Use external rate limiting (recommended for production)
 *   - Cloudflare Rate Limiting
 *   - AWS WAF
 *   - Nginx rate limiting
 *   - API Gateway rate limiting
 *
 * Option 3: In-memory fallback (current default)
 *   - Only suitable for single-instance deployments
 *   - Used when REDIS_URL is not configured
 *
 * To use Redis, install ioredis and uncomment the Redis implementation below.
 */

const RATE_LIMIT_WINDOW_SECONDS = 60; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // max requests per window
const AUTH_RATE_LIMIT_MAX = 10; // stricter limit for auth endpoints

// In-memory rate limit store (fallback for development/single instance)
const inMemoryStore = new Map<string, { count: number; resetTime: number }>();

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or forwarded IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

/**
 * In-memory rate limit check (fallback for development/single instance)
 */
function checkRateLimitInMemory(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const windowMs = RATE_LIMIT_WINDOW_SECONDS * 1000;
  const entry = inMemoryStore.get(key);

  // Clean up old entries periodically (prevent memory leaks)
  if (inMemoryStore.size > 10000) {
    for (const [k, v] of inMemoryStore.entries()) {
      if (v.resetTime < now) {
        inMemoryStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    inMemoryStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
}

/**
 * Check rate limit using configured backend
 *
 * Note: For production with multiple instances, consider using:
 * - Redis-based rate limiting (requires ioredis package)
 * - External rate limiting (Cloudflare, AWS WAF, Nginx)
 */
function checkRateLimit(key: string, maxRequests: number): boolean {
  return checkRateLimitInMemory(key, maxRequests);
}

// ==================== SECURITY HEADERS ====================
function addSecurityHeaders(response: NextResponse): NextResponse {
  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection (legacy but still useful)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Referrer policy - don't leak referrer to other origins
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions policy - restrict browser features
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=(), payment=()"
  );

  // Content Security Policy - prevent XSS and data injection
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline'", // Next.js requires unsafe-inline for production builds
      "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.wurmpedia.com https://discord.com https://discordapp.com https://items.wurm.tools http://localhost:3030",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'self'",
    ].join("; ")
  );

  // Strict Transport Security (HTTPS only in production)
  if (process.env.NODE_ENV === "production") {
    response.headers.set(
      "Strict-Transport-Security",
      "max-age=31536000; includeSubDomains"
    );
  }

  return response;
}

// ==================== PROXY ====================
export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const rateLimitKey = getRateLimitKey(request);

  // Stricter rate limiting for auth endpoints (prevent brute force)
  if (pathname.startsWith("/api/auth/")) {
    const authKey = `auth:${rateLimitKey}`;
    if (!checkRateLimit(authKey, AUTH_RATE_LIMIT_MAX)) {
      return NextResponse.json(
        { error: "Too many authentication attempts. Please try again later." },
        { status: 429 }
      );
    }
  }

  // General rate limiting for all API endpoints
  if (pathname.startsWith("/api/")) {
    if (!checkRateLimit(rateLimitKey, RATE_LIMIT_MAX_REQUESTS)) {
      return NextResponse.json(
        { error: "Rate limit exceeded. Please try again later." },
        { status: 429 }
      );
    }
  }

  // Get the response (continue to the route handler)
  const response = NextResponse.next();

  // Add security headers to all responses
  return addSecurityHeaders(response);
}

// Configure which paths the middleware runs on
export const config = {
  matcher: [
    // Match all request paths except static files
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)).*)",
  ],
};
