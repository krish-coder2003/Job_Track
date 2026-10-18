/**
 * Lightweight in-memory rate limiting middleware.
 * Defends against brute-force attacks and denial-of-service spam.
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000, // 15 minutes
  max = 100, // Limit each IP to 100 requests per windowMs
  message = 'Too many requests from this IP, please try again later.',
  skip = () => false,
} = {}) => {
  const hits = new Map();

  // Periodic cleanup of expired IP records
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(ip);
      }
    }
  }, Math.min(windowMs, 60000));
  cleanupInterval.unref(); // Ensure timer does not block Node process exit

  return (req, res, next) => {
    // Skip if configured (e.g. in test environment)
    if (skip(req)) {
      return next();
    }

    // Determine client IP
    const clientIp =
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.connection?.remoteAddress ||
      'unknown-ip';

    const now = Date.now();
    let record = hits.get(clientIp);

    if (!record || now > record.resetTime) {
      record = {
        count: 1,
        resetTime: now + windowMs,
      };
      hits.set(clientIp, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    // Standard rate limit headers
    res.setHeader('RateLimit-Limit', max);
    res.setHeader('RateLimit-Remaining', remaining);
    res.setHeader('RateLimit-Reset', resetSeconds);

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        success: false,
        message,
        retryAfter: resetSeconds,
      });
    }

    next();
  };
};

// Global API rate limiter (allows 500 requests per 15 minutes per IP)
export const globalRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 500,
  message: 'Too many requests from this IP, please try again later.',
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
});

// Sensitive auth rate limiter (allows 20 login/register attempts per 15 minutes per IP)
export const authRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many authentication attempts. Please try again after 15 minutes.',
  skip: (req) => process.env.NODE_ENV === 'test' && !req.headers['x-test-rate-limit'],
});

export default {
  createRateLimiter,
  globalRateLimiter,
  authRateLimiter,
};
