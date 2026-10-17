import jobService from '../services/job.service.js';

/**
 * Controller to handle GET /api/jobs
 * Public listings with filter, search, and pagination
 */
export const getJobs = async (req, res, next) => {
  try {
    const result = await jobService.listJobs(req.query, req.user);
    res.status(200).json({
      success: true,
      count: result.jobs.length,
      total: result.pagination.total,
      totalPages: result.pagination.totalPages,
      page: result.pagination.page,
      limit: result.pagination.limit,
      pageSize: result.pagination.pageSize,
      pagination: result.pagination,
      data: {
        jobs: result.jobs,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/jobs/:id
 * Retrieve single job with public visibility rules
 */
export const getJobById = async (req, res, next) => {
  try {
    const job = await jobService.getJobById(req.params.id, req.user);
    res.status(200).json({
      success: true,
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle POST /api/jobs
 * Create job (Recruiter/Admin only)
 */
export const createJob = async (req, res, next) => {
  try {
    const job = await jobService.createJob(req.body, req.user._id);
    res.status(201).json({
      success: true,
      message: 'Job created successfully',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/jobs/:id
 * Update job (Owner recruiter/Admin only)
 */
export const updateJob = async (req, res, next) => {
  try {
    const job = await jobService.updateJob(req.job, req.body);
    res.status(200).json({
      success: true,
      message: 'Job updated successfully',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle DELETE /api/jobs/:id
 * Delete job (Owner recruiter/Admin only)
 */
export const deleteJob = async (req, res, next) => {
  try {
    const result = await jobService.deleteJob(req.job);
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/jobs/:id/status
 * Transition job status (Owner recruiter/Admin only)
 */
export const updateJobStatus = async (req, res, next) => {
  try {
    const job = await jobService.updateJobStatus(req.job, req.body.status);
    res.status(200).json({
      success: true,
      message: 'Job status updated successfully',
      data: {
        job,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getJobs,
  getJobById,
  createJob,
  updateJob,
  deleteJob,
  updateJobStatus,
};
