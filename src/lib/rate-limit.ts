/**
 * Production-ready rate limiting with Redis support
 *
 * SECURITY: This module provides distributed rate limiting that works across
 * multiple server instances using Redis. Falls back to in-memory rate limiting
 * if Redis is not configured (suitable only for single-instance deployments).
 */

import Redis from "ioredis";

// ==================== CONFIGURATION ====================

export interface RateLimitConfig {
  maxRequests: number;
  windowMs: number;
}

export const RATE_LIMITS: Record<string, RateLimitConfig> = {
  // General API rate limit
  general: {
    maxRequests: parseInt(process.env.RATE_LIMIT_GENERAL || "100", 10),
    windowMs: 60 * 1000, // 1 minute
  },
  // Stricter limit for auth endpoints (prevent brute force)
  auth: {
    maxRequests: parseInt(process.env.RATE_LIMIT_AUTH || "10", 10),
    windowMs: 60 * 1000, // 1 minute
  },
  // Very strict limit for login attempts
  login: {
    maxRequests: 5,
    windowMs: 15 * 60 * 1000, // 15 minutes
  },
  // Limit for password reset requests
  passwordReset: {
    maxRequests: 3,
    windowMs: 60 * 60 * 1000, // 1 hour
  },
  // Limit for expensive operations (uploads, exports)
  expensive: {
    maxRequests: 20,
    windowMs: 60 * 1000, // 1 minute
  },
  // Limit for 2FA code requests
  twoFactor: {
    maxRequests: 5,
    windowMs: 5 * 60 * 1000, // 5 minutes
  },
};

// ==================== REDIS CLIENT ====================

let redisClient: Redis | null = null;
let redisConnectionFailed = false;

function getRedisClient(): Redis | null {
  if (redisConnectionFailed) {
    return null;
  }

  if (redisClient) {
    return redisClient;
  }

  const redisUrl = process.env.REDIS_URL;
  if (!redisUrl) {
    console.warn(
      "[RateLimit] REDIS_URL not configured. Using in-memory rate limiting (not suitable for multi-instance deployments)."
    );
    return null;
  }

  try {
    redisClient = new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      retryStrategy(times) {
        if (times > 3) {
          console.error("[RateLimit] Redis connection failed after 3 retries. Falling back to in-memory.");
          redisConnectionFailed = true;
          return null;
        }
        return Math.min(times * 100, 3000);
      },
      enableOfflineQueue: false,
    });

    redisClient.on("error", (err) => {
      console.error("[RateLimit] Redis error:", err.message);
    });

    redisClient.on("connect", () => {
      console.log("[RateLimit] Connected to Redis for distributed rate limiting.");
    });

    return redisClient;
  } catch (error) {
    console.error("[RateLimit] Failed to create Redis client:", error);
    redisConnectionFailed = true;
    return null;
  }
}

// ==================== IN-MEMORY FALLBACK ====================

interface InMemoryEntry {
  count: number;
  resetAt: number;
}

const inMemoryStore = new Map<string, InMemoryEntry>();
const MAX_STORE_SIZE = 10000;

// Cleanup old entries periodically (every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of inMemoryStore.entries()) {
    if (entry.resetAt < now) {
      inMemoryStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

// On-demand cleanup when store grows too large
function cleanupIfNeeded(): void {
  if (inMemoryStore.size > MAX_STORE_SIZE) {
    const now = Date.now();
    for (const [key, entry] of inMemoryStore.entries()) {
      if (entry.resetAt < now) {
        inMemoryStore.delete(key);
      }
    }
  }
}

// ==================== RATE LIMIT CHECK ====================

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
}

/**
 * Check if a request is allowed under the rate limit.
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID, or combination)
 * @param limitType - Type of rate limit to apply (from RATE_LIMITS)
 * @returns Result indicating if request is allowed and remaining quota
 */
export async function checkRateLimit(
  identifier: string,
  limitType: keyof typeof RATE_LIMITS = "general"
): Promise<RateLimitResult> {
  const config = RATE_LIMITS[limitType];
  const key = `ratelimit:${limitType}:${identifier}`;

  const redis = getRedisClient();

  if (redis) {
    return checkRateLimitRedis(redis, key, config);
  }

  return checkRateLimitInMemory(key, config);
}

async function checkRateLimitRedis(
  redis: Redis,
  key: string,
  config: RateLimitConfig
): Promise<RateLimitResult> {
  const windowSeconds = Math.ceil(config.windowMs / 1000);

  try {
    // Use Redis MULTI for atomic increment and expire
    const pipeline = redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    if (!results) {
      throw new Error("Redis pipeline returned null");
    }

    const [[incrErr, count], [ttlErr, ttl]] = results as [[Error | null, number], [Error | null, number]];

    if (incrErr) throw incrErr;
    if (ttlErr) throw ttlErr;

    // Set expiry if this is the first request in the window
    if (ttl === -1) {
      await redis.expire(key, windowSeconds);
    }

    const currentCount = count as number;
    const allowed = currentCount <= config.maxRequests;
    const remaining = Math.max(0, config.maxRequests - currentCount);
    const resetAt = Date.now() + (ttl > 0 ? ttl * 1000 : config.windowMs);

    return {
      allowed,
      remaining,
      resetAt,
      retryAfter: allowed ? undefined : Math.ceil((resetAt - Date.now()) / 1000),
    };
  } catch (error) {
    console.error("[RateLimit] Redis error, denying request (fail-secure):", error);
    return {
      allowed: false,
      remaining: 0,
      resetAt: Date.now() + config.windowMs,
      retryAfter: Math.ceil(config.windowMs / 1000),
    };
  }
}

function checkRateLimitInMemory(key: string, config: RateLimitConfig): RateLimitResult {
  cleanupIfNeeded();
  const now = Date.now();
  const entry = inMemoryStore.get(key);

  if (!entry || entry.resetAt < now) {
    // Start new window
    inMemoryStore.set(key, {
      count: 1,
      resetAt: now + config.windowMs,
    });

    return {
      allowed: true,
      remaining: config.maxRequests - 1,
      resetAt: now + config.windowMs,
    };
  }

  // Increment counter
  entry.count++;
  const allowed = entry.count <= config.maxRequests;
  const remaining = Math.max(0, config.maxRequests - entry.count);

  return {
    allowed,
    remaining,
    resetAt: entry.resetAt,
    retryAfter: allowed ? undefined : Math.ceil((entry.resetAt - now) / 1000),
  };
}

// ==================== HELPER FUNCTIONS ====================

/**
 * Extract client IP from request headers.
 * Handles common proxy headers.
 */
export function getClientIp(request: Request): string {
  // Check common proxy headers
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    // Take the first IP in the chain (client IP)
    return forwarded.split(",")[0].trim();
  }

  const realIp = request.headers.get("x-real-ip");
  if (realIp) {
    return realIp.trim();
  }

  // Fallback - in production, this might be the load balancer IP
  return "unknown";
}

/**
 * Create a rate limit key combining IP and optional user ID.
 * This provides both IP-based and user-based rate limiting.
 */
export function createRateLimitKey(ip: string, userId?: number | string): string {
  if (userId) {
    return `${ip}:user:${userId}`;
  }
  return ip;
}

/**
 * Add rate limit headers to a response.
 */
export function addRateLimitHeaders(
  headers: Headers,
  result: RateLimitResult,
  config: RateLimitConfig
): void {
  headers.set("X-RateLimit-Limit", config.maxRequests.toString());
  headers.set("X-RateLimit-Remaining", result.remaining.toString());
  headers.set("X-RateLimit-Reset", Math.ceil(result.resetAt / 1000).toString());

  if (!result.allowed && result.retryAfter) {
    headers.set("Retry-After", result.retryAfter.toString());
  }
}

/**
 * Check if Redis is available for rate limiting.
 */
export function isRedisAvailable(): boolean {
  return getRedisClient() !== null;
}
