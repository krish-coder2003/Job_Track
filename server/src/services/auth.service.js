import User, { USER_ROLES, PUBLIC_ROLES } from '../models/user.model.js';
import {
  ConflictError,
  ForbiddenError,
  BadRequestError,
  UnauthorizedError,
  NotFoundError,
} from '../utils/errors.js';
import { generateToken } from '../utils/jwt.js';

/**
 * Service to register a new user in the system
 *
 * @param {Object} userData - User registration payload
 * @returns {Promise<Object>} Safe public user object without sensitive fields
 */
export const registerUser = async (userData) => {
  const { name, email, password, role, phone, location, skills, experience, resume } = userData;

  // 1. Normalize email
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  // 2. Reject registration as admin
  const normalizedRole = role ? String(role).toLowerCase().trim() : USER_ROLES.CANDIDATE;
  if (normalizedRole === USER_ROLES.ADMIN) {
    throw new ForbiddenError('Public registration cannot assign the admin role.');
  }

  // 3. Ensure role is an allowed public role
  if (!PUBLIC_ROLES.includes(normalizedRole)) {
    throw new BadRequestError(
      `Invalid role '${role}'. Allowed public roles are: ${PUBLIC_ROLES.join(', ')}`
    );
  }

  // 4. Check for existing user by normalized email
  const existingUser = await User.findOne({ email: normalizedEmail });
  if (existingUser) {
    throw new ConflictError('An account with this email already exists.');
  }

  // 5. Create user document (virtual 'password' triggers bcrypt hashing)
  const user = new User({
    name: name.trim(),
    email: normalizedEmail,
    password,
    role: normalizedRole,
    phone,
    location,
    skills,
    experience,
    resume,
  });

  // Flag as public registration for defense-in-depth model guard
  user.$locals.isPublicRegistration = true;

  await user.save();

  // 6. Return safe public user representation
  return user.toPublicProfile();
};

/**
 * Service to authenticate user with email and password
 *
 * @param {Object} credentials - { email, password }
 * @returns {Promise<{ user: Object, token: string }>} Safe user and signed JWT
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email ? email.toLowerCase().trim() : '';

  // 1. Fetch user including passwordHash for comparison
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  // Generic rejection message for non-existent users (prevents email enumeration)
  if (!user) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // 2. Verify password with bcrypt
  const isPasswordValid = await user.comparePassword(password);
  if (!isPasswordValid) {
    throw new UnauthorizedError('Invalid email or password.');
  }

  // 3. Reject disabled accounts
  if (user.status === 'disabled') {
    throw new ForbiddenError('Your account has been disabled. Please contact support.');
  }

  // 4. Issue JWT
  const token = generateToken({ id: user._id, role: user.role });

  return {
    user: user.toPublicProfile(),
    token,
  };
};

/**
 * Service to update user profile information
 * Ensures non-admin users cannot alter their own role.
 *
 * @param {string} userId - User ID to update
 * @param {Object} updateData - Profile updates
 * @param {string} requesterRole - Role of the requesting user
 * @returns {Promise<Object>} Updated safe public profile
 */
export const updateUserProfile = async (
  userId,
  updateData,
  requesterRole = USER_ROLES.CANDIDATE
) => {
  // Reject attempt to change role unless requester is an administrator
  if (updateData.role !== undefined && requesterRole !== USER_ROLES.ADMIN) {
    throw new ForbiddenError('Users cannot change their own role through profile updates.');
  }

  const allowedFields = ['name', 'phone', 'location', 'skills', 'experience', 'resume'];
  const updatePayload = {};

  for (const field of allowedFields) {
    if (updateData[field] !== undefined) {
      updatePayload[field] = updateData[field];
    }
  }

  // Only allow updating role if admin
  if (requesterRole === USER_ROLES.ADMIN && updateData.role !== undefined) {
    updatePayload.role = updateData.role;
  }

  const updatedUser = await User.findByIdAndUpdate(
    userId,
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!updatedUser) {
    throw new NotFoundError('User account not found.');
  }

  return updatedUser.toPublicProfile();
};

export default {
  registerUser,
  loginUser,
  updateUserProfile,
};


