import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../utils/errors.js';
import User from '../models/user.model.js';

/**
 * Authentication Middleware
 *
 * Verifies JWT token extracted from either HTTP-only cookie or Bearer Authorization header.
 * Rejects expired, malformed, or missing tokens, and blocks disabled user accounts.
 */
export const authenticate = async (req, res, next) => {
  try {
    let token = null;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    }
    // 2. Check Authorization header (Bearer <token>)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    // 3. Verify token
    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Session expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid authentication token.');
    }

    // 4. Retrieve user and verify account is still active
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new UnauthorizedError('User account not found or has been removed.');
    }

    if (user.status === 'disabled') {
      throw new ForbiddenError('Your account has been disabled. Please contact support.');
    }

    // 5. Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

export default {
  authenticate,
};
