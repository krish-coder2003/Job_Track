import applicationService from '../services/application.service.js';

/**
 * Controller to handle POST /api/jobs/:id/applications
 * Candidate applies to an active job listing
 */
export const applyToJob = async (req, res, next) => {
  try {
    const application = await applicationService.createApplication({
      jobId: req.params.id,
      candidateUser: req.user,
      applicationData: req.body,
    });

    res.status(201).json({
      success: true,
      message: 'Application submitted successfully',
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/jobs/:id/applications
 * Owner recruiter or admin views applications for a job listing
 */
export const getJobApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.getApplicationsForJob(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      count: applications.length,
      data: {
        applications,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/applications/my and /api/applications/me
 * Authenticated candidate retrieves their submitted applications with pagination and summary stats
 */
export const getMyApplications = async (req, res, next) => {
  try {
    const result = await applicationService.getCandidateApplications(
      req.user._id,
      req.query
    );

    res.status(200).json({
      success: true,
      count: result.applications.length,
      total: result.pagination.total,
      pagination: result.pagination,
      summary: result.summary,
      data: {
        applications: result.applications,
        pagination: result.pagination,
        summary: result.summary,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/applications/:id
 * Retrieve single application details with strict access control
 */
export const getApplicationById = async (req, res, next) => {
  try {
    const application = await applicationService.getApplicationById(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/applications/:id/cancel and DELETE /api/applications/:id
 * Candidate cancels / withdraws their pending application
 */
export const cancelApplication = async (req, res, next) => {
  try {
    const application = await applicationService.cancelApplication(
      req.params.id,
      req.user
    );

    res.status(200).json({
      success: true,
      message: 'Application has been successfully withdrawn.',
      data: {
        application,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/jobs/:id/applications/status
 * Candidate checks whether they have already applied to this specific job
 */
export const getApplicationStatus = async (req, res, next) => {
  try {
    const status = await applicationService.getApplicationStatusForJob(
      req.params.id,
      req.user._id
    );

    res.status(200).json({
      success: true,
      data: status,
    });
  } catch (error) {
    next(error);
  }
};

export default {
  applyToJob,
  getJobApplications,
  getMyApplications,
  getApplicationById,
  cancelApplication,
  getApplicationStatus,
};
