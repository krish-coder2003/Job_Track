import mongoose from 'mongoose';

/**
 * Processing status for an ATS analysis report.
 */
export const ATS_REPORT_STATUS = Object.freeze({
  PENDING: 'pending',       // Queued, not yet started
  PROCESSING: 'processing', // Currently extracting / scoring
  COMPLETED: 'completed',   // Successfully scored
  FAILED: 'failed',         // Unrecoverable extraction or scoring error
  UNAVAILABLE: 'unavailable', // No resume to process
});

// Individual category score sub-document
const categoryScoreSchema = new mongoose.Schema(
  {
    score: { type: Number, min: 0, max: 100, default: 0 },
    weight: { type: Number, min: 0, default: 0 },
    weightedScore: { type: Number, min: 0, default: 0 },
    matched: { type: [String], default: [] },
    missing: { type: [String], default: [] },
    evidence: { type: [String], default: [] },
    note: { type: String, trim: true, default: '' },
  },
  { _id: false }
);

// Snapshot of criteria at time of scoring (for reproducibility)
const criteriaSnapshotSchema = new mongoose.Schema(
  {
    requiredSkills: { type: [String], default: [] },
    preferredSkills: { type: [String], default: [] },
    minimumEducation: { type: String, default: 'any' },
    preferredEducation: { type: String, default: '' },
    minimumExperienceYears: { type: Number, default: 0 },
    projectRequirements: { type: String, default: '' },
    jobDescriptionKeywords: { type: [String], default: [] },
    weights: {
      skills: { type: Number, default: 35 },
      projects: { type: Number, default: 25 },
      experience: { type: Number, default: 20 },
      education: { type: Number, default: 10 },
      keywords: { type: Number, default: 10 },
      isDefault: { type: Boolean, default: true },
    },
  },
  { _id: false }
);

const atsReportSchema = new mongoose.Schema(
  {
    application: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Application',
      required: [true, 'Application reference is required'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate reference is required'],
      index: true,
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Processing status ──────────────────────────────────────────
    status: {
      type: String,
      enum: Object.values(ATS_REPORT_STATUS),
      default: ATS_REPORT_STATUS.PENDING,
      index: true,
    },
    errorMessage: {
      type: String,
      trim: true,
      default: '',
    },
    processingStartedAt: { type: Date, default: null },
    processingCompletedAt: { type: Date, default: null },

    // ── Scoring version (for reproducibility audit) ────────────────
    scoringVersion: {
      type: String,
      trim: true,
      default: '1.0',
    },
    aiAssisted: {
      type: Boolean,
      default: false,
    },
    aiProvider: {
      type: String,
      trim: true,
      default: '',
    },

    // ── Criteria snapshot (immutable snapshot used for this run) ───
    criteriaSnapshot: {
      type: criteriaSnapshotSchema,
      default: null,
    },

    // ── Scores ────────────────────────────────────────────────────
    overallScore: {
      type: Number,
      min: 0,
      max: 100,
      default: null,
    },
    categoryScores: {
      skills: { type: categoryScoreSchema, default: null },
      projects: { type: categoryScoreSchema, default: null },
      experience: { type: categoryScoreSchema, default: null },
      education: { type: categoryScoreSchema, default: null },
      keywords: { type: categoryScoreSchema, default: null },
    },

    // ── Human-readable explanation (AI-generated if ai-assisted) ───
    explanation: {
      type: String,
      trim: true,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// A single report per application (upsert pattern supported via findOneAndUpdate)
atsReportSchema.index({ application: 1 }, { unique: true });

// Recruiter queries: all reports for a job
atsReportSchema.index({ job: 1, status: 1, overallScore: -1 });

const ATSReport = mongoose.model('ATSReport', atsReportSchema);
export default ATSReport;
