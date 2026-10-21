import api from './axios';

/**
 * Upsert ATS evaluation criteria for a job
 * PUT /api/jobs/:jobId/criteria
 *
 * @param {string} jobId
 * @param {Object} criteriaData
 */
export const saveCriteriaApi = async (jobId, criteriaData) => {
  const response = await api.put(`/jobs/${jobId}/criteria`, criteriaData);
  return response.data;
};

/**
 * Retrieve ATS criteria for a job
 * GET /api/jobs/:jobId/criteria
 *
 * @param {string} jobId
 */
export const getCriteriaApi = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}/criteria`);
  return response.data;
};

/**
 * Request / reprocess ATS analysis for an application
 * POST /api/applications/:applicationId/ats
 *
 * @param {string} applicationId
 * @param {boolean} [forceReprocess=false]
 */
export const requestATSReportApi = async (applicationId, forceReprocess = false) => {
  const response = await api.post(
    `/applications/${applicationId}/ats`,
    { forceReprocess },
    { params: forceReprocess ? { force: 'true' } : {} }
  );
  return response.data;
};

/**
 * Retrieve the ATS report for an application
 * GET /api/applications/:applicationId/ats
 *
 * @param {string} applicationId
 */
export const getATSReportApi = async (applicationId) => {
  const response = await api.get(`/applications/${applicationId}/ats`);
  return response.data;
};

/**
 * Retrieve ATS score summaries for all applicants to a job
 * GET /api/jobs/:jobId/ats-reports
 *
 * @param {string} jobId
 */
export const getJobATSReportsApi = async (jobId) => {
  const response = await api.get(`/jobs/${jobId}/ats-reports`);
  return response.data;
};

export default {
  saveCriteriaApi,
  getCriteriaApi,
  requestATSReportApi,
  getATSReportApi,
  getJobATSReportsApi,
};
