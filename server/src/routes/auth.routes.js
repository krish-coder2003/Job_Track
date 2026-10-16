import { Router } from 'express';
import { register } from '../controllers/auth.controller.js';
import { validateRegister } from '../validations/auth.validation.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user account (candidate or recruiter)
 * @access  Public
 */
router.post('/register', validateRegister, register);

export default router;
