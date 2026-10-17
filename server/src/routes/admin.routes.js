import { Router } from 'express';
import {
  getAdminDashboard,
  getAdminUsers,
  updateUserStatus,
  getAdminJobs,
  moderateJob,
} from '../controllers/admin.controller.js';
import {
  authenticate,
  requireActiveAccount,
  authorize,
} from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

// Protect all admin endpoints with authentication, active account requirement, and ADMIN role
router.use(authenticate, requireActiveAccount, authorize(USER_ROLES.ADMIN));

/**
 * @route   GET /api/admin/dashboard
 * @desc    Retrieve platform metrics and overview stats
 * @access  Private (Admin only)
 */
router.get('/dashboard', getAdminDashboard);

/**
 * @route   GET /api/admin/users
 * @desc    Search, filter, and paginate platform users
 * @access  Private (Admin only)
 */
router.get('/users', getAdminUsers);

/**
 * @route   PATCH /api/admin/users/:id/status
 * @desc    Disable or reactivate user account (safeguards last active admin)
 * @access  Private (Admin only)
 */
router.patch('/users/:id/status', updateUserStatus);

/**
 * @route   GET /api/admin/jobs
 * @desc    Review and filter platform-wide job listings with applicant counts
 * @access  Private (Admin only)
 */
router.get('/jobs', getAdminJobs);

/**
 * @route   PATCH /api/admin/jobs/:id/moderation
 * @desc    Moderate job listing (approve, reject, add notes)
 * @access  Private (Admin only)
 */
router.patch('/jobs/:id/moderation', moderateJob);

export default router;
