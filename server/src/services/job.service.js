import mongoose from 'mongoose';
import Job, { JOB_STATUS } from '../models/job.model.js';
import Application from '../models/application.model.js';
import { USER_ROLES } from '../models/user.model.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';
import { escapeRegex, MAX_PAGE_SIZE, DEFAULT_PAGE_SIZE } from '../utils/query.utils.js';

// Allowed fields that can be created or updated directly
const ALLOWED_UPDATE_FIELDS = [
  'title',
  'company',
  'description',
  'responsibilities',
  'requiredSkills',
  'location',
  'jobType',
  'workMode',
  'experienceLevel',
  'salary',
  'applicationDeadline',
  'status',
];

/**
 * Retrieve paginated job listings with search, filters, and role-based visibility
 *
 * @param {Object} query - Express query params
 * @param {Object|null} currentUser - Authenticated user if available
 */
export const listJobs = async (query = {}, currentUser = null) => {
  const filter = {};

  // 1. Role-based visibility: Public and candidates can view active, approved jobs only
  const isRecruiterViewingOwn =
    currentUser?.role === USER_ROLES.RECRUITER &&
    (query.myJobs === 'true' || query.recruiter === 'me');

  const isAdmin = currentUser?.role === USER_ROLES.ADMIN;

  if (isRecruiterViewingOwn) {
    filter.recruiter = currentUser._id;
    if (query.status) {
      filter.status = query.status;
    }
  } else if (isAdmin && query.allStatus === 'true') {
    // Admin can inspect all jobs if requested
    if (query.status) {
      filter.status = query.status;
    }
  } else {
    // Public and Candidate default visibility
    filter.status = JOB_STATUS.ACTIVE;
    filter.isApproved = true;
  }

  // 2. Keyword Search
  const search = query.search || query.q;
  if (search && typeof search === 'string' && search.trim()) {
    const searchRegex = new RegExp(escapeRegex(search.trim()), 'i');
    filter.$or = [
      { title: searchRegex },
      { company: searchRegex },
      { location: searchRegex },
      { description: searchRegex },
      { requiredSkills: searchRegex },
    ];
  }

  // 3. Structured Filters
  if (query.location && typeof query.location === 'string' && query.location.trim()) {
    filter.location = new RegExp(escapeRegex(query.location.trim()), 'i');
  }

  if (query.jobType && typeof query.jobType === 'string' && query.jobType.trim()) {
    filter.jobType = query.jobType.trim();
  }

  if (query.workMode && typeof query.workMode === 'string' && query.workMode.trim()) {
    filter.workMode = query.workMode.trim();
  }

  if (query.experienceLevel && typeof query.experienceLevel === 'string' && query.experienceLevel.trim()) {
    filter.experienceLevel = query.experienceLevel.trim();
  }

  if (query.skills) {
    const skillsArray = Array.isArray(query.skills)
      ? query.skills
      : String(query.skills)
          .split(',')
          .map((s) => s.trim().toLowerCase())
          .filter(Boolean);

    if (skillsArray.length > 0) {
      filter.requiredSkills = { $in: skillsArray };
    }
  }

  // 4. Pagination & Sorting (Default newest first)
  const rawLimit = query.limit || query.pageSize;
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, parseInt(rawLimit, 10) || DEFAULT_PAGE_SIZE)
  );
  const skip = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (query.sortBy && typeof query.sortBy === 'string' && query.sortBy.trim()) {
    const sortField = query.sortBy.trim();
    const order =
      query.order === 'asc' || query.order === '1' || query.order === 1 ? 1 : -1;
    sort = { [sortField]: order };
    if (sortField !== 'createdAt') {
      sort.createdAt = -1;
    }
  }

  const [jobs, total] = await Promise.all([
    Job.find(filter)
      .populate('recruiter', 'name email company')
      .sort(sort)
      .skip(skip)
      .limit(limit)
      .lean(),
    Job.countDocuments(filter),
  ]);

  // If recruiter is viewing their own jobs, attach authoritative application counts
  let returnedJobs = jobs;
  if (isRecruiterViewingOwn && jobs.length > 0) {
    const jobIds = jobs.map((j) => j._id);
    const appCounts = await Application.aggregate([
      { $match: { job: { $in: jobIds } } },
      {
        $group: {
          _id: '$job',
          total: { $sum: 1 },
          awaitingReview: {
            $sum: { $cond: [{ $in: ['$status', ['pending', 'reviewing']] }, 1, 0] },
          },
        },
      },
    ]);
    const countMap = new Map(appCounts.map((c) => [c._id.toString(), c]));
    returnedJobs = jobs.map((job) => {
      const counts = countMap.get(job._id.toString()) || { total: 0, awaitingReview: 0 };
      return {
        ...job,
        applicationsCount: counts.total,
        awaitingReviewCount: counts.awaitingReview,
      };
    });
  }

  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    jobs: returnedJobs,
    pagination: {
      total,
      page,
      limit,
      pageSize: limit,
      totalPages,
      hasMore: page * limit < total,
    },
  };
};

/**
 * Retrieve single job by ID with status & approval visibility enforcement
 *
 * @param {string} jobId - Job ObjectId
 * @param {Object|null} currentUser - Authenticated user if available
 */
export const getJobById = async (jobId, currentUser = null) => {
  if (!mongoose.Types.ObjectId.isValid(jobId)) {
    throw new BadRequestError(`Invalid job ID format: ${jobId}`);
  }

  const job = await Job.findById(jobId).populate('recruiter', 'name email company');

  if (!job) {
    throw new NotFoundError(`Job with ID ${jobId} not found.`);
  }

  // Public & candidate visibility check: active and approved only
  const isPublicOrCandidate =
    !currentUser || currentUser.role === USER_ROLES.CANDIDATE;
  const isOwner =
    currentUser &&
    job.recruiter &&
    job.recruiter._id.toString() === currentUser._id.toString();
  const isAdmin = currentUser?.role === USER_ROLES.ADMIN;

  const isVisible = job.status === JOB_STATUS.ACTIVE && job.isApproved;

  if (isPublicOrCandidate && !isVisible) {
    throw new NotFoundError('Job not found or is no longer publicly active.');
  }

  // Other recruiters cannot view another recruiter's non-active/unapproved jobs
  if (!isPublicOrCandidate && !isOwner && !isAdmin && !isVisible) {
    throw new NotFoundError('Job not found or is no longer publicly active.');
  }

  return job;
};

/**
 * Create a new job listing
 *
 * @param {Object} jobData - Job creation payload
 * @param {string} recruiterId - Authenticated recruiter's user ID
 */
export const createJob = async (jobData, recruiterId) => {
  // Extract strictly allowed fields (prevents mass assignment)
  const sanitizedData = {};
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (jobData[field] !== undefined) {
      sanitizedData[field] = jobData[field];
    }
  }

  const job = new Job({
    ...sanitizedData,
    recruiter: recruiterId,
    status: sanitizedData.status || JOB_STATUS.ACTIVE,
    isApproved: true,
  });

  await job.save();
  await job.populate('recruiter', 'name email company');

  return job;
};

/**
 * Update an existing job listing
 *
 * @param {Object} job - Existing Job Mongoose document (from req.job)
 * @param {Object} updateData - Update payload
 */
export const updateJob = async (job, updateData) => {
  // Apply only permitted fields
  for (const field of ALLOWED_UPDATE_FIELDS) {
    if (updateData[field] !== undefined) {
      job[field] = updateData[field];
    }
  }

  await job.save();
  await job.populate('recruiter', 'name email company');

  return job;
};

/**
 * Update job status with validated lifecycle transition
 *
 * @param {Object} job - Existing Job Mongoose document
 * @param {string} newStatus - New status value
 */
export const updateJobStatus = async (job, newStatus) => {
  job.status = newStatus;
  await job.save();
  await job.populate('recruiter', 'name email company');

  return job;
};

/**
 * Delete a job listing
 *
 * @param {Object} job - Existing Job Mongoose document
 */
export const deleteJob = async (job) => {
  await job.deleteOne();
  return {
    success: true,
    message: 'Job deleted successfully.',
  };
};

/**
 * Retrieve recruiter dashboard overview statistics and recent candidate activity.
 * Aggregates live numbers across all jobs owned by the recruiter.
 *
 * @param {string|ObjectId} recruiterId - Recruiter User ID
 */
export const getRecruiterOverview = async (recruiterId) => {
  const [
    totalJobs,
    activeJobs,
    closedJobs,
    draftJobs,
    recruiterJobIds,
  ] = await Promise.all([
    Job.countDocuments({ recruiter: recruiterId }),
    Job.countDocuments({ recruiter: recruiterId, status: JOB_STATUS.ACTIVE }),
    Job.countDocuments({ recruiter: recruiterId, status: JOB_STATUS.CLOSED }),
    Job.countDocuments({ recruiter: recruiterId, status: JOB_STATUS.DRAFT }),
    Job.find({ recruiter: recruiterId }).distinct('_id'),
  ]);

  const [totalApplications, awaitingReview, byStatusAggregations, recentApplications] =
    await Promise.all([
      Application.countDocuments({ job: { $in: recruiterJobIds } }),
      Application.countDocuments({
        job: { $in: recruiterJobIds },
        status: { $in: ['pending', 'reviewing'] },
      }),
      Application.aggregate([
        { $match: { job: { $in: recruiterJobIds } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Application.find({ job: { $in: recruiterJobIds } })
        .populate('job', 'title company location status')
        .populate('candidate', 'name email phone location skills')
        .sort({ createdAt: -1 })
        .limit(8),
    ]);

  const byStatus = {
    pending: 0,
    reviewing: 0,
    shortlisted: 0,
    interviewing: 0,
    accepted: 0,
    rejected: 0,
    withdrawn: 0,
  };

  for (const item of byStatusAggregations) {
    if (item._id && byStatus[item._id] !== undefined) {
      byStatus[item._id] = item.count;
    }
  }

  return {
    overview: {
      totalJobs,
      activeJobs,
      closedJobs,
      draftJobs,
      totalApplications,
      awaitingReview,
      byStatus,
    },
    recentApplications,
  };
};

export default {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
  getRecruiterOverview,
};
