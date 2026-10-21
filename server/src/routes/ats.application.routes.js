import { Router } from 'express';
import {
  authenticate,
  requireActiveAccount,
  authorize,
} from '../middlewares/auth.middleware.js';
import { validateApplicationId } from '../validations/ats.validation.js';
import { requestReport, getReport } from '../controllers/ats.controller.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

// ─── Application-level ATS routes (mounted at /api/applications) ─────────────

/**
 * @route   POST /api/applications/:applicationId/ats
 * @desc    Request / reprocess ATS analysis for an application
 * @access  Private (Recruiter or Admin only)
 */
router.post(
  '/:applicationId/ats',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  validateApplicationId,
  requestReport
);

/**
 * @route   GET /api/applications/:applicationId/ats
 * @desc    Get the ATS report for an application
 * @access  Private (Recruiter or Admin only — candidates blocked)
 */
router.get(
  '/:applicationId/ats',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  validateApplicationId,
  getReport
);

export default router;
