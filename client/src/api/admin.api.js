import api from './axios';

/**
 * Retrieve high-level platform statistics for administrator overview
 * GET /api/admin/dashboard
 */
export const getAdminDashboardApi = async () => {
  const response = await api.get('/admin/dashboard');
  return response.data;
};

/**
 * Retrieve paginated, searchable, and filterable users list
 * GET /api/admin/users
 *
 * @param {Object} params - Query parameters (page, limit, search, role, status, sortBy, order)
 */
export const getAdminUsersApi = async (params = {}) => {
  const response = await api.get('/admin/users', { params });
  return response.data;
};

/**
 * Update user account status (Disable or Reactivate)
 * PATCH /api/admin/users/:id/status
 *
 * @param {string} userId - Target user ObjectId
 * @param {string} status - New account status ('active' | 'disabled')
 * @param {string} [reason] - Optional explanation for disabling account
 */
export const updateUserStatusApi = async (userId, status, reason = '') => {
  const response = await api.patch(`/admin/users/${userId}/status`, {
    status,
    ...(reason ? { reason } : {}),
  });
  return response.data;
};

/**
 * Retrieve paginated platform job listings across all recruiters with moderation state
 * GET /api/admin/jobs
 *
 * @param {Object} params - Query parameters (page, limit, search, status, isApproved, sortBy, order)
 */
export const getAdminJobsApi = async (params = {}) => {
  const response = await api.get('/admin/jobs', { params });
  return response.data;
};

/**
 * Moderate job listing (Approve / Reject / Note)
 * PATCH /api/admin/jobs/:id/moderation
 *
 * @param {string} jobId - Target job ObjectId
 * @param {Object} data - Moderation payload ({ isApproved, status, moderationNote })
 */
export const moderateJobApi = async (jobId, data) => {
  const response = await api.patch(`/admin/jobs/${jobId}/moderation`, data);
  return response.data;
};

export default {
  getAdminDashboardApi,
  getAdminUsersApi,
  updateUserStatusApi,
  getAdminJobsApi,
  moderateJobApi,
};
