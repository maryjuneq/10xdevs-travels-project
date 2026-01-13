/**
 * HTTP Helper Functions
 * Utilities for creating consistent API responses
 */

/**
 * Creates a standardized error response
 *
 * @param status - HTTP status code
 * @param message - Error message to return to client
 * @param details - Optional additional error details
 * @returns Response object with JSON error body
 */
export function createErrorResponse(status: number, message: string, details?: Record<string, any>): Response {
  const body: { message: string; details?: Record<string, any> } = { message };

  if (details) {
    body.details = details;
  }

  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates a standardized success response with JSON body
 *
 * @param data - Data to return in response body
 * @param status - HTTP status code (default: 200)
 * @returns Response object with JSON body
 */
export function createJsonResponse<T>(data: T, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Creates a 204 No Content response
 * Used for successful DELETE operations
 *
 * @returns Response object with no body
 */
export function createNoContentResponse(): Response {
  return new Response(null, { status: 204 });
}
