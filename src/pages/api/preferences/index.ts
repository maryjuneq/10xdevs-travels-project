/**
 * API Route: /api/preferences
 *
 * GET: Lists all preferences for the authenticated user
 * POST: Creates a new user preference for the authenticated user
 *
 * Authentication: Requires valid Supabase session
 */

import type { APIRoute } from "astro";
import { CreatePreferenceSchema } from "../../../lib/schemas/preference.schema";
import { PreferencesService } from "../../../lib/services/preferences.service";
import { createErrorResponse, createJsonResponse } from "../../../lib/httpHelpers";

/**
 * Maps Supabase/Postgres error codes to HTTP status codes and messages
 * @param error - The error object from Supabase/Postgres
 */
function mapDatabaseError(error: unknown): { status: number; message: string } {
  // Check for constraint violations or other specific database errors
  if (error && typeof error === "object" && "code" in error) {
    // Handle specific constraint violations if needed
    // For now, default to internal server error
  }

  // Default to internal server error
  return {
    status: 500,
    message: "An error occurred while processing the request",
  };
}

/**
 * GET handler for listing user preferences
 */
export const GET: APIRoute = async ({ locals }) => {
  try {
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

    // Fetch preferences via service layer
    const preferences = await PreferencesService.listByUser(userId, supabase);

    // Return preferences array
    return createJsonResponse(preferences);
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in GET /api/preferences:", error);

    // Map database errors to appropriate HTTP responses
    const { status, message } = mapDatabaseError(error);
    return createErrorResponse(status, message);
  }
};

/**
 * POST handler for creating user preferences
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(400, "Malformed JSON");
    }

    // Validate request body with Zod
    const validationResult = CreatePreferenceSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Validation failed", errors.fieldErrors);
    }

    // Create preference via service layer
    const preference = await PreferencesService.create(validationResult.data, userId, supabase);

    // Return created preference with 201 status
    return createJsonResponse(preference, 201);
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in POST /api/preferences:", error);

    // Map database errors to appropriate HTTP responses
    const { status, message } = mapDatabaseError(error);
    return createErrorResponse(status, message);
  }
};

// Disable prerendering for API routes
export const prerender = false;
