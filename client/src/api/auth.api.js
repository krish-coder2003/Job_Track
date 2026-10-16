import api, { setAuthToken } from './axios';

/**
 * Register a new candidate or recruiter
 * POST /api/auth/register
 *
 * @param {Object} userData - { name, email, password, role, phone, location, skills }
 */
export const registerApi = async (userData) => {
  const response = await api.post('/auth/register', userData);
  return response.data;
};

/**
 * Authenticate user with email and password
 * POST /api/auth/login
 *
 * @param {Object} credentials - { email, password }
 */
export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  const { token } = response.data?.data || {};
  if (token) {
    setAuthToken(token);
  }
  return response.data;
};

/**
 * Terminate current user session and clear cookie
 * POST /api/auth/logout
 */
export const logoutApi = async () => {
  try {
    const response = await api.post('/auth/logout');
    return response.data;
  } finally {
    setAuthToken(null);
  }
};

/**
 * Restore currently authenticated session
 * GET /api/auth/me
 */
export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Update user profile
 * PUT /api/auth/profile
 */
export const updateProfileApi = async (profileData) => {
  const response = await api.put('/auth/profile', profileData);
  return response.data;
};

export default {
  register: registerApi,
  login: loginApi,
  logout: logoutApi,
  getMe: getMeApi,
  updateProfile: updateProfileApi,
};
