import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import User, { USER_ROLES } from '../models/user.model.js';

/**
 * Authentication Middleware
 *
 * Verifies JWT token extracted from either HTTP-only cookie or Bearer Authorization header.
 * Attaches the authenticated user document to req.user.
 * Returns 401 Unauthorized for missing, expired, or invalid tokens.
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

    // 4. Retrieve user and verify existence
    const user = await User.findById(decoded.id);

    if (!user) {
      throw new UnauthorizedError('User account not found or has been removed.');
    }

    // 5. Attach authenticated user to request
    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Account Status Verification Middleware
 *
 * Ensures that the authenticated user account is in 'active' status.
 * Rejects disabled/suspended accounts with 403 Forbidden.
 */
export const requireActiveAccount = (req, res, next) => {
  if (!req.user) {
    return next(new UnauthorizedError('Authentication required.'));
  }

  if (req.user.status !== 'active') {
    return next(
      new ForbiddenError('Your account has been disabled. Please contact support.')
    );
  }

  next();
};

/**
 * Role-Based Authorization Middleware
 *
 * Restricts endpoint access to users possessing one of the specified roles.
 * Returns 403 Forbidden with descriptive messages for candidates and recruiters.
 *
 * @param  {...string|string[]} allowedRoles - Permitted role strings (e.g. 'recruiter', 'admin')
 */
export const authorize = (...allowedRoles) => {
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    if (!roles.includes(req.user.role)) {
      let message = `Access forbidden: Insufficient role permissions. Requires one of: ${roles.join(', ')}.`;

      // Context-aware forbidden messages for specific domain boundaries
      if (roles.includes(USER_ROLES.RECRUITER) && req.user.role === USER_ROLES.CANDIDATE) {
        message = 'Access forbidden: Candidates cannot create or manage recruiter job listings.';
      } else if (roles.includes(USER_ROLES.ADMIN) && req.user.role === USER_ROLES.RECRUITER) {
        message = 'Access forbidden: Recruiters cannot access admin APIs.';
      } else if (roles.includes(USER_ROLES.ADMIN) && req.user.role === USER_ROLES.CANDIDATE) {
        message = 'Access forbidden: Candidates cannot access admin APIs.';
      }

      return next(new ForbiddenError(message));
    }

    next();
  };
};

/**
 * Resource Ownership Verification Middleware
 *
 * Reusable middleware ensuring the authenticated user owns the resource being accessed or modified.
 * Allows administrative bypass unless explicitly configured otherwise.
 *
 * @param {string|Function|Object} optionsOrResolver - Parameter name, extractor function, or options object
 */
export const checkOwnership = (optionsOrResolver = 'userId') => {
  return async (req, res, next) => {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    // Determine admin override policy (defaults to true)
    const allowAdmin =
      typeof optionsOrResolver === 'object' && optionsOrResolver.allowAdmin !== undefined
        ? optionsOrResolver.allowAdmin
        : true;

    if (allowAdmin && req.user.role === USER_ROLES.ADMIN) {
      return next();
    }

    let ownerId = null;

    if (typeof optionsOrResolver === 'function') {
      ownerId = await optionsOrResolver(req);
    } else if (typeof optionsOrResolver === 'string') {
      ownerId = req.params[optionsOrResolver] || req.body[optionsOrResolver];
    } else if (typeof optionsOrResolver === 'object') {
      const { param = 'userId', getOwnerId } = optionsOrResolver;
      if (typeof getOwnerId === 'function') {
        ownerId = await getOwnerId(req);
      } else {
        ownerId = req.params[param] || req.params.id || req.body[param];
      }
    }

    if (!ownerId) {
      return next(
        new BadRequestError('Resource owner identifier is missing or could not be determined.')
      );
    }

    const currentUserId = req.user._id ? req.user._id.toString() : req.user.id?.toString();
    const targetOwnerId = ownerId.toString();

    if (currentUserId !== targetOwnerId) {
      return next(
        new ForbiddenError('Access forbidden: You do not have permission to access or modify this resource.')
      );
    }

    next();
  };
};

/**
 * Role Modification Prevention Middleware
 *
 * Prevents users from escalating privileges or changing their own role via profile update payloads.
 * Only administrators can alter user roles.
 */
export const preventRoleChange = (req, res, next) => {
  if (req.body && req.body.role !== undefined) {
    if (!req.user || req.user.role !== USER_ROLES.ADMIN) {
      return next(
        new ForbiddenError('Access forbidden: Users cannot change their own role through profile updates.')
      );
    }
  }
  next();
};

export default {
  authenticate,
  requireActiveAccount,
  authorize,
  checkOwnership,
  preventRoleChange,
};

