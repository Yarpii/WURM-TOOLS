/**
 * Security utilities for production-safe error handling and input validation
 */

// ==================== STRING VALIDATION ====================

/**
 * String length limits for various input fields.
 * These should match database column sizes.
 */
export const INPUT_LIMITS = {
  // User fields
  username: { min: 3, max: 50 },
  displayName: { min: 1, max: 100 },
  bio: { min: 0, max: 500 },

  // Content fields
  name: { min: 1, max: 100 },
  title: { min: 1, max: 200 },
  description: { min: 0, max: 1000 },
  notes: { min: 0, max: 2000 },

  // Short fields
  tag: { min: 2, max: 10 },
  location: { min: 0, max: 200 },
  server: { min: 1, max: 50 },
  coordinates: { min: 0, max: 50 },

  // Long content
  stockList: { min: 1, max: 5000 },
  itemName: { min: 1, max: 200 },
  tradeFor: { min: 0, max: 500 },

  // URLs
  avatarUrl: { min: 0, max: 500 },
  url: { min: 0, max: 2000 },

  // Generic
  short: { min: 0, max: 100 },
  medium: { min: 0, max: 500 },
  long: { min: 0, max: 2000 },
} as const;

/**
 * Validates a string input against length constraints.
 * Returns null if valid, or an error message if invalid.
 */
export function validateStringLength(
  value: string | undefined | null,
  fieldName: string,
  limits: { min: number; max: number },
  required: boolean = false
): string | null {
  if (value === undefined || value === null || value === "") {
    if (required) {
      return `${fieldName} is required`;
    }
    return null; // Optional field, empty is ok
  }

  const trimmed = value.trim();

  if (trimmed.length < limits.min) {
    if (limits.min === 1) {
      return `${fieldName} is required`;
    }
    return `${fieldName} must be at least ${limits.min} characters`;
  }

  if (trimmed.length > limits.max) {
    return `${fieldName} must be ${limits.max} characters or less`;
  }

  return null;
}

/**
 * Validates multiple string fields at once.
 * Returns the first error encountered, or null if all valid.
 */
export function validateStringFields(
  fields: Array<{
    value: string | undefined | null;
    name: string;
    limits: { min: number; max: number };
    required?: boolean;
  }>
): string | null {
  for (const field of fields) {
    const error = validateStringLength(field.value, field.name, field.limits, field.required);
    if (error) {
      return error;
    }
  }
  return null;
}

/**
 * Sanitizes a string by trimming and optionally truncating.
 * Returns undefined for empty strings if allowEmpty is false.
 */
export function sanitizeString(
  value: string | undefined | null,
  maxLength?: number,
  allowEmpty: boolean = false
): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }

  let result = value.trim();

  if (maxLength && result.length > maxLength) {
    result = result.substring(0, maxLength);
  }

  if (result === "" && !allowEmpty) {
    return undefined;
  }

  return result;
}

// ==================== ERROR HANDLING ====================

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
