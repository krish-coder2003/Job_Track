import { Router } from 'express';
import {
  getMe,
  updateMe,
  uploadResume,
  getResume,
} from '../controllers/user.controller.js';
import {
  authenticate,
  requireActiveAccount,
  authorize,
} from '../middlewares/auth.middleware.js';
import {
  resumeUploadMiddleware,
  validateResumeMagicBytes,
} from '../middlewares/upload.middleware.js';
import { validateUpdateMe } from '../validations/user.validation.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

/**
 * @route   GET /api/users/me
 * @desc    Get currently authenticated candidate / user profile
 * @access  Private (Authenticated users with active account)
 */
router.get('/me', authenticate, requireActiveAccount, getMe);

/**
 * @route   PATCH /api/users/me
 * @desc    Update candidate profile details (name, phone, location, skills, experience)
 * @access  Private (Authenticated users with active account)
 */
router.patch('/me', authenticate, requireActiveAccount, validateUpdateMe, updateMe);

/**
 * @route   POST /api/users/me/resume
 * @desc    Upload or replace a candidate resume (PDF or DOCX with magic byte validation)
 * @access  Private (Candidates with active account only)
 */
router.post(
  '/me/resume',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.CANDIDATE),
  resumeUploadMiddleware,
  validateResumeMagicBytes,
  uploadResume
);

/**
 * @route   GET /api/users/me/resume
 * @desc    Authorized access to current candidate's own resume
 * @access  Private (Owner candidate)
 */
router.get('/me/resume', authenticate, requireActiveAccount, getResume);

/**
 * @route   GET /api/users/:userId/resume
 * @desc    Authorized access to a candidate's resume (Candidate owner, Recruiter, Admin)
 * @access  Private (Authorized roles only)
 */
router.get('/:userId/resume', authenticate, requireActiveAccount, getResume);

export default router;
