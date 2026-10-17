import User, { USER_ROLES, ACCOUNT_STATUS } from '../models/user.model.js';
import Job, { JOB_STATUS } from '../models/job.model.js';
import Application, { APPLICATION_STATUS } from '../models/application.model.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
} from '../utils/errors.js';

/**
 * Retrieve comprehensive platform statistics for the administrator dashboard.
 */
export const getPlatformStatistics = async () => {
  const [
    totalUsers,
    usersByRoleAgg,
    usersByStatusAgg,
    totalJobs,
    jobsByStatusAgg,
    jobsApprovedCount,
    jobsPendingModerationCount,
    totalApplications,
    appsByStatusAgg,
    recentUsers,
    recentJobs,
  ] = await Promise.all([
    // Users aggregation
    User.countDocuments(),
    User.aggregate([{ $group: { _id: '$role', count: { $sum: 1 } } }]),
    User.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // Jobs aggregation
    Job.countDocuments(),
    Job.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),
    Job.countDocuments({ isApproved: true }),
    Job.countDocuments({ isApproved: false }),

    // Applications aggregation
    Application.countDocuments(),
    Application.aggregate([{ $group: { _id: '$status', count: { $sum: 1 } } }]),

    // Recent 5 user signups (sanitized, password hashes omitted)
    User.find()
      .select('-password -passwordHash')
      .sort({ createdAt: -1 })
      .limit(5),

    // Recent 5 jobs posted
    Job.find()
      .populate('recruiter', 'name email company')
      .sort({ createdAt: -1 })
      .limit(5),
  ]);

  // Format user role breakdown
  const usersByRole = {
    candidate: 0,
    recruiter: 0,
    admin: 0,
  };
  for (const item of usersByRoleAgg) {
    if (item._id && usersByRole[item._id] !== undefined) {
      usersByRole[item._id] = item.count;
    }
  }

  // Format user status breakdown
  const usersByStatus = {
    active: 0,
    disabled: 0,
  };
  for (const item of usersByStatusAgg) {
    if (item._id && usersByStatus[item._id] !== undefined) {
      usersByStatus[item._id] = item.count;
    }
  }

  // Format job status breakdown
  const jobsByStatus = {
    active: 0,
    closed: 0,
    draft: 0,
    archived: 0,
  };
  for (const item of jobsByStatusAgg) {
    if (item._id && jobsByStatus[item._id] !== undefined) {
      jobsByStatus[item._id] = item.count;
    }
  }

  // Format application status breakdown
  const applicationsByStatus = {
    pending: 0,
    reviewing: 0,
    shortlisted: 0,
    interviewing: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
    cancelled: 0,
  };
  for (const item of appsByStatusAgg) {
    if (item._id && applicationsByStatus[item._id] !== undefined) {
      applicationsByStatus[item._id] = item.count;
    }
  }

  return {
    overview: {
      totalUsers,
      totalJobs,
      totalApplications,
      pendingJobModerations: jobsPendingModerationCount,
    },
    users: {
      total: totalUsers,
      byRole: usersByRole,
      byStatus: usersByStatus,
    },
    jobs: {
      total: totalJobs,
      byStatus: jobsByStatus,
      moderation: {
        approved: jobsApprovedCount,
        pendingApproval: jobsPendingModerationCount,
      },
    },
    applications: {
      total: totalApplications,
      byStatus: applicationsByStatus,
    },
    recentUsers,
    recentJobs,
  };
};

/**
 * Retrieve paginated, searchable, and filterable users list.
 * Strips password hashes and enriches with associated job/application counts.
 */
export const getUsers = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  // Search by name or email
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ name: searchRegex }, { email: searchRegex }];
  }

  // Filter by role
  if (query.role && query.role !== 'all') {
    filter.role = query.role.toLowerCase();
  }

  // Filter by status
  if (query.status && query.status !== 'all') {
    filter.status = query.status.toLowerCase();
  }

  // Sorting
  const allowedSortFields = ['createdAt', 'name', 'email', 'role', 'status'];
  const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;

  const [users, total] = await Promise.all([
    User.find(filter)
      .select('-password -passwordHash')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  // Aggregate user activity counts
  const userIds = users.map((u) => u._id);
  const [jobCountsAgg, appCountsAgg] = await Promise.all([
    Job.aggregate([
      { $match: { recruiter: { $in: userIds } } },
      { $group: { _id: '$recruiter', count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { candidate: { $in: userIds } } },
      { $group: { _id: '$candidate', count: { $sum: 1 } } },
    ]),
  ]);

  const jobCountsMap = Object.fromEntries(jobCountsAgg.map((j) => [j._id.toString(), j.count]));
  const appCountsMap = Object.fromEntries(appCountsAgg.map((a) => [a._id.toString(), a.count]));

  const enrichedUsers = users.map((u) => {
    const obj = u.toObject();
    return {
      ...obj,
      jobsPostedCount: jobCountsMap[u._id.toString()] || 0,
      applicationsSubmittedCount: appCountsMap[u._id.toString()] || 0,
    };
  });

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    users: enrichedUsers,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};

/**
 * Update user account status (Disable / Reactivate).
 * Strict Safeguard: Blocks disabling the last active administrator account.
 */
export const updateUserStatus = async (targetUserId, newStatus, requestingAdmin, reason = '') => {
  if (![ACCOUNT_STATUS.ACTIVE, ACCOUNT_STATUS.DISABLED].includes(newStatus)) {
    throw new BadRequestError(
      `Invalid status '${newStatus}'. Must be one of: ${ACCOUNT_STATUS.ACTIVE}, ${ACCOUNT_STATUS.DISABLED}`
    );
  }

  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new NotFoundError('User account not found.');
  }

  // CRITICAL SAFEGUARD: Never permit disabling the last active administrator
  if (targetUser.role === USER_ROLES.ADMIN && newStatus === ACCOUNT_STATUS.DISABLED) {
    const activeAdminsCount = await User.countDocuments({
      role: USER_ROLES.ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
    });

    if (activeAdminsCount <= 1) {
      throw new BadRequestError('Cannot disable the last active administrator account.');
    }
  }

  if (newStatus === ACCOUNT_STATUS.DISABLED) {
    targetUser.status = ACCOUNT_STATUS.DISABLED;
    targetUser.disabledReason = reason ? reason.trim() : 'Disabled by administrator';
    targetUser.disabledAt = new Date();
    targetUser.disabledBy = requestingAdmin._id;
  } else {
    targetUser.status = ACCOUNT_STATUS.ACTIVE;
    targetUser.disabledReason = '';
    targetUser.disabledAt = null;
    targetUser.disabledBy = null;
  }

  await targetUser.save();

  const userObj = targetUser.toObject();
  delete userObj.password;
  delete userObj.passwordHash;

  return userObj;
};

/**
 * Retrieve paginated job listings across all recruiters with moderation details and application counts.
 */
export const getJobs = async (query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = {};

  // Search by title or company
  if (query.search && query.search.trim()) {
    const searchRegex = new RegExp(query.search.trim(), 'i');
    filter.$or = [{ title: searchRegex }, { company: searchRegex }, { location: searchRegex }];
  }

  // Filter by status
  if (query.status && query.status !== 'all') {
    filter.status = query.status.toLowerCase();
  }

  // Filter by moderation approval
  if (query.isApproved !== undefined && query.isApproved !== 'all') {
    filter.isApproved = query.isApproved === true || query.isApproved === 'true';
  }

  // Sorting
  const allowedSortFields = ['createdAt', 'title', 'company', 'status', 'isApproved', 'applicationDeadline'];
  const sortField = allowedSortFields.includes(query.sortBy) ? query.sortBy : 'createdAt';
  const sortOrder = query.order === 'asc' ? 1 : -1;

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('recruiter', 'name email role company location status')
      .populate('moderatedBy', 'name email role')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit),
    Job.countDocuments(filter),
  ]);

  // Aggregate applications count for returned jobs
  const jobIds = jobs.map((j) => j._id);
  const appCounts = await Application.aggregate([
    { $match: { job: { $in: jobIds } } },
    { $group: { _id: '$job', count: { $sum: 1 } } },
  ]);

  const countsMap = Object.fromEntries(appCounts.map((c) => [c._id.toString(), c.count]));

  const enrichedJobs = jobs.map((job) => ({
    ...job.toObject(),
    applicationsCount: countsMap[job._id.toString()] || 0,
  }));

  const totalPages = Math.ceil(total / limit) || 1;

  return {
    jobs: enrichedJobs,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
};

/**
 * Moderate a job listing (Approve / Reject / Change status / Attach moderation note).
 */
export const moderateJob = async (jobId, moderationData, requestingAdmin) => {
  const { isApproved, status, moderationNote } = moderationData;

  if (typeof isApproved !== 'boolean') {
    throw new BadRequestError('isApproved boolean field is required.');
  }

  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job listing not found.');
  }

  job.isApproved = isApproved;

  // Optional status override
  if (status && Object.values(JOB_STATUS).includes(status)) {
    job.status = status;
  }

  // Attach moderation note if provided
  if (moderationNote !== undefined) {
    job.moderationNote = typeof moderationNote === 'string' ? moderationNote.trim() : '';
  }

  job.moderatedBy = requestingAdmin._id;
  job.moderatedAt = new Date();

  await job.save();

  await job.populate([
    { path: 'recruiter', select: 'name email role company location status' },
    { path: 'moderatedBy', select: 'name email role' },
  ]);

  return job;
};

export default {
  getPlatformStatistics,
  getUsers,
  updateUserStatus,
  getJobs,
  moderateJob,
};
