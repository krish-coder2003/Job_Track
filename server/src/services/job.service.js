import mongoose from 'mongoose';
import Job, { JOB_STATUS } from '../models/job.model.js';
import { USER_ROLES } from '../models/user.model.js';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

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
    const searchRegex = new RegExp(search.trim(), 'i');
    filter.$or = [
      { title: searchRegex },
      { company: searchRegex },
      { location: searchRegex },
      { description: searchRegex },
    ];
  }

  // 3. Structured Filters
  if (query.jobType) {
    filter.jobType = query.jobType;
  }

  if (query.workMode) {
    filter.workMode = query.workMode;
  }

  if (query.experienceLevel) {
    filter.experienceLevel = query.experienceLevel;
  }

  if (query.location && !filter.$or) {
    filter.location = new RegExp(query.location.trim(), 'i');
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

  // 4. Pagination & Sorting
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit, 10) || 10));
  const skip = (page - 1) * limit;

  let sort = { createdAt: -1 };
  if (query.sortBy) {
    const order = query.order === 'asc' ? 1 : -1;
    sort = { [query.sortBy]: order };
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

  return {
    jobs,
    pagination: {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
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

export default {
  listJobs,
  getJobById,
  createJob,
  updateJob,
  updateJobStatus,
  deleteJob,
};
