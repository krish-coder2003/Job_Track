import { sanitizeMongoURI } from '../config/db.js';

/**
 * Centralized Express Error Handling Middleware
 * Guarantees uniform JSON structure and prevents credential exposure.
 */
export const errorHandler = (err, req, res, _next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let errors = err.errors || [];

  // 1. Mongoose Validation Error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    errors = Object.values(err.errors || {}).map((e) => ({
      field: e.path,
      message: e.message,
    }));
  }

  // 2. MongoDB Duplicate Key Error (Code 11000)
  else if (err.code === 11000) {
    statusCode = 409;
    const duplicatedField = Object.keys(err.keyPattern || err.keyValue || {})[0] || 'field';
    message = `An account with this ${duplicatedField} already exists.`;
    errors = [
      {
        field: duplicatedField,
        message: `${duplicatedField} is already registered.`,
      },
    ];
  }

  // 3. Mongoose Cast Error (invalid ObjectId or type conversion)
  else if (err.name === 'CastError') {
    statusCode = 400;
    message = `Invalid value for ${err.path}`;
    errors = [{ field: err.path, message: `Invalid format for ${err.path}` }];
  }

  // 4. Express JSON parse syntax error
  else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    message = 'Malformed JSON in request body';
    errors = [{ message: 'Please provide valid JSON payload' }];
  }

  // 5. Multer Upload Error (File size limit, field mismatch, etc.)
  else if (err.name === 'MulterError') {
    statusCode = 400;
    if (err.code === 'LIMIT_FILE_SIZE') {
      message = 'File size exceeds maximum allowed limit (5MB).';
    } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      message = `Unexpected upload field '${err.field || 'file'}'. Please upload file using field name 'resume'.`;
    } else {
      message = err.message || 'File upload error';
    }
    errors = [{ field: err.field || 'resume', message }];
  }

  // Sanitize message to guarantee no connection URIs or credentials are leaked
  message = sanitizeMongoURI(message);

  // Log 500 server errors
  if (statusCode >= 500) {
    console.error(`[Unhandled Error] ${req.method} ${req.originalUrl}:`, sanitizeMongoURI(err.stack || err.message));
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(errors.length > 0 && { errors }),
  });
};

/**
 * 404 Route Not Found Middleware
 */
export const notFoundHandler = (req, res, _next) => {
  res.status(404).json({
    success: false,
    message: `Cannot ${req.method} ${req.originalUrl} - Route Not Found`,
  });
};
