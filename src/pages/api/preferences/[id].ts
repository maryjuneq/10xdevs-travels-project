/**
 * API Route: /api/preferences/{id}
 *
 * PUT: Updates an existing user preference for the authenticated user
 *
 * Authentication: Requires valid Supabase session
 * Authorization: Only allows updates on preferences owned by the authenticated user
 */

import type { APIRoute } from "astro";
import { UpdatePreferenceSchema } from "../../../lib/schemas/preference.schema";
import { PreferencesService } from "../../../lib/services/preferences.service";
import { createErrorResponse, createJsonResponse, createNoContentResponse } from "../../../lib/httpHelpers";

/**
 * PUT handler for updating user preferences
 *
 * Returns 200 with UserPreferenceDTO on success
 * Returns 400 if id parameter is invalid or validation fails
 * Returns 401 if user is not authenticated
 * Returns 404 if preference doesn't exist or doesn't belong to user
 * Returns 500 on unexpected errors
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

    // Parse and validate id parameter
    const idParam = params.id;
    if (!idParam) {
      return createErrorResponse(400, "Missing preference id");
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id) || id <= 0) {
      return createErrorResponse(400, "Invalid preference id");
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(400, "Malformed JSON");
    }

    // Validate request body with Zod
    const validationResult = UpdatePreferenceSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Validation failed", errors.fieldErrors);
    }

    // Build update command
    const command = {
      id,
      userId,
      changes: validationResult.data,
    };

    // Update preference via service layer
    const updatedPreference = await PreferencesService.update(command, supabase);

    // Return 404 if preference not found or not owned by user
    if (!updatedPreference) {
      return createErrorResponse(404, "Preference not found");
    }

    // Return updated preference
    return createJsonResponse(updatedPreference);
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in PUT /api/preferences/[id]:", error);

    // Return generic server error
    return createErrorResponse(500, "An error occurred while processing the request");
  }
};

/**
 * DELETE handler for removing user preferences
 *
 * Returns 204 No Content on success
 * Returns 400 if id parameter is invalid
 * Returns 401 if user is not authenticated
 * Returns 404 if preference doesn't exist or doesn't belong to user
 * Returns 500 on unexpected errors
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

    // Parse and validate id parameter
    const idParam = params.id;
    if (!idParam) {
      return createErrorResponse(400, "Missing preference id");
    }

    const id = parseInt(idParam, 10);
    if (isNaN(id) || id <= 0) {
      return createErrorResponse(400, "Invalid preference id");
    }

    // Delete preference via service layer
    const deleted = await PreferencesService.remove({ id, userId }, supabase);

    // Return 404 if preference not found or not owned by user
    if (!deleted) {
      return createErrorResponse(404, "Preference not found");
    }

    // Log successful deletion
    console.info(`User preference ${id} deleted successfully by user ${userId}`);

    // Return 204 No Content on successful deletion
    return createNoContentResponse();
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in DELETE /api/preferences/[id]:", error);

    // Return generic server error
    return createErrorResponse(500, "An error occurred while processing the request");
  }
};

// Disable prerendering for API routes
export const prerender = false;
