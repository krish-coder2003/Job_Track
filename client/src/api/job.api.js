import api from './axios';

/**
 * Fetch public active job listings with optional search and filters
 * GET /api/jobs
 *
 * @param {Object} params - Query parameters (search, jobType, workMode, experienceLevel, page, limit)
 */
export const getJobsApi = async (params = {}) => {
  const response = await api.get('/jobs', { params });
  return response.data;
};

/**
 * Fetch a single job listing by ID
 * GET /api/jobs/:id
 *
 * @param {string} id - Job ObjectId
 */
export const getJobByIdApi = async (id) => {
  const response = await api.get(`/jobs/${id}`);
  return response.data;
};

/**
 * Create a new job listing (Recruiter/Admin)
 * POST /api/jobs
 *
 * @param {Object} jobData - Job creation payload
 */
export const createJobApi = async (jobData) => {
  const response = await api.post('/jobs', jobData);
  return response.data;
};

/**
 * Update an existing job listing (Owner/Admin)
 * PATCH /api/jobs/:id
 *
 * @param {string} id - Job ObjectId
 * @param {Object} updateData - Job update payload
 */
export const updateJobApi = async (id, updateData) => {
  const response = await api.patch(`/jobs/${id}`, updateData);
  return response.data;
};

/**
 * Delete a job listing (Owner/Admin)
 * DELETE /api/jobs/:id
 *
 * @param {string} id - Job ObjectId
 */
export const deleteJobApi = async (id) => {
  const response = await api.delete(`/jobs/${id}`);
  return response.data;
};

/**
 * Update job lifecycle status (Owner/Admin)
 * PATCH /api/jobs/:id/status
 *
 * @param {string} id - Job ObjectId
 * @param {string} status - New job status (active, draft, closed, archived)
 */
export const updateJobStatusApi = async (id, status) => {
  const response = await api.patch(`/jobs/${id}/status`, { status });
  return response.data;
};

/**
 * Retrieve recruiter overview statistics and recent candidate pipeline activity
 * GET /api/jobs/recruiter/overview
 */
export const getRecruiterOverviewApi = async () => {
  const response = await api.get('/jobs/recruiter/overview');
  return response.data;
};

export default {
  getJobs: getJobsApi,
  getJobById: getJobByIdApi,
  createJob: createJobApi,
  updateJob: updateJobApi,
  deleteJob: deleteJobApi,
  updateJobStatus: updateJobStatusApi,
  getRecruiterOverview: getRecruiterOverviewApi,
};
