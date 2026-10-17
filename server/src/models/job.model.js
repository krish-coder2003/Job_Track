import mongoose from 'mongoose';

export const JOB_STATUS = Object.freeze({
  DRAFT: 'draft',
  ACTIVE: 'active',
  CLOSED: 'closed',
  ARCHIVED: 'archived',
});

export const JOB_TYPES = Object.freeze({
  FULL_TIME: 'full-time',
  PART_TIME: 'part-time',
  CONTRACT: 'contract',
  INTERNSHIP: 'internship',
  TEMPORARY: 'temporary',
});

export const WORK_MODES = Object.freeze({
  ON_SITE: 'on-site',
  REMOTE: 'remote',
  HYBRID: 'hybrid',
});

export const EXPERIENCE_LEVELS = Object.freeze({
  ENTRY: 'entry',
  MID: 'mid',
  SENIOR: 'senior',
  LEAD: 'lead',
  EXECUTIVE: 'executive',
});

export const ALLOWED_STATUS_TRANSITIONS = Object.freeze({
  [JOB_STATUS.DRAFT]: [JOB_STATUS.ACTIVE, JOB_STATUS.ARCHIVED],
  [JOB_STATUS.ACTIVE]: [JOB_STATUS.CLOSED, JOB_STATUS.ARCHIVED, JOB_STATUS.DRAFT],
  [JOB_STATUS.CLOSED]: [JOB_STATUS.ACTIVE, JOB_STATUS.ARCHIVED],
  [JOB_STATUS.ARCHIVED]: [JOB_STATUS.DRAFT, JOB_STATUS.ACTIVE],
});

// Salary range subdocument schema
const salarySchema = new mongoose.Schema(
  {
    min: {
      type: Number,
      min: [0, 'Minimum salary cannot be negative'],
      default: null,
    },
    max: {
      type: Number,
      min: [0, 'Maximum salary cannot be negative'],
      default: null,
    },
    currency: {
      type: String,
      trim: true,
      default: 'USD',
      uppercase: true,
      maxlength: 5,
    },
    period: {
      type: String,
      enum: {
        values: ['yearly', 'monthly', 'hourly', 'weekly'],
        message: 'Invalid salary period. Allowed values: yearly, monthly, hourly, weekly',
      },
      default: 'yearly',
    },
  },
  { _id: false }
);

// Salary min/max consistency validator
salarySchema.pre('validate', function (next) {
  if (this.min != null && this.max != null && this.min > this.max) {
    this.invalidate('min', 'Minimum salary cannot exceed maximum salary.');
  }
  next();
});

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      minlength: [3, 'Job title must be at least 3 characters long'],
      maxlength: [150, 'Job title cannot exceed 150 characters'],
      index: true,
    },
    company: {
      type: String,
      required: [true, 'Company name is required'],
      trim: true,
      minlength: [2, 'Company name must be at least 2 characters long'],
      maxlength: [100, 'Company name cannot exceed 100 characters'],
      index: true,
    },
    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      minlength: [10, 'Job description must be at least 10 characters long'],
    },
    responsibilities: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
    },
    requiredSkills: {
      type: [
        {
          type: String,
          trim: true,
          lowercase: true,
        },
      ],
      default: [],
      index: true,
    },
    location: {
      type: String,
      required: [true, 'Job location is required'],
      trim: true,
      maxlength: [150, 'Location cannot exceed 150 characters'],
      index: true,
    },
    jobType: {
      type: String,
      required: [true, 'Job type is required'],
      enum: {
        values: Object.values(JOB_TYPES),
        message: 'Invalid job type. Must be one of: {VALUES}',
      },
      index: true,
    },
    workMode: {
      type: String,
      required: [true, 'Work mode is required'],
      enum: {
        values: Object.values(WORK_MODES),
        message: 'Invalid work mode. Must be one of: {VALUES}',
      },
      index: true,
    },
    experienceLevel: {
      type: String,
      required: [true, 'Experience level is required'],
      enum: {
        values: Object.values(EXPERIENCE_LEVELS),
        message: 'Invalid experience level. Must be one of: {VALUES}',
      },
      index: true,
    },
    salary: {
      type: salarySchema,
      default: null,
    },
    applicationDeadline: {
      type: Date,
      default: null,
    },
    status: {
      type: String,
      enum: {
        values: Object.values(JOB_STATUS),
        message: 'Invalid job status. Must be one of: {VALUES}',
      },
      default: JOB_STATUS.ACTIVE,
      index: true,
    },
    isApproved: {
      type: Boolean,
      default: true,
      index: true,
    },
    moderationNote: {
      type: String,
      trim: true,
      default: '',
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
    },
    moderatedAt: {
      type: Date,
      default: null,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recruiter reference is required'],
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for public listings query
jobSchema.index({ status: 1, isApproved: 1, createdAt: -1 });

// Compound indexes for public filter queries
jobSchema.index({ status: 1, isApproved: 1, jobType: 1, createdAt: -1 });
jobSchema.index({ status: 1, isApproved: 1, workMode: 1, createdAt: -1 });
jobSchema.index({ status: 1, isApproved: 1, experienceLevel: 1, createdAt: -1 });
jobSchema.index({ status: 1, isApproved: 1, location: 1, createdAt: -1 });
jobSchema.index({
  status: 1,
  isApproved: 1,
  jobType: 1,
  workMode: 1,
  experienceLevel: 1,
  createdAt: -1,
});

// Compound index for recruiter's job list
jobSchema.index({ recruiter: 1, status: 1, createdAt: -1 });

// Text index for keyword search on title, company, description, and location
jobSchema.index({
  title: 'text',
  company: 'text',
  description: 'text',
  location: 'text',
});

const Job = mongoose.model('Job', jobSchema);

export default Job;
