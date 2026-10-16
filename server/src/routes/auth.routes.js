import { Router } from 'express';
import { register, login, logout, getMe } from '../controllers/auth.controller.js';
import { validateRegister, validateLogin } from '../validations/auth.validation.js';
import { authenticate } from '../middlewares/auth.middleware.js';

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
router.get('/me', authenticate, getMe);

export default router;

