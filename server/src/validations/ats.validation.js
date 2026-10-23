import mongoose from 'mongoose';
import { BadRequestError } from '../utils/errors.js';
import { EDUCATION_LEVELS } from '../models/jobCriteria.model.js';

/**
 * Validate the request body for PUT /api/jobs/:jobId/criteria
 */
export const validateCriteria = (req, res, next) => {
  const body = req.body || {};
  const errors = [];

  // Validate jobId param
  const jobId = req.params.jobId || req.params.id;
  if (!jobId || !mongoose.Types.ObjectId.isValid(jobId)) {
    return next(new BadRequestError('Invalid job ID format.'));
  }

  // requiredSkills / preferredSkills — arrays of non-empty strings
  for (const field of ['requiredSkills', 'preferredSkills', 'jobDescriptionKeywords']) {
    if (body[field] !== undefined) {
      if (!Array.isArray(body[field])) {
        errors.push({ field, message: `'${field}' must be an array of strings.` });
      } else if (body[field].some((s) => typeof s !== 'string' || !s.trim())) {
        errors.push({ field, message: `'${field}' must contain only non-empty strings.` });
      } else if (body[field].length > 50) {
        errors.push({ field, message: `'${field}' cannot contain more than 50 entries.` });
      }
    }
  }

  // minimumEducation
  if (body.minimumEducation !== undefined) {
    if (!EDUCATION_LEVELS.includes(body.minimumEducation)) {
      errors.push({
        field: 'minimumEducation',
        message: `Invalid education level. Allowed values: ${EDUCATION_LEVELS.join(', ')}.`,
      });
    }
  }

  // preferredEducation
  if (body.preferredEducation !== undefined && typeof body.preferredEducation !== 'string') {
    errors.push({ field: 'preferredEducation', message: 'preferredEducation must be a string.' });
  }

  // minimumExperienceYears
  if (body.minimumExperienceYears !== undefined) {
    const val = Number(body.minimumExperienceYears);
    if (!Number.isFinite(val) || val < 0 || val > 50) {
      errors.push({
        field: 'minimumExperienceYears',
        message: 'minimumExperienceYears must be a number between 0 and 50.',
      });
    }
  }

  // projectRequirements
  if (body.projectRequirements !== undefined) {
    if (typeof body.projectRequirements !== 'string') {
      errors.push({ field: 'projectRequirements', message: 'projectRequirements must be a string.' });
    } else if (body.projectRequirements.length > 1000) {
      errors.push({ field: 'projectRequirements', message: 'projectRequirements cannot exceed 1000 characters.' });
    }
  }

  // weights — all values must be non-negative numbers
  if (body.weights !== undefined) {
    if (typeof body.weights !== 'object' || Array.isArray(body.weights)) {
      errors.push({ field: 'weights', message: 'weights must be an object.' });
    } else {
      const WEIGHT_KEYS = ['skills', 'projects', 'experience', 'education', 'keywords'];
      for (const k of WEIGHT_KEYS) {
        if (body.weights[k] !== undefined) {
          const v = Number(body.weights[k]);
          if (!Number.isFinite(v) || v < 0) {
            errors.push({
              field: `weights.${k}`,
              message: `Weight '${k}' must be a non-negative number.`,
            });
          }
        }
      }
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Validation failed', errors));
  }

  next();
};

/**
 * Validate applicationId param for ATS report routes.
 */
export const validateApplicationId = (req, res, next) => {
  if (!mongoose.Types.ObjectId.isValid(req.params.applicationId)) {
    return next(new BadRequestError('Invalid application ID format.'));
  }
  next();
};

export default { validateCriteria, validateApplicationId };
