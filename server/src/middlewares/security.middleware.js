/**
 * Security Headers Middleware
 *
 * Enforces OWASP-recommended HTTP security headers to protect against
 * MIME-type sniffing, Clickjacking, and Cross-Site Scripting.
 */
export const securityHeaders = (req, res, next) => {
  // Prevent browsers from MIME-sniffing the response away from declared Content-Type
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent clickjacking by disallowing framing
  res.setHeader('X-Frame-Options', 'DENY');

  // Disable buggy legacy XSS auditor in modern browsers per OWASP guidelines
  res.setHeader('X-XSS-Protection', '0');

  // Control referrer information sent in HTTP requests
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Enforce HTTPS in production via Strict-Transport-Security (HSTS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader(
      'Strict-Transport-Security',
      'max-age=31536000; includeSubDomains; preload'
    );
  }

  next();
};

export default securityHeaders;
