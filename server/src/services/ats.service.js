/**
 * ATS orchestration service.
 *
 * Coordinates criteria persistence, report creation/retrieval, and the
 * extraction → scoring pipeline without exposing internal storage paths
 * or AI credentials to callers.
 */

import Job from '../models/job.model.js';
import JobCriteria, { DEFAULT_ATS_WEIGHTS } from '../models/jobCriteria.model.js';
import ATSReport, { ATS_REPORT_STATUS } from '../models/atsReport.model.js';
import Application from '../models/application.model.js';
import { extractResumeText } from './resumeExtractor.service.js';
import { scoreResume } from './atsEngine.service.js';
import { NotFoundError, ForbiddenError, BadRequestError } from '../utils/errors.js';
import { SCORING_VERSION } from './atsEngine.service.js';

// ─── Criteria ──────────────────────────────────────────────────────────────────

/**
 * Upsert (create or update) evaluation criteria for a job.
 * Only the job's owning recruiter or an admin may call this.
 *
 * @param {string} jobId
 * @param {Object} criteriaData
 * @param {Object} requestingUser  - Authenticated user object
 * @returns {Promise<Object>}      - Saved JobCriteria document
 */
export async function saveCriteria(jobId, criteriaData, requestingUser) {
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found.');

  // Authorization: recruiter must own the job (admin may bypass)
  if (requestingUser.role === 'recruiter' &&
      job.recruiter.toString() !== requestingUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to define criteria for this job.');
  }

  const {
    requiredSkills,
    preferredSkills,
    minimumEducation,
    preferredEducation,
    minimumExperienceYears,
    projectRequirements,
    jobDescriptionKeywords,
    weights,
  } = criteriaData;

  // Validate weights when provided
  let resolvedWeights;
  if (weights) {
    const keys = ['skills', 'projects', 'experience', 'education', 'keywords'];
    for (const k of keys) {
      if (weights[k] !== undefined && (typeof weights[k] !== 'number' || weights[k] < 0)) {
        throw new BadRequestError(`Weight '${k}' must be a non-negative number.`);
      }
    }
    resolvedWeights = {
      ...weights,
      isDefault: false,
    };
  }

  const update = {
    recruiter: job.recruiter,
    ...(requiredSkills !== undefined && { requiredSkills: requiredSkills.map(String) }),
    ...(preferredSkills !== undefined && { preferredSkills: preferredSkills.map(String) }),
    ...(minimumEducation !== undefined && { minimumEducation }),
    ...(preferredEducation !== undefined && { preferredEducation }),
    ...(minimumExperienceYears !== undefined && { minimumExperienceYears }),
    ...(projectRequirements !== undefined && { projectRequirements }),
    ...(jobDescriptionKeywords !== undefined && { jobDescriptionKeywords: jobDescriptionKeywords.map(String) }),
    ...(resolvedWeights && { weights: resolvedWeights }),
  };

  const criteria = await JobCriteria.findOneAndUpdate(
    { job: jobId },
    { $set: update },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  return criteria;
}

/**
 * Get criteria for a job (public read — anyone with job access may read criteria).
 *
 * @param {string} jobId
 * @returns {Promise<Object|null>}
 */
export async function getCriteriaForJob(jobId) {
  return JobCriteria.findOne({ job: jobId }).lean();
}

// ─── Report creation / retrieval ──────────────────────────────────────────────

/**
 * Request ATS analysis for an application.
 *
 * - Prevents duplicate concurrent runs (if status is processing, return existing).
 * - Extracts resume text, runs the scoring engine, and saves the report.
 * - Reports processing failure without throwing so callers always get a structured response.
 *
 * @param {string} applicationId
 * @param {Object} requestingUser
 * @param {Object} [options]
 * @param {boolean} [options.forceReprocess=false] - Re-run even if a completed report exists
 * @returns {Promise<ATSReport>}
 */
export async function requestATSReport(applicationId, requestingUser, { forceReprocess = false } = {}) {
  // Load application and populate needed fields
  const application = await Application.findById(applicationId)
    .populate('job')
    .populate('candidate', 'name email resume role status');

  if (!application) throw new NotFoundError('Application not found.');

  const job = application.job;
  if (!job) throw new NotFoundError('Job associated with application not found.');

  // Authorization: recruiter must own the job
  if (requestingUser.role === 'recruiter' &&
      job.recruiter.toString() !== requestingUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to request ATS analysis for this application.');
  }

  // Prevent candidate from triggering AI processing on their own applications
  if (requestingUser.role === 'candidate') {
    throw new ForbiddenError('Candidates cannot request ATS analysis.');
  }

  // Check for existing report
  const existing = await ATSReport.findOne({ application: applicationId });

  if (existing) {
    // Duplicate concurrent processing protection
    if (existing.status === ATS_REPORT_STATUS.PROCESSING) {
      return existing;
    }
    // Already completed — return unless force-reprocess
    if (existing.status === ATS_REPORT_STATUS.COMPLETED && !forceReprocess) {
      return existing;
    }
  }

  // Prepare criteria (create empty criteria if none defined)
  let criteria = await JobCriteria.findOne({ job: job._id });
  if (!criteria) {
    criteria = await JobCriteria.create({
      job: job._id,
      recruiter: job.recruiter,
    });
  }

  // Take a snapshot of the criteria as-used (for reproducibility)
  const criteriaSnapshot = {
    requiredSkills: criteria.requiredSkills || [],
    preferredSkills: criteria.preferredSkills || [],
    minimumEducation: criteria.minimumEducation || 'any',
    preferredEducation: criteria.preferredEducation || '',
    minimumExperienceYears: criteria.minimumExperienceYears || 0,
    projectRequirements: criteria.projectRequirements || '',
    jobDescriptionKeywords: criteria.jobDescriptionKeywords || [],
    weights: criteria.weights
      ? criteria.weights.toObject
        ? criteria.weights.toObject()
        : { ...criteria.weights }
      : { ...DEFAULT_ATS_WEIGHTS, isDefault: true },
  };

  // Mark report as processing (upsert)
  const report = await ATSReport.findOneAndUpdate(
    { application: applicationId },
    {
      $set: {
        application: applicationId,
        job: job._id,
        candidate: application.candidate._id,
        requestedBy: requestingUser._id,
        status: ATS_REPORT_STATUS.PROCESSING,
        processingStartedAt: new Date(),
        processingCompletedAt: null,
        criteriaSnapshot,
        scoringVersion: SCORING_VERSION,
        errorMessage: '',
        overallScore: null,
        categoryScores: {},
        explanation: '',
        aiAssisted: false,
        aiProvider: '',
      },
    },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );

  // Run extraction and scoring asynchronously but await here so
  // the API returns the completed report (or failure) in one call.
  try {
    const candidate = application.candidate;

    // Validate resume availability
    if (!candidate.resume || !candidate.resume.storageKey) {
      await ATSReport.findByIdAndUpdate(report._id, {
        $set: {
          status: ATS_REPORT_STATUS.UNAVAILABLE,
          errorMessage: 'Candidate has not uploaded a resume.',
          processingCompletedAt: new Date(),
        },
      });
      return ATSReport.findById(report._id);
    }

    // Extract text
    const extraction = await extractResumeText({ resumeInfo: candidate.resume });

    if (!extraction.success || !extraction.text) {
      const errMsg = extraction.warning || 'Resume text extraction failed.';
      await ATSReport.findByIdAndUpdate(report._id, {
        $set: {
          status: ATS_REPORT_STATUS.FAILED,
          errorMessage: errMsg,
          processingCompletedAt: new Date(),
        },
      });
      return ATSReport.findById(report._id);
    }

    // Score
    const scoring = await scoreResume({
      resumeText: extraction.text,
      criteria,
      job,
      useAI: true,
    });

    // Persist completed report
    const updated = await ATSReport.findByIdAndUpdate(
      report._id,
      {
        $set: {
          status: ATS_REPORT_STATUS.COMPLETED,
          overallScore: scoring.overallScore,
          categoryScores: scoring.categoryScores,
          explanation: scoring.explanation,
          aiAssisted: scoring.aiAssisted,
          aiProvider: scoring.aiProvider || '',
          processingCompletedAt: new Date(),
          errorMessage: '',
        },
      },
      { new: true }
    );

    return updated;
  } catch (err) {
    // Unrecoverable error
    console.error('[ATSService] Processing error:', err.message);
    await ATSReport.findByIdAndUpdate(report._id, {
      $set: {
        status: ATS_REPORT_STATUS.FAILED,
        errorMessage: `Unexpected error: ${err.message}`,
        processingCompletedAt: new Date(),
      },
    });
    return ATSReport.findById(report._id);
  }
}

/**
 * Retrieve an existing ATS report for an application.
 *
 * @param {string} applicationId
 * @param {Object} requestingUser
 * @returns {Promise<ATSReport|null>}
 */
export async function getATSReport(applicationId, requestingUser) {
  const application = await Application.findById(applicationId).populate('job');
  if (!application) throw new NotFoundError('Application not found.');

  const job = application.job;

  // Candidates cannot access recruiter-only ATS reports
  if (requestingUser.role === 'candidate') {
    throw new ForbiddenError('ATS reports are not available to candidates.');
  }

  // Recruiter must own the job
  if (requestingUser.role === 'recruiter' &&
      job?.recruiter?.toString() !== requestingUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to view this ATS report.');
  }

  return ATSReport.findOne({ application: applicationId }).lean();
}

/**
 * Get ATS reports for all applications to a job (for the applicant list view).
 *
 * @param {string} jobId
 * @param {Object} requestingUser
 * @returns {Promise<Map<string, Object>>} - Map of applicationId → report
 */
export async function getATSReportsForJob(jobId, requestingUser) {
  const job = await Job.findById(jobId);
  if (!job) throw new NotFoundError('Job not found.');

  if (requestingUser.role === 'recruiter' &&
      job.recruiter.toString() !== requestingUser._id.toString()) {
    throw new ForbiddenError('You are not authorized to view reports for this job.');
  }

  const reports = await ATSReport.find({ job: jobId })
    .select('application overallScore status aiAssisted processingCompletedAt')
    .lean();

  // Return as a map keyed by applicationId string for easy frontend lookup
  const map = {};
  for (const r of reports) {
    map[r.application.toString()] = r;
  }
  return map;
}

export default {
  saveCriteria,
  getCriteriaForJob,
  requestATSReport,
  getATSReport,
  getATSReportsForJob,
};
