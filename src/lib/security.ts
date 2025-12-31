/**
 * Security utilities for production-safe error handling and input validation
 */

/**
 * Sanitizes error messages to prevent information leakage in production.
 * In development, returns the full error; in production, returns a generic message.
 *
 * SECURITY: Never expose stack traces, file paths, or internal details to clients.
 */
export function sanitizeError(error: unknown, context: string = "Operation"): string {
  // Log the full error server-side for debugging
  console.error(`[${context}] Error:`, error);

  // In production, return generic error messages
  if (process.env.NODE_ENV === "production") {
    return `${context} failed. Please try again later.`;
  }

  // In development, return more details (but still not the full stack trace)
  if (error instanceof Error) {
    return `${context} failed: ${error.message}`;
  }

  return `${context} failed: Unknown error`;
}

/**
 * Creates a standardized error response for API routes.
 * Ensures consistent error format and prevents information leakage.
 */
export function createErrorResponse(
  error: unknown,
  context: string,
  statusCode: number = 500
): { error: string; status: number } {
  return {
    error: sanitizeError(error, context),
    status: statusCode,
  };
}

/**
 * Validates and sanitizes numeric input within bounds.
 * Prevents DoS via extremely large numbers.
 */
export function validateNumericInput(
  value: number | string | undefined | null,
  min: number,
  max: number,
  defaultValue: number
): number {
  if (value === undefined || value === null || value === "") {
    return defaultValue;
  }

  const num = typeof value === "string" ? parseFloat(value) : value;

  if (isNaN(num) || !isFinite(num)) {
    return defaultValue;
  }

  return Math.min(Math.max(num, min), max);
}

/**
 * Validates pagination parameters with safe defaults.
 * Prevents unbounded queries.
 */
export function validatePagination(
  page: string | number | undefined | null,
  limit: string | number | undefined | null,
  maxLimit: number = 100
): { page: number; limit: number; offset: number } {
  const validPage = validateNumericInput(page, 1, 10000, 1);
  const validLimit = validateNumericInput(limit, 1, maxLimit, 20);

  return {
    page: Math.floor(validPage),
    limit: Math.floor(validLimit),
    offset: (Math.floor(validPage) - 1) * Math.floor(validLimit),
  };
}

/**
 * Rate limiting configuration for production.
 * NOTE: The in-memory rate limiter in middleware.ts is NOT suitable for production
 * with multiple server instances. For production, use Redis or a similar distributed store.
 *
 * Example Redis implementation:
 * ```
 * import Redis from 'ioredis';
 * const redis = new Redis(process.env.REDIS_URL);
 *
 * async function checkRateLimit(key: string, maxRequests: number, windowMs: number) {
 *   const current = await redis.incr(key);
 *   if (current === 1) {
 *     await redis.expire(key, Math.ceil(windowMs / 1000));
 *   }
 *   return current <= maxRequests;
 * }
 * ```
 */
export const RATE_LIMIT_CONFIG = {
  // General API rate limit
  general: {
    maxRequests: 100,
    windowMs: 60 * 1000, // 1 minute
  },
  // Stricter limit for auth endpoints (prevent brute force)
  auth: {
    maxRequests: 10,
    windowMs: 60 * 1000, // 1 minute
  },
  // Very strict limit for expensive operations
  expensive: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  // Note: In production, implement with Redis for distributed rate limiting
  _productionWarning: "In-memory rate limiting does not work across multiple server instances. Use Redis in production.",
};
