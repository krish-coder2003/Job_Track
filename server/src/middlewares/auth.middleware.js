import { verifyToken, COOKIE_NAME } from '../utils/jwt.js';
import {
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  NotFoundError,
} from '../utils/errors.js';
import User, { USER_ROLES } from '../models/user.model.js';
import Job from '../models/job.model.js';
import mongoose from 'mongoose';

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
    let isCookieAuth = false;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
      isCookieAuth = true;
    }
    // 2. Check Authorization header (Bearer <token>)
    else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
      isCookieAuth = false;
    }

    if (!token) {
      throw new UnauthorizedError('Authentication required. No token provided.');
    }

    // CSRF Defense: On state-changing mutations authenticated via cookie,
    // ensure Origin matches allowed frontend origin if Origin header is present.
    if (isCookieAuth && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      const origin = req.headers.origin;
      if (origin) {
        const allowedOrigins = [
          process.env.CLIENT_URL || 'http://localhost:5173',
          'http://localhost:5173',
          'http://localhost:3000',
        ].map((url) => url.toLowerCase().replace(/\/$/, ''));

        const cleanOrigin = origin.toLowerCase().replace(/\/$/, '');
        if (!allowedOrigins.includes(cleanOrigin)) {
          throw new ForbiddenError(
            'Cross-site request blocked: Origin not allowed (CSRF Protection).'
          );
        }
      }
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
 * Optional Authentication Middleware
 *
 * Extracts authenticated user if token is present, but allows guest access if absent or invalid.
 */
export const optionalAuthenticate = async (req, res, next) => {
  try {
    let token = null;

    if (req.cookies && req.cookies[COOKIE_NAME]) {
      token = req.cookies[COOKIE_NAME];
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer ')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (token) {
      try {
        const decoded = verifyToken(token);
        const user = await User.findById(decoded.id);
        if (user && user.status === 'active') {
          req.user = user;
        }
      } catch {
        // Silently proceed as guest
      }
    }

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

/**
 * Job Ownership Verification Middleware
 *
 * Verifies that the requested Job exists and that the authenticated user is the recruiter
 * who created it (or has an admin role).
 * Attaches the retrieved Job document to req.job.
 */
export const checkJobOwnership = async (req, res, next) => {
  try {
    if (!req.user) {
      return next(new UnauthorizedError('Authentication required.'));
    }

    const { id } = req.params;
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return next(new BadRequestError(`Invalid job ID format: ${id}`));
    }

    const job = await Job.findById(id);
    if (!job) {
      return next(new NotFoundError(`Job with ID ${id} not found.`));
    }

    const isOwner = job.recruiter.toString() === req.user._id.toString();
    const isAdmin = req.user.role === USER_ROLES.ADMIN;

    if (!isOwner && !isAdmin) {
      return next(
        new ForbiddenError('Access forbidden: You do not have permission to modify or delete this job.')
      );
    }

    req.job = job;
    next();
  } catch (error) {
    next(error);
  }
};

export default {
  authenticate,
  optionalAuthenticate,
  requireActiveAccount,
  authorize,
  checkOwnership,
  checkJobOwnership,
  preventRoleChange,
};


