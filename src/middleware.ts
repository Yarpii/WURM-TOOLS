import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// ==================== RATE LIMITING ====================
/**
 * PRODUCTION WARNING: This in-memory rate limiter does NOT work with:
 * - Multiple server instances (load balanced)
 * - Serverless deployments (Vercel, AWS Lambda)
 * - Container orchestration (Kubernetes)
 *
 * For production, implement Redis-based rate limiting:
 * - Use Redis INCR with EXPIRE for atomic counters
 * - Or use a service like Cloudflare, AWS WAF, or rate-limit middleware
 *
 * See /src/lib/security.ts for Redis implementation example.
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 100; // max requests per window
const AUTH_RATE_LIMIT_MAX = 10; // stricter limit for auth endpoints

function getRateLimitKey(request: NextRequest): string {
  // Use IP address or forwarded IP
  const forwarded = request.headers.get("x-forwarded-for");
  const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";
  return ip;
}

function checkRateLimit(key: string, maxRequests: number): boolean {
  const now = Date.now();
  const entry = rateLimitStore.get(key);

  // Clean up old entries periodically
  if (rateLimitStore.size > 10000) {
    for (const [k, v] of rateLimitStore.entries()) {
      if (v.resetTime < now) {
        rateLimitStore.delete(k);
      }
    }
  }

  if (!entry || entry.resetTime < now) {
    rateLimitStore.set(key, { count: 1, resetTime: now + RATE_LIMIT_WINDOW });
    return true;
  }

  if (entry.count >= maxRequests) {
    return false;
  }

  entry.count++;
  return true;
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
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'", // Next.js requires unsafe-inline/eval
      "style-src 'self' 'unsafe-inline'", // Tailwind requires unsafe-inline
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self' https://www.wurmpedia.com https://discord.com https://discordapp.com",
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

// ==================== MIDDLEWARE ====================
export function middleware(request: NextRequest) {
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
