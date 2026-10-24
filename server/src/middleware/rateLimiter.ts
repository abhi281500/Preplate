import { Request, Response, NextFunction } from 'express';
import { env } from '../config/env.js';

interface RateLimitStore {
  [key: string]: {
    count: number;
    resetTime: number;
  };
}

/**
 * Creates an in-memory sliding window rate limiter middleware.
 * Automatically bypassed in test mode to maintain fast, deterministic test suites.
 *
 * @param windowMs Time frame in milliseconds
 * @param maxRequests Maximum allowed requests within windowMs
 * @param message Custom error message on rate limit breach
 */
export const createRateLimiter = (
  windowMs: number = 60 * 1000,
  maxRequests: number = 30,
  message: string = 'Too many requests from this IP. Please try again after 1 minute.'
) => {
  const store: RateLimitStore = {};

  // Housekeeping interval to purge expired memory entries every 5 minutes
  if (env.NODE_ENV !== 'test') {
    setInterval(() => {
      const now = Date.now();
      for (const ip in store) {
        if (store[ip].resetTime <= now) {
          delete store[ip];
        }
      }
    }, 5 * 60 * 1000).unref();
  }

  return (req: Request, res: Response, next: NextFunction): void => {
    // Skip rate limiting in automated testing environments
    if (env.NODE_ENV === 'test') {
      next();
      return;
    }

    const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0].trim() ||
      req.socket.remoteAddress ||
      'unknown-ip';

    const key = `${req.path}:${clientIp}`;
    const now = Date.now();

    if (!store[key] || store[key].resetTime <= now) {
      store[key] = {
        count: 1,
        resetTime: now + windowMs
      };
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      next();
      return;
    }

    store[key].count += 1;
    const remaining = Math.max(0, maxRequests - store[key].count);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(store[key].resetTime / 1000));

    if (store[key].count > maxRequests) {
      const retryAfterSeconds = Math.ceil((store[key].resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.status(429).json({
        success: false,
        message,
        retryAfter: retryAfterSeconds
      });
      return;
    }

    next();
  };
};

// Specialized presets for sensitive endpoints
export const authRateLimiter = createRateLimiter(
  60 * 1000,
  15,
  'Too many login attempts. Please wait 60 seconds before trying again.'
);

export const orderPlacementRateLimiter = createRateLimiter(
  60 * 1000,
  30,
  'Order request limit reached. Please wait a moment before submitting another request.'
);
