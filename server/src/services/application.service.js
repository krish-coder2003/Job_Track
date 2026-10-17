import Application, { APPLICATION_STATUS } from '../models/application.model.js';
import Job, { JOB_STATUS } from '../models/job.model.js';
import User, { USER_ROLES } from '../models/user.model.js';
import {
  BadRequestError,
  NotFoundError,
  ForbiddenError,
  ConflictError,
  UnauthorizedError,
} from '../utils/errors.js';

/**
 * Service to process a new job application submission.
 * Enforces candidate role, job eligibility, required valid resume snapshot,
 * and handles both sequential and concurrent duplicate submissions safely.
 */
export const createApplication = async ({ jobId, candidateUser, applicationData = {} }) => {
  // 1. Enforce candidate role
  if (!candidateUser || candidateUser.role !== USER_ROLES.CANDIDATE) {
    throw new ForbiddenError('Only candidates can apply for jobs.');
  }

  // 2. Fetch fresh candidate profile from database
  const candidate = await User.findById(candidateUser._id);
  if (!candidate) {
    throw new UnauthorizedError('Candidate account not found or has been removed.');
  }

  if (candidate.status !== 'active') {
    throw new ForbiddenError('Your account has been disabled. Please contact support.');
  }

  // 3. Verify that candidate possesses a valid uploaded resume
  const candidateResume = candidate.resume;
  const hasValidResume =
    candidateResume &&
    typeof candidateResume.storageKey === 'string' &&
    candidateResume.storageKey.trim().length > 0 &&
    typeof candidateResume.filename === 'string' &&
    candidateResume.filename.trim().length > 0;

  if (!hasValidResume) {
    throw new BadRequestError(
      'A valid uploaded resume is required to apply for jobs. Please upload a resume to your profile before applying.'
    );
  }

  // 4. Fetch job listing and verify eligibility
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job listing not found.');
  }

  // Only active, approved and open jobs that have not passed their deadline can receive applications
  if (!job.isApproved) {
    throw new BadRequestError('This job listing is not approved for applications.');
  }

  if (job.status === JOB_STATUS.CLOSED) {
    throw new BadRequestError('This job listing is closed and no longer accepting applications.');
  }

  if (job.status !== JOB_STATUS.ACTIVE) {
    throw new BadRequestError(
      `This job listing is currently ${job.status} and cannot receive applications.`
    );
  }

  if (job.applicationDeadline && new Date(job.applicationDeadline).getTime() < Date.now()) {
    throw new BadRequestError('The application deadline for this job has passed.');
  }

  // 5. Pre-check for duplicate application
  const existingApplication = await Application.findOne({
    candidate: candidate._id,
    job: job._id,
  });

  if (existingApplication) {
    throw new ConflictError('You have already applied for this job.');
  }

  // 6. Build immutable resume snapshot from candidate's current verified resume
  const resumeSnapshot = {
    url: candidateResume.url || `/api/users/${candidate._id}/resume`,
    filename: candidateResume.filename,
    fileSize: candidateResume.fileSize || null,
    mimeType: candidateResume.mimeType || 'application/pdf',
    storageProvider: candidateResume.storageProvider || 'local',
    storageKey: candidateResume.storageKey,
    uploadedAt: candidateResume.uploadedAt || new Date(),
  };

  // 7. Instantiate application with default pending status and timestamps
  const application = new Application({
    candidate: candidate._id,
    job: job._id,
    resume: resumeSnapshot,
    coverLetter:
      typeof applicationData?.coverLetter === 'string'
        ? applicationData.coverLetter.trim()
        : '',
    status: APPLICATION_STATUS.PENDING,
  });

  // 8. Persist to DB with race-condition safety (compound unique index triggers code 11000)
  try {
    await application.save();
  } catch (err) {
    if (err.code === 11000) {
      throw new ConflictError('You have already applied for this job.');
    }
    throw err;
  }

  // 9. Populate job and candidate details for returned response
  await application.populate([
    {
      path: 'job',
      select: 'title company location jobType workMode status applicationDeadline',
    },
    {
      path: 'candidate',
      select: 'name email phone location skills',
    },
  ]);

  return application;
};

/**
 * Retrieve all applications for a specific job (Recruiter owner or Admin)
 */
export const getApplicationsForJob = async (jobId, requestingUser) => {
  const job = await Job.findById(jobId);
  if (!job) {
    throw new NotFoundError('Job listing not found.');
  }

  // Owner check
  const isOwner = job.recruiter.toString() === requestingUser._id.toString();
  const isAdmin = requestingUser.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError('You can only view applications for your own job listings.');
  }

  const applications = await Application.find({ job: jobId })
    .populate('candidate', 'name email phone location skills')
    .sort({ createdAt: -1 });

  return applications;
};

/**
 * Retrieve applications submitted by the authenticated candidate with pagination,
 * status filtering, and server-side summary aggregation.
 */
export const getCandidateApplications = async (candidateId, query = {}) => {
  const page = Math.max(1, parseInt(query.page, 10) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(query.limit || query.pageSize, 10) || 10));
  const skip = (page - 1) * limit;

  const filter = { candidate: candidateId };

  if (query.status && query.status !== 'all') {
    filter.status = query.status.toLowerCase();
  }

  // 1. Fetch filtered and paginated applications
  const [applications, totalFiltered, statusAggregations] = await Promise.all([
    Application.find(filter)
      .populate('job', 'title company location jobType workMode status salary applicationDeadline recruiter')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit),
    Application.countDocuments(filter),
    Application.aggregate([
      { $match: { candidate: candidateId } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]),
  ]);

  // 2. Build authoritative server-calculated statistics
  const byStatus = {
    pending: 0,
    reviewing: 0,
    shortlisted: 0,
    interviewing: 0,
    rejected: 0,
    accepted: 0,
    withdrawn: 0,
    cancelled: 0,
  };

  let totalApplications = 0;
  for (const item of statusAggregations) {
    if (item._id) {
      byStatus[item._id] = item.count;
      totalApplications += item.count;
    }
  }

  const totalPages = Math.ceil(totalFiltered / limit) || 1;

  return {
    applications,
    pagination: {
      page,
      limit,
      pageSize: limit,
      total: totalFiltered,
      totalPages,
      hasMore: page < totalPages,
    },
    summary: {
      total: totalApplications,
      byStatus,
    },
  };
};

/**
 * Retrieve a single application by ID with strict access control
 * (Applicant, Recruiter owner, or Admin only)
 */
export const getApplicationById = async (applicationId, requestingUser) => {
  const application = await Application.findById(applicationId)
    .populate('job', 'title company description location jobType workMode salary status applicationDeadline recruiter')
    .populate('candidate', 'name email phone location skills');

  if (!application) {
    throw new NotFoundError('Application record not found.');
  }

  const isApplicant = application.candidate?._id?.toString() === requestingUser._id.toString();
  const isJobRecruiter =
    application.job?.recruiter &&
    application.job.recruiter.toString() === requestingUser._id.toString();
  const isAdmin = requestingUser.role === USER_ROLES.ADMIN;

  if (!isApplicant && !isJobRecruiter && !isAdmin) {
    throw new ForbiddenError('You are not authorized to view this application.');
  }

  return application;
};

/**
 * Cancel / withdraw an application when permitted by business rules.
 * Permitted only by the applicant when application is in 'pending' or 'reviewing' state.
 */
export const cancelApplication = async (applicationId, candidateUser) => {
  const application = await Application.findById(applicationId).populate(
    'job',
    'title company'
  );

  if (!application) {
    throw new NotFoundError('Application record not found.');
  }

  // Ensure only the applicant can cancel their application
  if (application.candidate.toString() !== candidateUser._id.toString()) {
    throw new ForbiddenError('You can only cancel your own applications.');
  }

  // Check if status permits cancellation
  const CANCELLABLE_STATUSES = [
    APPLICATION_STATUS.PENDING,
    APPLICATION_STATUS.REVIEWING,
  ];

  if (!CANCELLABLE_STATUSES.includes(application.status)) {
    throw new BadRequestError(
      `Cannot cancel application with status '${application.status}'. Only pending or reviewing applications may be withdrawn.`
    );
  }

  application.status = APPLICATION_STATUS.WITHDRAWN;
  await application.save();

  return application;
};

/**
 * Update candidate application status (by Job owner Recruiter or Admin)
 */
export const updateApplicationStatus = async (applicationId, newStatus, requestingUser) => {
  const allowedStatuses = [
    APPLICATION_STATUS.PENDING,
    APPLICATION_STATUS.REVIEWING,
    APPLICATION_STATUS.SHORTLISTED,
    APPLICATION_STATUS.INTERVIEWING,
    APPLICATION_STATUS.ACCEPTED,
    APPLICATION_STATUS.REJECTED,
  ];

  if (!allowedStatuses.includes(newStatus)) {
    throw new BadRequestError(
      `Invalid status '${newStatus}'. Must be one of: ${allowedStatuses.join(', ')}`
    );
  }

  const application = await Application.findById(applicationId).populate('job');
  if (!application) {
    throw new NotFoundError('Application record not found.');
  }

  const isOwner =
    application.job?.recruiter &&
    application.job.recruiter.toString() === requestingUser._id.toString();
  const isAdmin = requestingUser.role === USER_ROLES.ADMIN;

  if (!isOwner && !isAdmin) {
    throw new ForbiddenError(
      'You are not authorized to update applications for another recruiter’s job listing.'
    );
  }

  application.status = newStatus;
  await application.save();

  await application.populate([
    { path: 'candidate', select: 'name email phone location skills' },
    { path: 'job', select: 'title company location status' },
  ]);

  return application;
};

/**
 * Check if the candidate has already applied to a given job
 */
export const getApplicationStatusForJob = async (jobId, candidateId) => {
  const application = await Application.findOne({
    candidate: candidateId,
    job: jobId,
  }).select('_id status createdAt');

  return {
    hasApplied: Boolean(application),
    application: application || null,
  };
};

export default {
  createApplication,
  getApplicationsForJob,
  getCandidateApplications,
  getApplicationById,
  cancelApplication,
  updateApplicationStatus,
  getApplicationStatusForJob,
};
