/**
 * OpenRouter Service Error Classes
 * Custom error hierarchy for OpenRouter API integration
 */

/**
 * Base error class for all OpenRouter service errors
 * Provides structured error information with code and metadata
 */
export class BaseError extends Error {
  public readonly code: string;
  public readonly meta?: Record<string, unknown>;

  constructor(message: string, code: string, meta?: Record<string, unknown>) {
    super(message);
    this.name = this.constructor.name;
    this.code = code;
    this.meta = meta;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * ConfigurationError - Invalid or missing configuration options
 * Thrown when constructor receives invalid parameters (e.g., missing apiKey)
 */
export class ConfigurationError extends BaseError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'CONFIGURATION_ERROR', meta);
  }
}

/**
 * RequestValidationError - Invalid request parameters
 * Thrown when user-provided parameters fail validation (e.g., empty messages array)
 */
export class RequestValidationError extends BaseError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'REQUEST_VALIDATION_ERROR', meta);
  }
}

/**
 * OpenRouterHttpError - HTTP-level errors from OpenRouter API
 * Thrown when API returns non-2xx status code
 */
export class OpenRouterHttpError extends BaseError {
  public readonly status: number;
  public readonly body?: string;

  constructor(message: string, status: number, body?: string, meta?: Record<string, unknown>) {
    super(message, 'OPENROUTER_HTTP_ERROR', { ...meta, status, body });
    this.status = status;
    this.body = body;
  }
}

/**
 * OpenRouterApiError - API-level errors from OpenRouter
 * Thrown when response payload contains an 'error' property
 */
export class OpenRouterApiError extends BaseError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'OPENROUTER_API_ERROR', meta);
  }
}

/**
 * StreamingError - Errors during streaming response handling
 * Thrown when event stream is aborted or ill-formed
 */
export class StreamingError extends BaseError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'STREAMING_ERROR', meta);
  }
}

/**
 * JsonValidationError - Structured output validation failure
 * Thrown when responseSchema Zod validation fails
 */
export class JsonValidationError extends BaseError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'JSON_VALIDATION_ERROR', meta);
  }
}

/**
 * TimeoutError - Request timeout
 * Thrown when request exceeds the specified timeout duration
 */
export class TimeoutError extends BaseError {
  constructor(message: string, meta?: Record<string, unknown>) {
    super(message, 'TIMEOUT_ERROR', meta);
  }
}
