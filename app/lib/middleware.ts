/**
 * Middleware utilities for Cloudflare Workers
 * Provides body size limits, rate limiting, and security headers
 */

// Convert size string (e.g., "10mb") to bytes
function parseSize(size: string): number {
  const units: Record<string, number> = {
    b: 1,
    kb: 1024,
    mb: 1024 * 1024,
    gb: 1024 * 1024 * 1024,
  };

  const match = size.toLowerCase().match(/^(\d+(?:\.\d+)?)\s*([a-z]+)?$/);
  if (!match) throw new Error(`Invalid size format: ${size}`);

  const value = parseFloat(match[1]);
  const unit = match[2] || "b";
  const multiplier = units[unit] || 1;

  return Math.floor(value * multiplier);
}

/**
 * Check if request body size exceeds limit
 */
export async function checkBodySizeLimit(
  request: Request,
  limit: string = "10mb"
): Promise<{ valid: boolean; error?: Response }> {
  const contentLength = request.headers.get("content-length");

  if (contentLength) {
    const sizeLimit = parseSize(limit);
    const requestSize = parseInt(contentLength, 10);

    if (requestSize > sizeLimit) {
      return {
        valid: false,
        error: Response.json(
          {
            error: "Payload too large",
            message: `Request body size (${requestSize} bytes) exceeds limit (${sizeLimit} bytes)`,
          },
          { status: 413 }
        ),
      };
    }
  }

  // For requests without Content-Length, we'd need to read the body
  // but that consumes it, so we'll handle it in the route if needed
  return { valid: true };
}

/**
 * Simple in-memory rate limiter
 * For production, consider using Cloudflare KV or Durable Objects
 */
class RateLimiter {
  private requests: Map<string, { count: number; resetAt: number }> = new Map();
  private readonly windowMs: number;
  private readonly maxRequests: number;

  constructor(maxRequests: number = 100, windowMs: number = 60000) {
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  private getClientId(request: Request): string {
    // Try to get IP from Cloudflare headers
    const cfConnectingIp = request.headers.get("cf-connecting-ip");
    if (cfConnectingIp) return cfConnectingIp;

    // Fallback to user-agent + origin
    const userAgent = request.headers.get("user-agent") || "unknown";
    const origin = request.headers.get("origin") || "unknown";
    return `${userAgent}-${origin}`;
  }

  isAllowed(request: Request): { allowed: boolean; remaining?: number; resetAt?: number } {
    const clientId = this.getClientId(request);
    const now = Date.now();

    const record = this.requests.get(clientId);

    if (!record || now > record.resetAt) {
      // New window
      this.requests.set(clientId, {
        count: 1,
        resetAt: now + this.windowMs,
      });
      return {
        allowed: true,
        remaining: this.maxRequests - 1,
        resetAt: now + this.windowMs,
      };
    }

    if (record.count >= this.maxRequests) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: record.resetAt,
      };
    }

    record.count++;
    this.requests.set(clientId, record);

    return {
      allowed: true,
      remaining: this.maxRequests - record.count,
      resetAt: record.resetAt,
    };
  }

  // Clean up old entries periodically
  cleanup() {
    const now = Date.now();
    for (const [key, value] of this.requests.entries()) {
      if (now > value.resetAt) {
        this.requests.delete(key);
      }
    }
  }
}

// Global rate limiter instance
const rateLimiter = new RateLimiter(100, 60000); // 100 requests per minute

/**
 * Check rate limit for a request
 */
export function checkRateLimit(
  request: Request,
  maxRequests: number = 100,
  windowMs: number = 60000
): { allowed: boolean; error?: Response; headers?: Headers } {
  // Cleanup old entries periodically (every 1000 requests)
  if (Math.random() < 0.001) {
    rateLimiter.cleanup();
  }

  const result = rateLimiter.isAllowed(request);

  const headers = new Headers();
  headers.set("X-RateLimit-Limit", maxRequests.toString());
  headers.set("X-RateLimit-Remaining", (result.remaining ?? 0).toString());
  if (result.resetAt) {
    headers.set("X-RateLimit-Reset", new Date(result.resetAt).toISOString());
  }

  if (!result.allowed) {
    return {
      allowed: false,
      error: Response.json(
        {
          error: "Too many requests",
          message: "Rate limit exceeded. Please try again later.",
        },
        {
          status: 429,
          headers: {
            ...Object.fromEntries(headers),
            "Retry-After": Math.ceil((result.resetAt! - Date.now()) / 1000).toString(),
          },
        }
      ),
      headers,
    };
  }

  return { allowed: true, headers };
}

/**
 * Handle CORS for allowed origin
 */
export function handleCORS(
  request: Request,
  allowedOrigin: string
): { isPreflight: boolean; preflightResponse?: Response } {
  const origin = request.headers.get("Origin");

  // Handle preflight OPTIONS request
  if (request.method === "OPTIONS") {
    if (origin === allowedOrigin) {
      return {
        isPreflight: true,
        preflightResponse: new Response(null, {
          status: 204,
          headers: {
            "Access-Control-Allow-Origin": allowedOrigin,
            "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, PATCH, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400", // 24 hours
            "Access-Control-Allow-Credentials": "true",
          },
        }),
      };
    } else {
      // Origin not allowed, return 403
      return {
        isPreflight: true,
        preflightResponse: new Response("Forbidden", { status: 403 }),
      };
    }
  }

  return { isPreflight: false };
}

/**
 * Add CORS headers to response if origin matches
 */
export function addCORSHeaders(
  response: Response,
  request: Request,
  allowedOrigin: string
): Response {
  const origin = request.headers.get("Origin");

  // Only add CORS headers if origin matches allowed origin
  if (origin === allowedOrigin) {
    const headers = new Headers(response.headers);
    headers.set("Access-Control-Allow-Origin", allowedOrigin);
    headers.set("Access-Control-Allow-Credentials", "true");
    headers.set("Vary", "Origin");

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  }

  return response;
}

/**
 * Add security headers (Helmet-like)
 */
export function addSecurityHeaders(response: Response): Response {
  const headers = new Headers(response.headers);

  // Prevent clickjacking
  headers.set("X-Frame-Options", "DENY");

  // Prevent MIME type sniffing
  headers.set("X-Content-Type-Options", "nosniff");

  // Enable XSS protection
  headers.set("X-XSS-Protection", "1; mode=block");

  // Strict Transport Security (only for HTTPS)
  // Note: Cloudflare Workers handle HTTPS, but check if request is secure
  headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Content Security Policy
  headers.set(
    "Content-Security-Policy",
    "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: https:; connect-src 'self'"
  );

  // Referrer Policy
  headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  // Permissions Policy
  headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=(), speaker=()"
  );

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

/**
 * Apply all middleware to a request
 */
export async function applyMiddleware(
  request: Request,
  options: {
    bodySizeLimit?: string;
    rateLimit?: { maxRequests?: number; windowMs?: number };
    securityHeaders?: boolean;
  } = {}
): Promise<{ error?: Response; modifiedRequest?: Request }> {
  const {
    bodySizeLimit = "10mb",
    rateLimit = { maxRequests: 100, windowMs: 60000 },
    securityHeaders = true,
  } = options;

  // Check body size limit
  const bodyCheck = await checkBodySizeLimit(request, bodySizeLimit);
  if (!bodyCheck.valid) {
    return { error: bodyCheck.error };
  }

  // Check rate limit
  const rateCheck = checkRateLimit(
    request,
    rateLimit.maxRequests,
    rateLimit.windowMs
  );
  if (!rateCheck.allowed) {
    return { error: rateCheck.error };
  }

  return { modifiedRequest: request };
}

