import { BadRequestError, ForbiddenError } from '../utils/errors.js';
import {
  JOB_STATUS,
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
  ALLOWED_STATUS_TRANSITIONS,
} from '../models/job.model.js';

// Fields that cannot be mass assigned or overwritten by clients
const PROTECTED_FIELDS = ['recruiter', '_id', 'id', 'isApproved', 'createdAt', 'updatedAt'];

/**
 * Validates request payload for creating a new job listing
 */
export const validateCreateJob = (req, res, next) => {
  const errors = [];
  const body = req.body || {};

  // 1. Detect mass assignment attempts on protected fields
  for (const field of PROTECTED_FIELDS) {
    if (body[field] !== undefined) {
      return next(
        new ForbiddenError(
          `Protected field '${field}' cannot be specified in the request body.`
        )
      );
    }
  }

  // 2. Validate required string fields
  if (!body.title || typeof body.title !== 'string' || body.title.trim().length < 3) {
    errors.push({
      field: 'title',
      message: 'Job title is required and must be at least 3 characters long.',
    });
  }

  if (!body.company || typeof body.company !== 'string' || body.company.trim().length < 2) {
    errors.push({
      field: 'company',
      message: 'Company name is required and must be at least 2 characters long.',
    });
  }

  if (!body.description || typeof body.description !== 'string' || body.description.trim().length < 10) {
    errors.push({
      field: 'description',
      message: 'Job description is required and must be at least 10 characters long.',
    });
  }

  if (!body.location || typeof body.location !== 'string' || body.location.trim().length === 0) {
    errors.push({
      field: 'location',
      message: 'Job location is required.',
    });
  }

  // 3. Validate Enum fields
  const validJobTypes = Object.values(JOB_TYPES);
  if (!body.jobType || !validJobTypes.includes(body.jobType)) {
    errors.push({
      field: 'jobType',
      message: `Invalid jobType. Allowed values: ${validJobTypes.join(', ')}.`,
    });
  }

  const validWorkModes = Object.values(WORK_MODES);
  if (!body.workMode || !validWorkModes.includes(body.workMode)) {
    errors.push({
      field: 'workMode',
      message: `Invalid workMode. Allowed values: ${validWorkModes.join(', ')}.`,
    });
  }

  const validExperienceLevels = Object.values(EXPERIENCE_LEVELS);
  if (!body.experienceLevel || !validExperienceLevels.includes(body.experienceLevel)) {
    errors.push({
      field: 'experienceLevel',
      message: `Invalid experienceLevel. Allowed values: ${validExperienceLevels.join(', ')}.`,
    });
  }

  // 4. Validate optional status
  if (body.status !== undefined) {
    const validStatuses = Object.values(JOB_STATUS);
    if (!validStatuses.includes(body.status)) {
      errors.push({
        field: 'status',
        message: `Invalid job status. Allowed values: ${validStatuses.join(', ')}.`,
      });
    }
  }

  // 5. Validate optional salary
  if (body.salary) {
    const { min, max, period } = body.salary;
    if (min !== undefined && min !== null) {
      if (typeof min !== 'number' || min < 0) {
        errors.push({ field: 'salary.min', message: 'Minimum salary must be a non-negative number.' });
      }
    }
    if (max !== undefined && max !== null) {
      if (typeof max !== 'number' || max < 0) {
        errors.push({ field: 'salary.max', message: 'Maximum salary must be a non-negative number.' });
      }
    }
    if (min != null && max != null && min > max) {
      errors.push({ field: 'salary', message: 'Minimum salary cannot exceed maximum salary.' });
    }
    if (period && !['yearly', 'monthly', 'hourly', 'weekly'].includes(period)) {
      errors.push({ field: 'salary.period', message: 'Invalid salary period.' });
    }
  }

  // 6. Validate optional deadline
  if (body.applicationDeadline) {
    const deadline = new Date(body.applicationDeadline);
    if (isNaN(deadline.getTime())) {
      errors.push({ field: 'applicationDeadline', message: 'Application deadline must be a valid date.' });
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Job creation validation failed.', errors));
  }

  next();
};

/**
 * Validates request payload for updating an existing job listing
 */
export const validateUpdateJob = (req, res, next) => {
  const errors = [];
  const body = req.body || {};

  // 1. Prevent mass assignment
  for (const field of PROTECTED_FIELDS) {
    if (body[field] !== undefined) {
      return next(
        new ForbiddenError(
          `Protected field '${field}' cannot be modified via update payload.`
        )
      );
    }
  }

  // Ensure body is not empty
  if (Object.keys(body).length === 0) {
    return next(new BadRequestError('Request body cannot be empty for update.'));
  }

  // 2. Validate string fields if provided
  if (body.title !== undefined) {
    if (typeof body.title !== 'string' || body.title.trim().length < 3) {
      errors.push({ field: 'title', message: 'Title must be at least 3 characters long.' });
    }
  }

  if (body.company !== undefined) {
    if (typeof body.company !== 'string' || body.company.trim().length < 2) {
      errors.push({ field: 'company', message: 'Company must be at least 2 characters long.' });
    }
  }

  if (body.description !== undefined) {
    if (typeof body.description !== 'string' || body.description.trim().length < 10) {
      errors.push({ field: 'description', message: 'Description must be at least 10 characters long.' });
    }
  }

  if (body.location !== undefined) {
    if (typeof body.location !== 'string' || body.location.trim().length === 0) {
      errors.push({ field: 'location', message: 'Location cannot be empty.' });
    }
  }

  // 3. Validate enums if provided
  if (body.jobType !== undefined && !Object.values(JOB_TYPES).includes(body.jobType)) {
    errors.push({ field: 'jobType', message: `Invalid jobType: ${body.jobType}.` });
  }

  if (body.workMode !== undefined && !Object.values(WORK_MODES).includes(body.workMode)) {
    errors.push({ field: 'workMode', message: `Invalid workMode: ${body.workMode}.` });
  }

  if (body.experienceLevel !== undefined && !Object.values(EXPERIENCE_LEVELS).includes(body.experienceLevel)) {
    errors.push({ field: 'experienceLevel', message: `Invalid experienceLevel: ${body.experienceLevel}.` });
  }

  // 4. Validate status transition if provided in general update
  if (body.status !== undefined && req.job) {
    const validStatuses = Object.values(JOB_STATUS);
    if (!validStatuses.includes(body.status)) {
      errors.push({ field: 'status', message: `Invalid job status: ${body.status}.` });
    } else if (body.status !== req.job.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[req.job.status] || [];
      if (!allowedNext.includes(body.status)) {
        errors.push({
          field: 'status',
          message: `Cannot transition job status from '${req.job.status}' to '${body.status}'. Allowed: ${allowedNext.join(', ')}.`,
        });
      }
    }
  }

  // 5. Validate salary if provided
  if (body.salary) {
    const min = body.salary.min !== undefined ? body.salary.min : req.job?.salary?.min;
    const max = body.salary.max !== undefined ? body.salary.max : req.job?.salary?.max;
    if (min != null && max != null && min > max) {
      errors.push({ field: 'salary', message: 'Minimum salary cannot exceed maximum salary.' });
    }
  }

  if (errors.length > 0) {
    return next(new BadRequestError('Job update validation failed.', errors));
  }

  next();
};

/**
 * Validates status transition on PATCH /api/jobs/:id/status
 */
export const validateJobStatus = (req, res, next) => {
  const { status } = req.body || {};

  if (!status) {
    return next(new BadRequestError('Status is required in request body.'));
  }

  const validStatuses = Object.values(JOB_STATUS);
  if (!validStatuses.includes(status)) {
    return next(
      new BadRequestError(
        `Invalid status '${status}'. Allowed statuses: ${validStatuses.join(', ')}.`
      )
    );
  }

  const currentStatus = req.job?.status;
  if (currentStatus && status !== currentStatus) {
    const allowed = ALLOWED_STATUS_TRANSITIONS[currentStatus] || [];
    if (!allowed.includes(status)) {
      return next(
        new BadRequestError(
          `Cannot transition job status from '${currentStatus}' to '${status}'. Allowed transitions: ${allowed.join(', ') || 'none'}.`
        )
      );
    }
  }

  next();
};

export default {
  validateCreateJob,
  validateUpdateJob,
  validateJobStatus,
};
