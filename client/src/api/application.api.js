import api from './axios';

/**
 * Submit candidate job application
 * POST /api/jobs/:jobId/applications
 *
 * @param {string} jobId - Target job ObjectId
 * @param {Object} data - Application payload (optional coverLetter)
 */
export const applyToJobApi = async (jobId, data = {}) => {
  const response = await api.post(`/jobs/${jobId}/applications`, data);
  return response.data;
};

/**
 * Retrieve applications for a specific job (Recruiter owner or Admin)
 * GET /api/jobs/:jobId/applications
 *
 * @param {string} jobId - Target job ObjectId
 * @param {Object} params - Optional filters (status, search, sortBy, order)
 */
export const getJobApplicationsApi = async (jobId, params = {}) => {
  const response = await api.get(`/jobs/${jobId}/applications`, { params });
  return response.data;
};

/**
 * Check if the candidate has applied for a job
 * GET /api/jobs/:jobId/applications/status
 *
 * @param {string} jobId - Target job ObjectId
 */
export const getApplicationStatusApi = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}/applications/status`);
  return response.data;
};

/**
 * Retrieve candidate's applications with pagination, status filtering, and server statistics
 * GET /api/applications/my
 *
 * @param {Object} params - Query parameters (page, limit, status)
 */
export const getMyApplicationsApi = async (params = {}) => {
  const response = await api.get('/applications/my', { params });
  return response.data;
};

/**
 * Retrieve single application details by ID
 * GET /api/applications/:id
 *
 * @param {string} id - Application ObjectId
 */
export const getApplicationByIdApi = async (id) => {
  const response = await api.get(`/applications/${id}`);
  return response.data;
};

/**
 * Cancel / withdraw a pending or reviewing application
 * PATCH /api/applications/:id/cancel
 *
 * @param {string} id - Application ObjectId
 * @param {string} [reason] - Optional cancellation reason
 */
export const cancelApplicationApi = async (id, reason = '') => {
  const response = await api.patch(`/applications/${id}/cancel`, {
    ...(reason ? { reason } : {}),
  });
  return response.data;
};

/**
 * Update candidate application hiring stage / status
 * PATCH /api/applications/:id/status
 *
 * @param {string} id - Application ObjectId
 * @param {string} status - New application status
 * @param {string} [note] - Optional status change note
 */
export const updateApplicationStatusApi = async (id, status, note = '') => {
  const response = await api.patch(`/applications/${id}/status`, {
    status,
    ...(note ? { note } : {}),
  });
  return response.data;
};

/**
 * Add private internal note to an application (Recruiter owner or Admin only)
 * PATCH /api/applications/:id/notes
 *
 * @param {string} id - Application ObjectId
 * @param {string} note - Note content text
 */
export const addApplicationNoteApi = async (id, note) => {
  const response = await api.patch(`/applications/${id}/notes`, { note });
  return response.data;
};

export default {
  applyToJobApi,
  getJobApplicationsApi,
  getApplicationStatusApi,
  getMyApplicationsApi,
  getApplicationByIdApi,
  cancelApplicationApi,
  updateApplicationStatusApi,
  addApplicationNoteApi,
};

