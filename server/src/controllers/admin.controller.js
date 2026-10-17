import adminService from '../services/admin.service.js';

/**
 * Controller to handle GET /api/admin/dashboard
 * Aggregates overall platform metrics and statistics
 */
export const getAdminDashboard = async (req, res, next) => {
  try {
    const stats = await adminService.getPlatformStatistics();

    res.status(200).json({
      success: true,
      data: stats,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/admin/users
 * Search, filter and paginate platform users
 */
export const getAdminUsers = async (req, res, next) => {
  try {
    const result = await adminService.getUsers(req.query);

    res.status(200).json({
      success: true,
      count: result.users.length,
      total: result.pagination.total,
      pagination: result.pagination,
      data: {
        users: result.users,
        pagination: result.pagination,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle PATCH /api/admin/users/:id/status
 * Disable or reactivate user account
 */
export const updateUserStatus = async (req, res, next) => {
  try {
    const { status, reason } = req.body;
    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'Status field is required (active or disabled).',
      });
    }

    const updatedUser = await adminService.updateUserStatus(
      req.params.id,
      status,
      req.user,
      reason
    );

    res.status(200).json({
      success: true,
      message: `User account has been ${status === 'active' ? 'reactivated' : 'disabled'}.`,
      data: {
        user: updatedUser,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Controller to handle GET /api/admin/jobs
 * Review platform-wide job listings with moderation and applicant metrics
 */
export const getAdminJobs = async (req, res, next) => {
  try {
    const result = await adminService.getJobs(req.query);

    res.status(200).json({
      success: true,
      count: result.jobs.length,
      total: result.pagination.total,
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
 * Controller to handle PATCH /api/admin/jobs/:id/moderation
 * Moderate a job listing (Approve / Reject / Note)
 */
export const moderateJob = async (req, res, next) => {
  try {
    const { isApproved, status, moderationNote } = req.body;

    if (typeof isApproved !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isApproved boolean field is required.',
      });
    }

    const updatedJob = await adminService.moderateJob(
      req.params.id,
      { isApproved, status, moderationNote },
      req.user
    );

    res.status(200).json({
      success: true,
      message: `Job listing has been ${isApproved ? 'approved' : 'rejected / unapproved'}.`,
      data: {
        job: updatedJob,
      },
    });
  } catch (error) {
    next(error);
  }
};

export default {
  getAdminDashboard,
  getAdminUsers,
  updateUserStatus,
  getAdminJobs,
  moderateJob,
};
