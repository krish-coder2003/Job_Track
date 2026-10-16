import { registerUser } from '../services/auth.service.js';

/**
 * Controller to handle POST /api/auth/register
 */
export const register = async (req, res, next) => {
  try {
    const user = await registerUser(req.body);

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  register,
};
