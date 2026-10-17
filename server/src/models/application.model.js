import mongoose from 'mongoose';

export const APPLICATION_STATUS = Object.freeze({
  PENDING: 'pending',
  REVIEWING: 'reviewing',
  SHORTLISTED: 'shortlisted',
  INTERVIEWING: 'interviewing',
  REJECTED: 'rejected',
  ACCEPTED: 'accepted',
  WITHDRAWN: 'withdrawn',
  CANCELLED: 'cancelled',
});

/**
 * Immutable Resume Snapshot subdocument schema.
 * Preserves the exact resume state as submitted at application time,
 * guaranteeing candidate profile updates do not alter past application records.
 */
const resumeSnapshotSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      default: '',
    },
    filename: {
      type: String,
      trim: true,
      required: [true, 'Resume filename is required in snapshot'],
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      trim: true,
      default: 'application/pdf',
    },
    storageProvider: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'local',
    },
    storageKey: {
      type: String,
      trim: true,
      required: [true, 'Resume storage key is required in snapshot'],
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const applicationSchema = new mongoose.Schema(
  {
    candidate: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Candidate reference is required'],
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Job',
      required: [true, 'Job reference is required'],
      index: true,
    },
    resume: {
      type: resumeSnapshotSchema,
      required: [true, 'Resume snapshot is required'],
    },
    coverLetter: {
      type: String,
      trim: true,
      maxlength: [5000, 'Cover letter cannot exceed 5000 characters'],
      default: '',
    },
    status: {
      type: String,
      enum: {
        values: Object.values(APPLICATION_STATUS),
        message: 'Invalid application status. Must be one of: {VALUES}',
      },
      default: APPLICATION_STATUS.PENDING,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

// Compound unique index guaranteeing a candidate can only apply once to a given job
applicationSchema.index({ candidate: 1, job: 1 }, { unique: true });

// Query optimization indexes
applicationSchema.index({ job: 1, status: 1, createdAt: -1 });
applicationSchema.index({ candidate: 1, createdAt: -1 });

const Application = mongoose.model('Application', applicationSchema);

export default Application;
