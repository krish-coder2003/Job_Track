import { Router } from 'express';
import {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  updateJobStatus,
} from '../controllers/job.controller.js';
import {
  authenticate,
  optionalAuthenticate,
  requireActiveAccount,
  authorize,
  checkJobOwnership,
} from '../middlewares/auth.middleware.js';
import {
  validateCreateJob,
  validateUpdateJob,
  validateJobStatus,
} from '../validations/job.validation.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

/**
 * @route   GET /api/jobs
 * @desc    Get all active, approved jobs for public users (or recruiter's own with myJobs=true)
 * @access  Public
 */
router.get('/', optionalAuthenticate, getJobs);

/**
 * @route   GET /api/jobs/:id
 * @desc    Get job details by ID (active/approved for public, or private for owner/admin)
 * @access  Public (active/approved) / Private (draft/closed/archived)
 */
router.get('/:id', optionalAuthenticate, getJobById);

/**
 * @route   POST /api/jobs
 * @desc    Create a new job listing
 * @access  Private (Authorized Recruiters and Admin only)
 */
router.post(
  '/',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  validateCreateJob,
  createJob
);

/**
 * @route   PATCH /api/jobs/:id
 * @desc    Update an existing job listing
 * @access  Private (Job owner or Admin only)
 */
router.patch(
  '/:id',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  checkJobOwnership,
  validateUpdateJob,
  updateJob
);

/**
 * @route   DELETE /api/jobs/:id
 * @desc    Delete a job listing
 * @access  Private (Job owner or Admin only)
 */
router.delete(
  '/:id',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  checkJobOwnership,
  deleteJob
);

/**
 * @route   PATCH /api/jobs/:id/status
 * @desc    Transition job status (e.g. active -> closed, draft -> active)
 * @access  Private (Job owner or Admin only)
 */
router.patch(
  '/:id/status',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  checkJobOwnership,
  validateJobStatus,
  updateJobStatus
);

export default router;
