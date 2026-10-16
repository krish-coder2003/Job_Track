import User, { USER_ROLES, PUBLIC_ROLES } from '../models/user.model.js';
import { ConflictError, ForbiddenError, BadRequestError } from '../utils/errors.js';

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

export default {
  registerUser,
};
