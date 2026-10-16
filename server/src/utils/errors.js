/**
 * Custom API Error classes for standardized error handling
 */
export class ApiError extends Error {
  constructor(statusCode, message, errors = []) {
    super(message);
    this.statusCode = statusCode;
    this.errors = errors;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

export class BadRequestError extends ApiError {
  constructor(message = 'Bad Request', errors = []) {
    super(400, message, errors);
  }
}

export class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized', errors = []) {
    super(401, message, errors);
  }
}

export class ForbiddenError extends ApiError {
  constructor(message = 'Forbidden', errors = []) {
    super(403, message, errors);
  }
}

export class NotFoundError extends ApiError {
  constructor(message = 'Resource Not Found', errors = []) {
    super(404, message, errors);
  }
}

export class ConflictError extends ApiError {
  constructor(message = 'Conflict: Resource already exists', errors = []) {
    super(409, message, errors);
  }
}
