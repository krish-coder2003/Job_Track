import User from '../models/user.model.js';
import { NotFoundError, ForbiddenError } from '../utils/errors.js';
import storageService from './storage.service.js';

// Fields permitted to be updated directly on user profile
const ALLOWED_PROFILE_FIELDS = ['name', 'phone', 'location', 'skills', 'experience'];

/**
 * Format user for public/client response (guarantees no sensitive credentials or internal storage paths leak)
 */
export const sanitizeUserOutput = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };

  // Remove internal password hash
  delete user.passwordHash;
  delete user.__v;

  // Sanitize resume subdocument so no internal storageKey or filesystem path is exposed
  if (user.resume) {
    user.resume = {
      filename: user.resume.filename || '',
      fileSize: user.resume.fileSize || null,
      mimeType: user.resume.mimeType || '',
      url: user.resume.storageKey ? '/api/users/me/resume' : '',
      uploadedAt: user.resume.uploadedAt || null,
      hasResume: Boolean(user.resume.storageKey),
    };
  }

  return user;
};

/**
 * Get profile for authenticated user
 *
 * @param {string} userId - User ObjectId
 */
export const getCurrentUserProfile = async (userId) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User profile not found.');
  }
  return sanitizeUserOutput(user);
};

/**
 * Update profile fields for authenticated candidate / user
 *
 * @param {string} userId - User ObjectId
 * @param {Object} updateData - Key-values to update
 */
export const updateCurrentUserProfile = async (userId, updateData) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User profile not found.');
  }

  // Apply allowed fields only
  for (const field of ALLOWED_PROFILE_FIELDS) {
    if (updateData[field] !== undefined) {
      user[field] = updateData[field];
    }
  }

  await user.save();
  return sanitizeUserOutput(user);
};

/**
 * Upload or replace a candidate's resume
 *
 * @param {string} userId - Authenticated user ObjectId
 * @param {Object} validatedFile - Validated binary file from upload middleware
 */
export const uploadCandidateResume = async (userId, validatedFile) => {
  const user = await User.findById(userId);
  if (!user) {
    throw new NotFoundError('User account not found.');
  }

  // If user already has an existing resume, safely remove previous file from storage
  if (user.resume && user.resume.storageKey) {
    await storageService.deleteResume(user.resume);
  }

  // Save new file to storage
  const resumeData = await storageService.saveResume({
    userId,
    buffer: validatedFile.buffer,
    originalFilename: validatedFile.originalFilename,
    mimeType: validatedFile.mimeType,
    ext: validatedFile.ext,
  });

  // Update user document
  user.resume = resumeData;
  await user.save();

  return {
    filename: resumeData.filename,
    fileSize: resumeData.fileSize,
    mimeType: resumeData.mimeType,
    url: '/api/users/me/resume',
    uploadedAt: resumeData.uploadedAt,
    storageMode: resumeData.storageProvider,
  };
};

/**
 * Retrieve authorized access stream or signed URL for a candidate's resume
 *
 * @param {string} targetUserId - Candidate's user ID
 * @param {Object} requestingUser - Authenticated user object
 */
export const getCandidateResumeAccess = async (targetUserId, requestingUser) => {
  const isOwner = requestingUser._id.toString() === targetUserId.toString();
  const isRecruiterOrAdmin =
    requestingUser.role === 'recruiter' || requestingUser.role === 'admin';

  if (!isOwner && !isRecruiterOrAdmin) {
    throw new ForbiddenError(
      'Access denied: You do not have permission to access this candidate resume.'
    );
  }

  const user = await User.findById(targetUserId);
  if (!user) {
    throw new NotFoundError('Candidate not found.');
  }

  if (!user.resume || !user.resume.storageKey) {
    throw new NotFoundError('No resume document has been uploaded for this candidate.');
  }

  return storageService.getResumeAccess(user.resume);
};

export default {
  sanitizeUserOutput,
  getCurrentUserProfile,
  updateCurrentUserProfile,
  uploadCandidateResume,
  getCandidateResumeAccess,
};
