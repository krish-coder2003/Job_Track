import atsService from '../services/ats.service.js';

/**
 * PUT /api/jobs/:jobId/criteria
 * Upsert ATS evaluation criteria for a job.
 * Recruiter (owner) or Admin only.
 */
export const upsertJobCriteria = async (req, res, next) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    const criteria = await atsService.saveCriteria(jobId, req.body, req.user);
    res.status(200).json({
      success: true,
      message: 'Evaluation criteria saved successfully.',
      data: { criteria },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/:jobId/criteria
 * Retrieve ATS criteria for a job.
 * Recruiter (owner) or Admin only.
 */
export const getJobCriteria = async (req, res, next) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    const criteria = await atsService.getCriteriaForJob(jobId);
    res.status(200).json({
      success: true,
      data: { criteria: criteria || null },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/applications/:applicationId/ats
 * Request ATS analysis for a specific application.
 * Recruiter (job owner) or Admin only.
 */
export const requestReport = async (req, res, next) => {
  try {
    const forceReprocess = req.query.force === 'true' || req.body?.forceReprocess === true;
    const report = await atsService.requestATSReport(
      req.params.applicationId,
      req.user,
      { forceReprocess }
    );
    res.status(200).json({
      success: true,
      message: 'ATS analysis complete.',
      data: { report },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/applications/:applicationId/ats
 * Retrieve the ATS report for a specific application.
 * Recruiter (job owner) or Admin only. Candidates are blocked.
 */
export const getReport = async (req, res, next) => {
  try {
    const report = await atsService.getATSReport(req.params.applicationId, req.user);
    res.status(200).json({
      success: true,
      data: { report: report || null },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/jobs/:jobId/ats-reports
 * Retrieve ATS score summaries for all applications to a job.
 * Returns a map of applicationId → { overallScore, status }.
 * Recruiter (owner) or Admin only.
 */
export const getJobReports = async (req, res, next) => {
  try {
    const jobId = req.params.jobId || req.params.id;
    const reportsMap = await atsService.getATSReportsForJob(jobId, req.user);
    res.status(200).json({
      success: true,
      data: { reports: reportsMap },
    });
  } catch (err) {
    next(err);
  }
};

export default {
  upsertJobCriteria,
  getJobCriteria,
  requestReport,
  getReport,
  getJobReports,
};
