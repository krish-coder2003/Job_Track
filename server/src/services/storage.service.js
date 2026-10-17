import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { v2 as cloudinary } from 'cloudinary';
import { NotFoundError, BadRequestError } from '../utils/errors.js';

// Local private storage root directory (stored outside of public static assets)
const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'storage/private/resumes');

// Ensure the private storage directory exists
if (!fs.existsSync(LOCAL_STORAGE_DIR)) {
  fs.mkdirSync(LOCAL_STORAGE_DIR, { recursive: true, mode: 0o700 });
}

// Inspect Cloudinary environment credentials
const isCloudinaryConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isCloudinaryConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Returns current active storage provider mode ('cloudinary' or 'local')
 */
export const getStorageProvider = () => {
  return isCloudinaryConfigured ? 'cloudinary' : 'local';
};

/**
 * Sanitizes original filename to prevent path traversal, null byte injections,
 * and dangerous executable names.
 *
 * @param {string} originalName - Raw filename from client
 * @returns {string} - Clean, safe display filename
 */
export const sanitizeFilename = (originalName = '') => {
  if (typeof originalName !== 'string') return 'resume.pdf';

  // Strip directory paths (both Unix / and Windows \)
  let clean = originalName.replace(/^.*[\\/]/, '');

  // Strip null bytes and ASCII control characters (without triggering no-control-regex lint rule)
  clean = clean
    .split('')
    .filter((char) => {
      const code = char.charCodeAt(0);
      return code >= 32 && code !== 127;
    })
    .join('');

  // Remove leading dots to prevent hidden/relative files
  clean = clean.replace(/^\.+/, '');

  // Whitelist safe characters: alphanumeric, dashes, underscores, spaces, dots
  clean = clean.replace(/[^a-zA-Z0-9_\-. ]/g, '_');

  // Collapse multiple dots to a single dot before extension
  const parts = clean.split('.');
  if (parts.length > 2) {
    const ext = parts.pop();
    clean = `${parts.join('_')}.${ext}`;
  }

  clean = clean.trim();
  return clean || 'resume.pdf';
};

/**
 * Stores a candidate resume securely either in private Cloudinary storage or private local disk.
 *
 * @param {Object} params
 * @param {string} params.userId - Authenticated candidate user ID
 * @param {Buffer} params.buffer - In-memory validated file buffer
 * @param {string} params.originalFilename - Client-reported filename
 * @param {string} params.mimeType - Validated MIME type
 * @param {string} params.ext - Validated extension ('pdf' or 'docx')
 */
export const saveResume = async ({ userId, buffer, originalFilename, mimeType, ext }) => {
  const sanitizedName = sanitizeFilename(originalFilename);
  const provider = getStorageProvider();
  const randomSuffix = crypto.randomBytes(12).toString('hex');
  const safeStorageKey = `${userId}-${Date.now()}-${randomSuffix}.${ext}`;

  if (provider === 'cloudinary') {
    const publicId = `resumes/${userId}-${Date.now()}-${randomSuffix}`;
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'jobtrack/private_resumes',
          public_id: publicId,
          resource_type: 'raw',
          type: 'authenticated', // Private authenticated asset
        },
        (error, result) => {
          if (error) return reject(error);
          resolve(result);
        }
      );
      uploadStream.end(buffer);
    });

    return {
      storageProvider: 'cloudinary',
      storageKey: uploadResult.public_id,
      filename: sanitizedName,
      fileSize: buffer.length,
      mimeType,
      url: '/api/users/me/resume',
      uploadedAt: new Date(),
    };
  }

  // Safe Local Development Storage Mode
  const targetPath = path.resolve(LOCAL_STORAGE_DIR, safeStorageKey);

  // Guarantee target path is strictly within LOCAL_STORAGE_DIR (Defense against path traversal)
  if (!targetPath.startsWith(LOCAL_STORAGE_DIR)) {
    throw new BadRequestError('Invalid file storage path: Path traversal detected.');
  }

  await fs.promises.writeFile(targetPath, buffer, { mode: 0o600 });

  return {
    storageProvider: 'local',
    storageKey: safeStorageKey,
    filename: sanitizedName,
    fileSize: buffer.length,
    mimeType,
    url: '/api/users/me/resume',
    uploadedAt: new Date(),
  };
};

/**
 * Deletes a previously stored resume from local disk or Cloudinary
 *
 * @param {Object} resumeInfo - The resume subdocument from User model
 */
export const deleteResume = async (resumeInfo) => {
  if (!resumeInfo || !resumeInfo.storageKey) return;

  const { storageProvider, storageKey } = resumeInfo;

  try {
    if (storageProvider === 'cloudinary') {
      await cloudinary.uploader.destroy(storageKey, {
        resource_type: 'raw',
        type: 'authenticated',
      });
    } else {
      // Local storage cleanup
      const filePath = path.resolve(LOCAL_STORAGE_DIR, storageKey);
      if (filePath.startsWith(LOCAL_STORAGE_DIR) && fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    }
  } catch (err) {
    // Non-fatal cleanup warning
    console.warn(`[Storage] Failed to delete previous resume (${storageKey}):`, err.message);
  }
};

/**
 * Retrieves a stream or authorized access URL for a stored resume
 *
 * @param {Object} resumeInfo - The resume subdocument from User model
 * @returns {Promise<{ isStream: boolean, stream?: ReadableStream, url?: string, mimeType: string, filename: string }>}
 */
export const getResumeAccess = async (resumeInfo) => {
  if (!resumeInfo || !resumeInfo.storageKey) {
    throw new NotFoundError('No resume document has been uploaded for this candidate.');
  }

  const { storageProvider, storageKey, mimeType, filename } = resumeInfo;

  if (storageProvider === 'cloudinary') {
    const ext = filename.split('.').pop() || 'pdf';
    // Generate signed, expiring URL for private Cloudinary asset
    const signedUrl = cloudinary.utils.private_download_url(storageKey, ext, {
      resource_type: 'raw',
      type: 'authenticated',
      expires_at: Math.floor(Date.now() / 1000) + 3600, // 1 hour time-to-live
    });

    return {
      isStream: false,
      url: signedUrl,
      mimeType: mimeType || 'application/pdf',
      filename: filename || 'resume.pdf',
    };
  }

  // Local storage streaming
  const filePath = path.resolve(LOCAL_STORAGE_DIR, storageKey);

  // Validate path traversal protection
  if (!filePath.startsWith(LOCAL_STORAGE_DIR)) {
    throw new BadRequestError('Invalid file access: Path traversal detected.');
  }

  if (!fs.existsSync(filePath)) {
    throw new NotFoundError('The requested resume document could not be found on storage.');
  }

  return {
    isStream: true,
    stream: fs.createReadStream(filePath),
    mimeType: mimeType || 'application/pdf',
    filename: filename || 'resume.pdf',
  };
};

export default {
  getStorageProvider,
  sanitizeFilename,
  saveResume,
  deleteResume,
  getResumeAccess,
};
