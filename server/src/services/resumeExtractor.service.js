import fs from 'fs';
import path from 'path';
import { BadRequestError } from '../utils/errors.js';

// ─── Constants ────────────────────────────────────────────────────────────────

const LOCAL_STORAGE_DIR = path.resolve(process.cwd(), 'storage/private/resumes');
const MAX_EXTRACT_BYTES = 5 * 1024 * 1024; // 5 MB safety cap
const MAX_EXTRACTED_CHARS = 50_000;        // Truncate very long resumes before scoring

/**
 * Supported MIME types and their canonical extension names.
 */
const SUPPORTED_MIME_TYPES = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  // Common browser-reported aliases
  'application/msword': 'doc',
};

// ─── Lazy-load heavy parser dependencies ─────────────────────────────────────
// pdf-parse and mammoth have top-level side effects on import, so we load them
// only when actually needed to avoid slowing down server startup.

let PDFParseClass = null;
let mammoth = null;

async function getPdfParse() {
  if (!PDFParseClass) {
    const mod = await import('pdf-parse');
    PDFParseClass = mod.PDFParse || mod.default?.PDFParse || mod.default;
  }
  return PDFParseClass;
}

async function getMammoth() {
  if (!mammoth) {
    const mod = await import('mammoth');
    mammoth = mod.default;
  }
  return mammoth;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Read a resume file buffer from local storage by storageKey.
 * Validates path traversal and file existence.
 *
 * @param {string} storageKey - Filename within LOCAL_STORAGE_DIR
 * @returns {Promise<Buffer>}
 */
async function readLocalResumeBuffer(storageKey) {
  const filePath = path.resolve(LOCAL_STORAGE_DIR, storageKey);

  // Path-traversal guard
  if (!filePath.startsWith(LOCAL_STORAGE_DIR)) {
    throw new BadRequestError('Invalid storage key: path traversal detected.');
  }

  if (!fs.existsSync(filePath)) {
    throw new BadRequestError('Resume file not found in local storage.');
  }

  const { size } = fs.statSync(filePath);
  if (size > MAX_EXTRACT_BYTES) {
    throw new BadRequestError(`Resume file exceeds the ${MAX_EXTRACT_BYTES / 1024 / 1024} MB extraction limit.`);
  }

  return fs.promises.readFile(filePath);
}

/**
 * Truncate extracted text to MAX_EXTRACTED_CHARS and normalise whitespace.
 *
 * @param {string} raw
 * @returns {string}
 */
function normaliseText(raw) {
  if (typeof raw !== 'string') return '';
  // Collapse multiple blank lines / carriage returns to single newlines
  const cleaned = raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .replace(/[ \t]+/g, ' ')        // Collapse horizontal whitespace
    .replace(/\n{3,}/g, '\n\n')     // No more than one blank line
    .trim();

  if (cleaned.length > MAX_EXTRACTED_CHARS) {
    return cleaned.slice(0, MAX_EXTRACTED_CHARS) + '\n[... truncated ...]';
  }
  return cleaned;
}

// ─── Extractors ───────────────────────────────────────────────────────────────

/**
 * Extract plain text from a PDF buffer.
 * Handles encrypted, corrupted and empty PDFs without throwing to callers.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, pageCount: number | null, warning: string | null }>}
 */
async function extractFromPdf(buffer) {
  if (!buffer || buffer.length === 0) {
    return {
      text: '',
      pageCount: null,
      warning: 'PDF buffer is empty.',
    };
  }

  try {
    const PDFParse = await getPdfParse();
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText();

    const text = normaliseText(result?.text || '');

    if (!text || text.trim().length === 0) {
      return {
        text: '',
        pageCount: result?.total || null,
        warning: 'PDF was parsed but contained no readable text (may be image-based or encrypted).',
      };
    }

    return { text, pageCount: result?.total || null, warning: null };
  } catch (err) {
    // Do not rethrow — return a structured failure the caller can act on
    return {
      text: '',
      pageCount: null,
      warning: `PDF extraction failed: ${err.message}`,
    };
  }
}

/**
 * Extract plain text from a DOCX buffer using mammoth.
 *
 * @param {Buffer} buffer
 * @returns {Promise<{ text: string, warning: string | null }>}
 */
async function extractFromDocx(buffer) {
  const mam = await getMammoth();
  try {
    const result = await mam.extractRawText({ buffer });

    // Collect any non-fatal mammoth messages as a combined warning
    const messages = (result.messages || [])
      .filter((m) => m.type === 'warning')
      .map((m) => m.message)
      .join('; ');

    const text = normaliseText(result.value || '');

    if (!text || text.trim().length < 20) {
      return {
        text: '',
        warning: 'DOCX was parsed but contained no readable text.',
      };
    }

    return { text, warning: messages || null };
  } catch (err) {
    return {
      text: '',
      warning: `DOCX extraction failed: ${err.message}`,
    };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Extract plain text from a resume stored in local storage or a provided buffer.
 *
 * Priority: if `buffer` is provided it is used directly (e.g. in tests).
 * Otherwise the file is read from local storage by `storageKey`.
 *
 * @param {Object} params
 * @param {Object}  params.resumeInfo   - Resume sub-document from User/Application
 * @param {Buffer}  [params.buffer]     - Optional pre-loaded buffer (skips disk read)
 * @returns {Promise<{
 *   text: string,
 *   mimeType: string,
 *   pageCount: number|null,
 *   warning: string|null,
 *   success: boolean
 * }>}
 */
export async function extractResumeText({ resumeInfo, buffer: providedBuffer = null }) {
  const { storageProvider, storageKey, mimeType, filename } = resumeInfo || {};

  if (!storageKey) {
    return { text: '', mimeType: '', pageCount: null, warning: 'No resume storage key.', success: false };
  }

  // Determine file format from MIME type; fall back to extension from filename
  const resolvedMime = mimeType || '';
  const fileExt = (filename || storageKey).split('.').pop()?.toLowerCase();

  let isPdf = resolvedMime === 'application/pdf' || fileExt === 'pdf';
  let isDocx =
    resolvedMime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileExt === 'docx';

  // Reject unsupported formats before reading any file
  if (!isPdf && !isDocx) {
    return {
      text: '',
      mimeType: resolvedMime,
      pageCount: null,
      warning: `Unsupported resume format: ${resolvedMime || fileExt}. Only PDF and DOCX are supported.`,
      success: false,
    };
  }

  // Obtain buffer
  let buf = providedBuffer;
  if (!buf) {
    if (storageProvider === 'cloudinary') {
      // Cloudinary streaming for extraction is not yet implemented:
      // the file would need to be fetched via a signed URL and buffered.
      // For now mark as unavailable for AI extraction (Cloudinary resumes
      // may still be reviewed manually by the recruiter via the existing
      // resume access endpoint).
      return {
        text: '',
        mimeType: resolvedMime,
        pageCount: null,
        warning: 'ATS text extraction is not yet supported for Cloudinary-stored resumes. The recruiter can still access the resume directly.',
        success: false,
      };
    }
    try {
      buf = await readLocalResumeBuffer(storageKey);
    } catch (err) {
      return { text: '', mimeType: resolvedMime, pageCount: null, warning: err.message, success: false };
    }
  }

  // Validate buffer size
  if (buf.length > MAX_EXTRACT_BYTES) {
    return {
      text: '',
      mimeType: resolvedMime,
      pageCount: null,
      warning: `Resume buffer exceeds ${MAX_EXTRACT_BYTES / 1024 / 1024} MB extraction limit.`,
      success: false,
    };
  }

  if (isPdf) {
    const result = await extractFromPdf(buf);
    return { ...result, mimeType: resolvedMime, success: Boolean(result.text) };
  }

  if (isDocx) {
    const result = await extractFromDocx(buf);
    return { ...result, mimeType: resolvedMime, pageCount: null, success: Boolean(result.text) };
  }

  return { text: '', mimeType: resolvedMime, pageCount: null, warning: 'Could not determine format.', success: false };
}

/**
 * Supported file formats for ATS extraction.
 */
export const SUPPORTED_FORMATS = Object.keys(SUPPORTED_MIME_TYPES);

export default {
  extractResumeText,
  SUPPORTED_FORMATS,
};
