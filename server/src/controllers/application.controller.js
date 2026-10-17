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
 * Controller to handle GET /api/applications/me
 * Authenticated candidate retrieves all their submitted applications
 */
export const getMyApplications = async (req, res, next) => {
  try {
    const applications = await applicationService.getCandidateApplications(
      req.user._id
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
  getApplicationStatus,
};
