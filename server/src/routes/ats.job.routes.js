import { Router } from 'express';
import {
  authenticate,
  requireActiveAccount,
  authorize,
  checkJobOwnership,
} from '../middlewares/auth.middleware.js';
import { validateCriteria } from '../validations/ats.validation.js';
import {
  upsertJobCriteria,
  getJobCriteria,
  getJobReports,
} from '../controllers/ats.controller.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

// ─── Job criteria routes (mounted at /api/jobs/:jobId) ───────────────────────

/**
 * @route   PUT /api/jobs/:jobId/criteria
 * @desc    Create or update ATS evaluation criteria for a job
 * @access  Private (Recruiter owner or Admin)
 */
router.put(
  '/:jobId/criteria',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  validateCriteria,
  upsertJobCriteria
);

/**
 * @route   GET /api/jobs/:jobId/criteria
 * @desc    Retrieve ATS evaluation criteria for a job
 * @access  Private (Recruiter owner or Admin)
 */
router.get(
  '/:jobId/criteria',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  getJobCriteria
);

/**
 * @route   GET /api/jobs/:jobId/ats-reports
 * @desc    Retrieve ATS score summaries for all applicants to a job
 * @access  Private (Recruiter owner or Admin)
 */
router.get(
  '/:jobId/ats-reports',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  checkJobOwnership,
  getJobReports
);

export default router;
