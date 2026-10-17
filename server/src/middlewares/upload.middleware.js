import multer from 'multer';
import { BadRequestError } from '../utils/errors.js';

// Maximum allowed resume file size: 5 Megabytes
const MAX_FILE_SIZE = 5 * 1024 * 1024;

// Permitted MIME types reported by client
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/msword',
];

// Configure Multer to buffer file in memory so we can inspect magic bytes before saving
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    const ext = (file.originalname || '').split('.').pop().toLowerCase();
    const allowedExts = ['pdf', 'docx', 'doc'];

    if (!allowedExts.includes(ext)) {
      return cb(
        new BadRequestError(
          `Invalid file extension '.${ext}'. Only PDF and DOCX documents are permitted.`
        )
      );
    }

    if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
      return cb(
        new BadRequestError(
          `Invalid MIME type '${file.mimetype}'. Only PDF and DOCX documents are permitted.`
        )
      );
    }

    cb(null, true);
  },
}).single('resume');

/**
 * Express middleware wrapper to invoke Multer and handle limits uniformly
 */
export const resumeUploadMiddleware = (req, res, next) => {
  upload(req, res, (err) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            new BadRequestError(
              `Resume file exceeds maximum size limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
            )
          );
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          return next(
            new BadRequestError(
              `Unexpected field '${err.field}'. Please upload the document with field name 'resume'.`
            )
          );
        }
        return next(new BadRequestError(`Upload error: ${err.message}`));
      }
      return next(err);
    }
    next();
  });
};

/**
 * Validates actual binary content using magic bytes.
 * Guarantees that users cannot bypass validation by simply renaming malicious files to .pdf or .docx.
 */
export const validateResumeMagicBytes = (req, res, next) => {
  const file = req.file;

  if (!file || !file.buffer) {
    return next(
      new BadRequestError(
        'Resume file is required. Please upload a PDF or DOCX file with key "resume".'
      )
    );
  }

  const buffer = file.buffer;

  if (buffer.length < 4) {
    return next(new BadRequestError('Uploaded file is empty or corrupted.'));
  }

  // 1. PDF Magic Bytes: %PDF- (Hex: 25 50 44 46)
  const isPdf =
    buffer[0] === 0x25 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x44 &&
    buffer[3] === 0x46;

  // 2. DOCX / OpenXML Magic Bytes: PK\x03\x04 (Hex: 50 4B 03 04)
  const isDocxZip =
    buffer[0] === 0x50 &&
    buffer[1] === 0x4b &&
    buffer[2] === 0x03 &&
    buffer[3] === 0x04;

  let verifiedMime = null;
  let verifiedExt = null;

  if (isPdf) {
    verifiedMime = 'application/pdf';
    verifiedExt = 'pdf';
  } else if (isDocxZip) {
    // Inspect buffer to confirm OpenXML Word document structure
    const sample = buffer.subarray(0, Math.min(buffer.length, 4096)).toString('binary');
    const isWordDocument =
      sample.includes('word/') ||
      sample.includes('[Content_Types].xml') ||
      sample.includes('_rels/');

    if (isWordDocument) {
      verifiedMime =
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      verifiedExt = 'docx';
    } else {
      return next(
        new BadRequestError(
          'Uploaded archive is not a valid Microsoft Word (.docx) document.'
        )
      );
    }
  }

  if (!verifiedMime) {
    return next(
      new BadRequestError(
        'Document validation failed. File content does not match an authentic PDF or DOCX signature.'
      )
    );
  }

  // Attach verified file metadata
  req.validatedResume = {
    buffer: file.buffer,
    originalFilename: file.originalname || `resume.${verifiedExt}`,
    mimeType: verifiedMime,
    ext: verifiedExt,
    size: file.size,
  };

  next();
};

export default {
  resumeUploadMiddleware,
  validateResumeMagicBytes,
};
