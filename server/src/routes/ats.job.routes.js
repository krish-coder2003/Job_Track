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
  ['/:jobId/criteria', '/:id/criteria'],
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  validateCriteria,
  upsertJobCriteria
);

router.get(
  ['/:jobId/criteria', '/:id/criteria'],
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  getJobCriteria
);

router.get(
  ['/:jobId/ats-reports', '/:id/ats-reports'],
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  checkJobOwnership,
  getJobReports
);

export default router;
