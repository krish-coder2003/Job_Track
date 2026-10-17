import { Router } from 'express';
import {
  getMyApplications,
  getApplicationById,
  cancelApplication,
} from '../controllers/application.controller.js';
import {
  authenticate,
  requireActiveAccount,
  authorize,
} from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

/**
 * @route   GET /api/applications/my
 * @desc    Retrieve all applications submitted by authenticated candidate (with pagination and summary)
 * @access  Private (Candidate only)
 */
router.get(
  '/my',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.CANDIDATE),
  getMyApplications
);

/**
 * @route   GET /api/applications/me
 * @desc    Alias for /api/applications/my
 * @access  Private (Candidate only)
 */
router.get(
  '/me',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.CANDIDATE),
  getMyApplications
);

/**
 * @route   GET /api/applications/:id
 * @desc    Retrieve single application details
 * @access  Private (Applicant, Recruiter owner, or Admin)
 */
router.get(
  '/:id',
  authenticate,
  requireActiveAccount,
  getApplicationById
);

/**
 * @route   PATCH /api/applications/:id/cancel
 * @desc    Cancel / withdraw application when permitted by backend rules
 * @access  Private (Candidate owner only)
 */
router.patch(
  '/:id/cancel',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.CANDIDATE),
  cancelApplication
);

/**
 * @route   DELETE /api/applications/:id
 * @desc    Cancel / withdraw application alias
 * @access  Private (Candidate owner only)
 */
router.delete(
  '/:id',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.CANDIDATE),
  cancelApplication
);

export default router;
