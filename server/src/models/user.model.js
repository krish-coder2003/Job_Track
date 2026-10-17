import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

export const USER_ROLES = Object.freeze({
  CANDIDATE: 'candidate',
  RECRUITER: 'recruiter',
  ADMIN: 'admin',
});

export const PUBLIC_ROLES = Object.freeze([
  USER_ROLES.CANDIDATE,
  USER_ROLES.RECRUITER,
]);

export const ACCOUNT_STATUS = Object.freeze({
  ACTIVE: 'active',
  DISABLED: 'disabled',
});

// Resume information subdocument schema
const resumeSchema = new mongoose.Schema(
  {
    url: {
      type: String,
      trim: true,
      default: '',
    },
    filename: {
      type: String,
      trim: true,
      default: '',
    },
    fileSize: {
      type: Number,
      default: null,
    },
    mimeType: {
      type: String,
      trim: true,
      default: '',
    },
    storageProvider: {
      type: String,
      enum: ['local', 'cloudinary'],
      default: 'local',
    },
    storageKey: {
      type: String,
      trim: true,
      default: '',
    },
    uploadedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

// Experience entry subdocument schema
const experienceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      trim: true,
      default: '',
    },
    company: {
      type: String,
      trim: true,
      default: '',
    },
    location: {
      type: String,
      trim: true,
      default: '',
    },
    startDate: {
      type: Date,
      default: null,
    },
    endDate: {
      type: Date,
      default: null,
    },
    current: {
      type: Boolean,
      default: false,
    },
    years: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
      default: null,
    },
    description: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { _id: true }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters long'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [
        /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/,
        'Please provide a valid email address',
      ],
      index: true,
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required'],
      select: false, // Hidden from queries by default
      validate: {
        validator: function (val) {
          // Verify it is a valid bcrypt hash format or pre-hashed string
          return typeof val === 'string' && (val.startsWith('$2') || val.length >= 60);
        },
        message: 'Plaintext passwords cannot be stored directly. Passwords must be securely hashed.',
      },
    },
    role: {
      type: String,
      enum: {
        values: Object.values(USER_ROLES),
        message: '{VALUE} is not a valid role. Allowed roles: candidate, recruiter, admin',
      },
      default: USER_ROLES.CANDIDATE,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: '',
      validate: {
        validator: function (val) {
          if (!val) return true;
          const cleaned = val.replace(/[\s\-().+]/g, '');
          return /^\d{7,15}$/.test(cleaned);
        },
        message: 'Please provide a valid phone number (7-15 digits)',
      },
    },
    location: {
      type: String,
      trim: true,
      default: '',
      set: function (val) {
        if (val && typeof val === 'object') {
          return [val.city, val.state, val.country].filter(Boolean).join(', ');
        }
        return val;
      },
    },
    skills: {
      type: [
        {
          type: String,
          trim: true,
        },
      ],
      default: [],
      index: true,
    },
    experience: {
      type: [experienceSchema],
      default: [],
      set: function (val) {
        if (typeof val === 'number') {
          return [{ years: val, description: `${val} years of experience` }];
        }
        if (typeof val === 'string') {
          const num = parseFloat(val);
          return [{ years: isNaN(num) ? undefined : num, description: val }];
        }
        return val;
      },
    },
    resume: {
      type: resumeSchema,
      default: () => ({}),
      alias: 'resumeInformation',
      set: function (val) {
        if (typeof val === 'string') {
          return { url: val, filename: val.split('/').pop() || 'resume.pdf' };
        }
        return val;
      },
    },
    status: {
      type: String,
      enum: {
        values: Object.values(ACCOUNT_STATUS),
        message: '{VALUE} is not a valid account status. Allowed: active, disabled',
      },
      default: ACCOUNT_STATUS.ACTIVE,
      alias: 'accountStatus',
      index: true,
    },
  },
  {
    timestamps: true, // Automatically provides createdAt and updatedAt
  }
);

// Composite & useful indexes for fast search and filtering
userSchema.index({ role: 1, status: 1 });
userSchema.index({ createdAt: -1 });

// Virtual field for password to handle plaintext input securely
userSchema
  .virtual('password')
  .set(function (plaintextPassword) {
    this._plaintextPassword = plaintextPassword;
  })
  .get(function () {
    return this._plaintextPassword;
  });

// Pre-validate hook: normalize email and hash virtual password before validation runs
userSchema.pre('validate', async function () {
  // Normalize email
  if (this.email) {
    this.email = this.email.toLowerCase().trim();
  }

  // Hash plaintext password if provided via virtual
  if (this._plaintextPassword) {
    const salt = await bcrypt.genSalt(10);
    this.passwordHash = await bcrypt.hash(this._plaintextPassword, salt);
    this._plaintextPassword = undefined;
  }

  // Guard for public registration: reject admin role if flagged
  if (this.$locals?.isPublicRegistration && this.role === USER_ROLES.ADMIN) {
    throw new Error('Public registration cannot assign the admin role.');
  }
});

// Strip passwordHash and __v from toJSON representations (API responses)
userSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

// Strip passwordHash and __v from toObject representations
userSchema.set('toObject', {
  transform: (_doc, ret) => {
    delete ret.passwordHash;
    delete ret.__v;
    return ret;
  },
});

/**
 * Compare a candidate password with the stored passwordHash
 */
userSchema.methods.comparePassword = async function (candidatePassword) {
  if (!this.passwordHash) {
    throw new Error('passwordHash is not present on user document. Ensure it was selected.');
  }
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

/**
 * Return a safe, clean public profile object without sensitive fields
 */
userSchema.methods.toPublicProfile = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  delete obj.__v;
  if (obj.resume) {
    const hasKey = Boolean(obj.resume.storageKey);
    obj.resume = {
      filename: hasKey ? obj.resume.filename : '',
      fileSize: hasKey ? obj.resume.fileSize : null,
      mimeType: hasKey ? obj.resume.mimeType : '',
      url: hasKey ? '/api/users/me/resume' : '',
      uploadedAt: hasKey ? obj.resume.uploadedAt : null,
      hasResume: hasKey,
    };
  }
  return obj;
};

/**
 * Utility static to hash a plaintext password
 */
userSchema.statics.hashPassword = async function (plaintext) {
  if (!plaintext || typeof plaintext !== 'string') {
    throw new Error('A valid plaintext password string is required');
  }
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(plaintext, salt);
};

/**
 * Validate that a requested role is allowed for public registration
 */
userSchema.statics.validatePublicRole = function (role) {
  if (!role) return USER_ROLES.CANDIDATE;
  const normalized = String(role).toLowerCase().trim();
  if (normalized === USER_ROLES.ADMIN) {
    const err = new Error('Public registration cannot assign the admin role.');
    err.statusCode = 403;
    throw err;
  }
  if (!PUBLIC_ROLES.includes(normalized)) {
    const err = new Error(
      `Invalid role '${role}'. Allowed public roles are: ${PUBLIC_ROLES.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }
  return normalized;
};

/**
 * Register a user through public registration flow (strictly disallows admin role)
 */
userSchema.statics.registerPublicUser = async function (userData) {
  const payload = { ...userData };
  payload.role = this.validatePublicRole(payload.role);

  const user = new this(payload);
  user.$locals.isPublicRegistration = true;
  await user.save();
  return user;
};

export const User = mongoose.model('User', userSchema);
export default User;
