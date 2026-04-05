import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";

// Initialize Redis only if credentials are available
const redis = process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL,
      token: process.env.UPSTASH_REDIS_REST_TOKEN,
    })
  : null;

// Create rate limiters
export const loginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
      analytics: true,
      prefix: "ratelimit:admin-login",
    })
  : null;

export const formRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 requests per minute
      analytics: true,
      prefix: "ratelimit:form",
    })
  : null;

export const apiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 m"), // 10 requests per minute
      analytics: true,
      prefix: "ratelimit:api",
    })
  : null;

export const klantLoginRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
      analytics: true,
      prefix: "ratelimit:klant-login",
    })
  : null;

export const klantRegisterRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "15 m"), // 3 requests per 15 minutes
      analytics: true,
      prefix: "ratelimit:klant-register",
    })
  : null;

export const calculatorLeadRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "1 h"), // 10 requests per hour
      analytics: true,
      prefix: "ratelimit:calculator-lead",
    })
  : null;

export const contractSignRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "15 m"), // 5 requests per 15 minutes
      analytics: true,
      prefix: "ratelimit:contract-sign",
    })
  : null;

// Striktere rate limit voor AI endpoints (kostbaar + misbruikgevoelig)
export const aiRateLimit = redis
  ? new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 m"), // 5 AI requests per minute
      analytics: true,
      prefix: "ratelimit:ai-strict",
    })
  : null;

// Helper to get client IP from request
export function getClientIP(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");

  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }

  if (realIP) {
    return realIP;
  }

  return "unknown";
}

// Helper interface
export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  reset: number;
}

interface FallbackRateLimitOptions {
  windowMs: number;
  maxRequests: number;
}

interface FallbackRateLimitEntry {
  count: number;
  resetTime: number;
}

const fallbackRateLimitMap = new Map<string, FallbackRateLimitEntry>();

let hasWarnedAboutMissingRedis = false;
let hasWarnedAboutRedisErrors = false;

function inferFallbackRateLimitOptions(identifier: string): FallbackRateLimitOptions {
  if (
    identifier.startsWith("admin-login:") ||
    identifier.startsWith("medewerker-login:") ||
    identifier.startsWith("klant-login:") ||
    identifier.startsWith("medewerker-password-reset:") ||
    identifier.startsWith("medewerker-reset:") ||
    identifier.startsWith("admin-password-reset:") ||
    identifier.startsWith("admin-reset-update:") ||
    identifier.startsWith("2fa-verify:")
  ) {
    return { windowMs: 15 * 60 * 1000, maxRequests: 5 };
  }

  if (identifier.startsWith("klant-register:")) {
    return { windowMs: 15 * 60 * 1000, maxRequests: 3 };
  }

  if (identifier.startsWith("calculator-lead:")) {
    return { windowMs: 60 * 60 * 1000, maxRequests: 10 };
  }

  if (identifier.startsWith("ai-chat:")) {
    return { windowMs: 60 * 1000, maxRequests: 5 };
  }

  if (
    identifier.startsWith("leads:post:") ||
    identifier.startsWith("ai-offerte:")
  ) {
    return { windowMs: 60 * 1000, maxRequests: 10 };
  }

  return { windowMs: 60 * 1000, maxRequests: 5 };
}

function checkMemoryFallbackRateLimit(identifier: string): RateLimitResult {
  const { windowMs, maxRequests } = inferFallbackRateLimitOptions(identifier);
  const now = Date.now();
  const entry = fallbackRateLimitMap.get(identifier);

  if (!entry || now > entry.resetTime) {
    fallbackRateLimitMap.set(identifier, {
      count: 1,
      resetTime: now + windowMs,
    });

    return {
      success: true,
      limit: maxRequests,
      remaining: maxRequests - 1,
      reset: now + windowMs,
    };
  }

  if (entry.count >= maxRequests) {
    return {
      success: false,
      limit: maxRequests,
      remaining: 0,
      reset: entry.resetTime,
    };
  }

  entry.count += 1;

  return {
    success: true,
    limit: maxRequests,
    remaining: maxRequests - entry.count,
    reset: entry.resetTime,
  };
}

setInterval(() => {
  const now = Date.now();

  for (const [key, entry] of fallbackRateLimitMap.entries()) {
    if (now > entry.resetTime) {
      fallbackRateLimitMap.delete(key);
    }
  }
}, 5 * 60 * 1000);

/**
 * Check rate limit using Upstash Redis (production) or in-memory fallback (development)
 *
 * @param identifier - Unique identifier (e.g., IP address, user ID)
 * @param limiter - Ratelimit instance from Upstash
 * @returns Promise<RateLimitResult>
 */
export async function checkRedisRateLimit(
  identifier: string,
  limiter: Ratelimit | null
): Promise<RateLimitResult> {
  if (!limiter) {
    if (!hasWarnedAboutMissingRedis) {
      console.warn("[RATE LIMIT] Redis not configured, using in-memory fallback rate limiting");
      hasWarnedAboutMissingRedis = true;
    }

    return checkMemoryFallbackRateLimit(identifier);
  }

  try {
    const { success, limit, remaining, reset } = await limiter.limit(identifier);

    return {
      success,
      limit,
      remaining,
      reset,
    };
  } catch (error) {
    console.error("[RATE LIMIT] Error checking rate limit:", error);
    if (!hasWarnedAboutRedisErrors) {
      console.warn("[RATE LIMIT] Falling back to in-memory rate limiting after Redis error");
      hasWarnedAboutRedisErrors = true;
    }

    return checkMemoryFallbackRateLimit(identifier);
  }
}
