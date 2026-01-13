/**
 * Custom Error Classes
 * Provides structured error handling for the application
 * Each error type maps to a specific HTTP status code
 */

/**
 * Base class for application errors
 * Extends native Error with additional context
 */
export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ValidationError - 400 Bad Request
 * Thrown when request data fails validation
 */
export class ValidationError extends AppError {
  constructor(message = "Validation failed") {
    super(message);
  }
}

/**
 * UnauthorizedError - 401 Unauthorized
 * Thrown when user is not authenticated
 */
export class UnauthorizedError extends AppError {
  constructor(message = "Unauthorized") {
    super(message);
  }
}

/**
 * ForbiddenError - 403 Forbidden
 * Thrown when user is authenticated but lacks permission
 */
export class ForbiddenError extends AppError {
  constructor(message = "Forbidden") {
    super(message);
  }
}

/**
 * NotFoundError - 404 Not Found
 * Thrown when requested resource doesn't exist
 */
export class NotFoundError extends AppError {
  constructor(message = "Not found") {
    super(message);
  }
}

/**
 * ConflictError - 409 Conflict
 * Thrown when request conflicts with current state
 */
export class ConflictError extends AppError {
  constructor(message = "Conflict") {
    super(message);
  }
}

/**
 * InternalServerError - 500 Internal Server Error
 * Thrown for unexpected server errors
 */
export class InternalServerError extends AppError {
  constructor(message = "Internal server error") {
    super(message);
  }
}
