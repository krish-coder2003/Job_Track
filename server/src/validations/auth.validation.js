import { BadRequestError, ForbiddenError } from '../utils/errors.js';
import { USER_ROLES, PUBLIC_ROLES } from '../models/user.model.js';

const EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

/**
 * Middleware to validate registration payload
 */
export const validateRegister = (req, res, next) => {
  const { name, email, password, role } = req.body || {};
  const errors = [];

  // 1. Name validation
  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    errors.push({ field: 'name', message: 'Name is required' });
  } else if (name.trim().length < 2) {
    errors.push({ field: 'name', message: 'Name must be at least 2 characters long' });
  } else if (name.trim().length > 100) {
    errors.push({ field: 'name', message: 'Name cannot exceed 100 characters' });
  }

  // 2. Email validation
  if (!email || typeof email !== 'string' || email.trim().length === 0) {
    errors.push({ field: 'email', message: 'Email is required' });
  } else if (!EMAIL_REGEX.test(email.trim())) {
    errors.push({ field: 'email', message: 'Please provide a valid email address' });
  }

  // 3. Password validation
  if (!password || typeof password !== 'string') {
    errors.push({ field: 'password', message: 'Password is required' });
  } else if (password.length < 8) {
    errors.push({ field: 'password', message: 'Password must be at least 8 characters long' });
  }

  // 4. Role validation & Admin prohibition
  if (role !== undefined && role !== null && role !== '') {
    if (typeof role !== 'string') {
      errors.push({ field: 'role', message: 'Role must be a string' });
    } else {
      const normalizedRole = role.toLowerCase().trim();
      if (normalizedRole === USER_ROLES.ADMIN) {
        return next(
          new ForbiddenError('Public registration cannot assign the admin role.', [
            { field: 'role', message: 'Public registration cannot assign the admin role.' },
          ])
        );
      }
      if (!PUBLIC_ROLES.includes(normalizedRole)) {
        errors.push({
          field: 'role',
          message: `Invalid role '${role}'. Allowed public roles are: ${PUBLIC_ROLES.join(', ')}`,
        });
      }
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed', errors));
  }

  // Normalize inputs on request body
  req.body.name = name.trim();
  req.body.email = email.toLowerCase().trim();
  req.body.role = role ? role.toLowerCase().trim() : USER_ROLES.CANDIDATE;

  next();
};
