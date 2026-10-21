import mongoose from 'mongoose';

/**
 * Default ATS scoring weights (must sum to 100).
 * Recruiters may override these; values are stored with each criteria document.
 */
export const DEFAULT_ATS_WEIGHTS = Object.freeze({
  skills: 35,
  projects: 25,
  experience: 20,
  education: 10,
  keywords: 10,
});

/**
 * Education level ordering used for "minimum education" comparisons.
 */
export const EDUCATION_LEVELS = Object.freeze([
  'none',
  'high-school',
  'associate',
  'bachelor',
  'master',
  'phd',
  'any',
]);

// Scoring weight sub-document (one per criteria document)
const weightsSchema = new mongoose.Schema(
  {
    skills: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: DEFAULT_ATS_WEIGHTS.skills,
    },
    projects: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: DEFAULT_ATS_WEIGHTS.projects,
    },
    experience: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: DEFAULT_ATS_WEIGHTS.experience,
    },
    education: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: DEFAULT_ATS_WEIGHTS.education,
    },
    keywords: {
      type: Number,
      min: [0, 'Weight cannot be negative'],
      default: DEFAULT_ATS_WEIGHTS.keywords,
    },
    isDefault: {
      type: Boolean,
      default: true,
    },
  },
  { _id: false }
);

const jobCriteriaSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      unique: true, // One criteria document per job
      index: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter reference is required'],
      index: true,
    },

    // ── Skill requirements ─────────────────────────────────────────
    requiredSkills: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },
    preferredSkills: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },

    // ── Education requirements ─────────────────────────────────────
    minimumEducation: {
      type: String,
      enum: {
        values: EDUCATION_LEVELS,
        message: 'Invalid education level',
      },
      default: 'any',
    },
    preferredEducation: {
      type: String,
      trim: true,
      default: '',
      maxlength: [200, 'Preferred education cannot exceed 200 characters'],
    },

    // ── Experience requirements ────────────────────────────────────
    minimumExperienceYears: {
      type: Number,
      min: [0, 'Minimum experience years cannot be negative'],
      default: 0,
    },

    // ── Project requirements ───────────────────────────────────────
    projectRequirements: {
      type: String,
      trim: true,
      default: '',
      maxlength: [1000, 'Project requirements cannot exceed 1000 characters'],
    },

    // ── Additional JD keywords for alignment scoring ───────────────
    jobDescriptionKeywords: {
      type: [{ type: String, trim: true, lowercase: true }],
      default: [],
    },

    // ── Configurable category weights ─────────────────────────────
    weights: {
      type: weightsSchema,
      default: () => ({
        skills: DEFAULT_ATS_WEIGHTS.skills,
        projects: DEFAULT_ATS_WEIGHTS.projects,
        experience: DEFAULT_ATS_WEIGHTS.experience,
        education: DEFAULT_ATS_WEIGHTS.education,
        keywords: DEFAULT_ATS_WEIGHTS.keywords,
        isDefault: true,
      }),
    },
  },
  {
    timestamps: true,
  }
);

const JobCriteria = mongoose.model('JobCriteria', jobCriteriaSchema);
export default JobCriteria;
