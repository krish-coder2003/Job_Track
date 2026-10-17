import { Router } from 'express';
import { getMyApplications } from '../controllers/application.controller.js';
import {
  authenticate,
  requireActiveAccount,
  authorize,
} from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

/**
 * @route   GET /api/applications/me
 * @desc    Retrieve all applications submitted by authenticated candidate
 * @access  Private (Candidate only)
 */
router.get(
  '/me',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.CANDIDATE),
  getMyApplications
);

export default router;
