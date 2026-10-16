import { registerUser, loginUser, updateUserProfile } from '../services/auth.service.js';
import { COOKIE_NAME, getCookieOptions } from '../utils/jwt.js';

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

/**
 * Controller to handle POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);

    // Set secure HTTP-only cookie
    res.cookie(COOKIE_NAME, token, getCookieOptions());

    res.status(200).json({
      success: true,
      message: 'Logged in successfully',
      data: {
        user,
        token,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /api/auth/logout
 */
export const logout = (req, res) => {
  const cookieOptions = getCookieOptions();

  res.clearCookie(COOKIE_NAME, {
    httpOnly: cookieOptions.httpOnly,
    secure: cookieOptions.secure,
    sameSite: cookieOptions.sameSite,
    path: cookieOptions.path,
  });

  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

/**
 * Controller to handle GET /api/auth/me (Current session restoration)
 */
export const getMe = (req, res) => {
  res.status(200).json({
    success: true,
    data: {
      user: req.user.toPublicProfile(),
    },
  });
};

/**
 * Controller to handle profile updates
 */
export const updateProfile = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.user._id;
    const user = await updateUserProfile(targetUserId, req.body, req.user.role);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
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
  login,
  logout,
  getMe,
  updateProfile,
};


