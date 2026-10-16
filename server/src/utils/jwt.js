import jwt from 'jsonwebtoken';

export const COOKIE_NAME = 'jobtrack_token';

/**
 * Retrieve the JWT secret securely from environment variables.
 * Never hardcodes or falls back to an insecure default secret.
 */
export const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.trim() === '') {
    throw new Error('JWT_SECRET is not configured in environment variables.');
  }
  return secret;
};

/**
 * Generate a signed JWT token
 *
 * @param {Object} payload - Data to embed in token (e.g. { id, role })
 * @param {Object} options - Custom sign options (expiresIn, etc.)
 * @returns {string} Signed JWT
 */
export const generateToken = (payload, options = {}) => {
  const secret = getJwtSecret();
  const expiresIn = options.expiresIn || process.env.JWT_EXPIRES_IN || '7d';

  return jwt.sign(payload, secret, {
    expiresIn,
    ...options,
  });
};

/**
 * Verify and decode a JWT token
 *
 * @param {string} token - The JWT string
 * @returns {Object} Decoded payload
 */
export const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};

/**
 * Standard cookie configuration for storing JWTs securely
 *
 * Security features:
 * - httpOnly: Inaccessible to JavaScript (prevents XSS theft)
 * - secure: Transmitted only over HTTPS in production
 * - sameSite: 'strict' in production / 'lax' in dev (defends against CSRF attacks)
 * - maxAge: 7 days by default
 */
export const getCookieOptions = () => {
  const isProduction = process.env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: isProduction ? 'strict' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
    path: '/',
  };
};

export default {
  COOKIE_NAME,
  generateToken,
  verifyToken,
  getCookieOptions,
  getJwtSecret,
};
