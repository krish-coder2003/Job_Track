import { Router } from 'express';
import { register, login, logout, getMe, updateProfile } from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../validations/auth.validation.js';
import {
  authenticate,
  authorize,
  requireActiveAccount,
  checkOwnership,
  preventRoleChange,
} from '../middlewares/auth.middleware.js';
import { USER_ROLES } from '../models/user.model.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account (candidate or recruiter)
 * @access  Public
 */
router.post('/register', validateRegister, register);

/**
 * @route   POST /api/auth/login
 * @desc    Authenticate user credentials, set HTTP-only cookie & return JWT
 * @access  Public
 */
router.post('/login', validateLogin, login);

/**
 * @route   POST /api/auth/logout
 * @desc    Clear authentication cookie & end session
 * @access  Public
 */
router.post('/logout', logout);

/**
 * @route   GET /api/auth/me
 * @desc    Get currently authenticated user profile
 * @access  Private (Authenticated via Cookie or Bearer Token)
 */
router.get('/me', authenticate, requireActiveAccount, getMe);

/**
 * @route   PUT /api/auth/profile
 * @desc    Update authenticated user's own profile (role modification prohibited)
 * @access  Private
 */
router.put('/profile', authenticate, requireActiveAccount, preventRoleChange, updateProfile);

/**
 * @route   PUT /api/auth/users/:userId/profile
 * @desc    Update user profile with resource ownership check (or admin override)
 * @access  Private (Owner or Admin)
 */
router.put(
  '/users/:userId/profile',
  authenticate,
  requireActiveAccount,
  checkOwnership('userId'),
  preventRoleChange,
  updateProfile
);

/**
 * Role-Restricted Demonstration / Boundary Verification Endpoints
 */

/**
 * @route   GET /api/auth/recruiter-only
 * @desc    Verify recruiter role restriction (candidates strictly blocked)
 * @access  Private (Recruiter & Admin only)
 */
router.get(
  '/recruiter-only',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.RECRUITER, USER_ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: Recruiter workspace',
      role: req.user.role,
    });
  }
);

/**
 * @route   GET /api/auth/admin-only
 * @desc    Verify admin role restriction (recruiters & candidates strictly blocked)
 * @access  Private (Admin only)
 */
router.get(
  '/admin-only',
  authenticate,
  requireActiveAccount,
  authorize(USER_ROLES.ADMIN),
  (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Access granted: Administrator workspace',
      role: req.user.role,
    });
  }
);

export default router;


