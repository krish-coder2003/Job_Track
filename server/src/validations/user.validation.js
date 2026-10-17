import { BadRequestError, ForbiddenError } from '../utils/errors.js';

const IMMUTABLE_FIELDS = [
  'role',
  'status',
  'accountStatus',
  'email',
  '_id',
  'id',
  'password',
  'passwordHash',
  'resume',
  'resumeInformation',
  'createdAt',
  'updatedAt',
];

/**
 * Validates request payload for PATCH /api/users/me
 */
export const validateUpdateMe = (req, res, next) => {
  const body = req.body || {};
  const errors = [];

  // 1. Prevent mass assignment or modification of immutable/security-sensitive fields
  for (const field of IMMUTABLE_FIELDS) {
    if (body[field] !== undefined) {
      return next(
        new ForbiddenError(
          `Field '${field}' is protected and cannot be modified via profile update.`
        )
      );
    }
  }

  // Ensure request body has at least one valid field to update
  const updatableFields = ['name', 'phone', 'location', 'skills', 'experience'];
  const hasUpdate = updatableFields.some((f) => body[f] !== undefined);

  if (!hasUpdate) {
    return next(
      new BadRequestError(
        'Request body must include at least one valid field to update (name, phone, location, skills, experience).'
      )
    );
  }

  // 2. Validate name if provided
  if (body.name !== undefined) {
    if (typeof body.name !== 'string' || body.name.trim().length < 2) {
      errors.push({
        field: 'name',
        message: 'Name must be at least 2 characters long.',
      });
    } else if (body.name.trim().length > 100) {
      errors.push({
        field: 'name',
        message: 'Name cannot exceed 100 characters.',
      });
    }
  }

  // 3. Validate phone if provided
  if (body.phone !== undefined && body.phone !== '') {
    if (typeof body.phone !== 'string') {
      errors.push({
        field: 'phone',
        message: 'Phone number must be a valid string.',
      });
    } else {
      const cleaned = body.phone.replace(/[\s\-().+]/g, '');
      if (!/^\d{7,15}$/.test(cleaned)) {
        errors.push({
          field: 'phone',
          message: 'Please provide a valid phone number (7-15 digits).',
        });
      }
    }
  }

  // 4. Validate location if provided
  if (body.location !== undefined && body.location !== '') {
    if (typeof body.location !== 'string' && typeof body.location !== 'object') {
      errors.push({
        field: 'location',
        message: 'Location must be a string or address object.',
      });
    }
  }

  // 5. Validate skills if provided
  if (body.skills !== undefined) {
    if (Array.isArray(body.skills)) {
      if (body.skills.some((s) => typeof s !== 'string')) {
        errors.push({
          field: 'skills',
          message: 'All skills in array must be strings.',
        });
      }
    } else if (typeof body.skills !== 'string') {
      errors.push({
        field: 'skills',
        message: 'Skills must be an array of strings or comma-separated string.',
      });
    }
  }

  // 6. Validate experience if provided
  if (body.experience !== undefined) {
    if (Array.isArray(body.experience)) {
      body.experience.forEach((exp, idx) => {
        if (typeof exp !== 'object' || exp === null) {
          errors.push({
            field: `experience[${idx}]`,
            message: 'Experience entry must be an object.',
          });
        } else {
          if (exp.years !== undefined && exp.years !== null) {
            if (typeof exp.years !== 'number' || exp.years < 0) {
              errors.push({
                field: `experience[${idx}].years`,
                message: 'Years of experience cannot be negative.',
              });
            }
          }
        }
      });
    } else if (typeof body.experience !== 'number' && typeof body.experience !== 'string') {
      errors.push({
        field: 'experience',
        message: 'Experience must be an array of experience items, years number, or string.',
      });
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed for profile update.', errors));
  }

  next();
};

export default {
  validateUpdateMe,
};
