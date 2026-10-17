import mongoose from 'mongoose';
import { BadRequestError, ForbiddenError } from '../utils/errors.js';

const FORBIDDEN_APPLICATION_FIELDS = ['status', '_id', 'createdAt', 'updatedAt', 'id'];

/**
 * Validates candidate job application submission payload and params.
 * Enforces parameter format, optional cover letter constraints, and
 * prevents impersonation or forbidden field mutations.
 */
export const validateApplyJob = (req, res, next) => {
  const errors = [];
  const { id } = req.params;
  const body = req.body || {};

  // 1. Validate Job ID format
  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return next(new BadRequestError('Invalid job ID format.'));
  }

  // 2. Prevent impersonation: candidates cannot submit on behalf of other users
  const authenticatedUserId = req.user?._id?.toString();
  const impersonationKeys = ['candidate', 'candidateId', 'userId', 'applicantId', 'user'];

  for (const key of impersonationKeys) {
    if (body[key] !== undefined && body[key] !== null) {
      const specifiedId = typeof body[key] === 'object' && body[key]._id
        ? body[key]._id.toString()
        : body[key].toString();

      if (specifiedId !== authenticatedUserId) {
        return next(
          new ForbiddenError('Cannot submit applications on behalf of another user.')
        );
      }
    }
  }

  // 3. Prevent tampering with internal fields
  for (const field of FORBIDDEN_APPLICATION_FIELDS) {
    if (body[field] !== undefined) {
      return next(
        new ForbiddenError(`Modifying field '${field}' is not permitted during application submission.`)
      );
    }
  }

  // 4. Validate optional cover letter
  if (body.coverLetter !== undefined && body.coverLetter !== null) {
    if (typeof body.coverLetter !== 'string') {
      errors.push({
        field: 'coverLetter',
        message: 'Cover letter must be a string.',
      });
    } else if (body.coverLetter.trim().length > 5000) {
      errors.push({
        field: 'coverLetter',
        message: 'Cover letter cannot exceed 5000 characters.',
      });
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed.', errors));
  }

  next();
};

export default {
  validateApplyJob,
};
