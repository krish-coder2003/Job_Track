import userService from '../services/user.service.js';

/**
 * GET /api/users/me
 * Retrieve currently authenticated user's profile
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await userService.getCurrentUserProfile(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/me
 * Update candidate profile (name, phone, location, skills, experience)
 */
export const updateMe = async (req, res, next) => {
  try {
    const user = await userService.updateCurrentUserProfile(req.user._id, req.body);
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

/**
 * POST /api/users/me/resume
 * Upload or replace a candidate's resume document
 */
export const uploadResume = async (req, res, next) => {
  try {
    const resume = await userService.uploadCandidateResume(
      req.user._id,
      req.validatedResume
    );
    res.status(201).json({
      success: true,
      message: 'Resume uploaded successfully',
      data: {
        resume,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/me/resume
 * GET /api/users/:userId/resume
 * Download / view candidate resume with authorized access
 */
export const getResume = async (req, res, next) => {
  try {
    const targetUserId = req.params.userId || req.user._id;
    const access = await userService.getCandidateResumeAccess(targetUserId, req.user);

    if (access.isStream) {
      res.setHeader('Content-Type', access.mimeType);
      res.setHeader(
        'Content-Disposition',
        `inline; filename="${encodeURIComponent(access.filename)}"`
      );
      res.setHeader('X-Content-Type-Options', 'nosniff');
      access.stream.pipe(res);
    } else {
      res.redirect(access.url);
    }
  } catch (error) {
    next(error);
  }
};

export default {
  getMe,
  updateMe,
  uploadResume,
  getResume,
};
