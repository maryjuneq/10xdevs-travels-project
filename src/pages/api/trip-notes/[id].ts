/**
 * API Route: /api/trip-notes/{id}
 *
 * GET: Fetches a single trip note with its itinerary (if exists) for the authenticated user
 * DELETE: Deletes a trip note (and cascades to related itineraries and jobs)
 *
 * Authentication: Requires valid Supabase session (temporary fallback to DEFAULT_USER_ID)
 * Authorization: Only allows operations on trip notes owned by the authenticated user
 */

import type { APIRoute } from "astro";
import { TripNoteIdParamSchema } from "../../../lib/schemas/tripNoteIdParam.schema";
import { TripNotesService } from "../../../lib/services/tripNotes.service";
import { DEFAULT_USER_ID } from "../../../db/supabase.client";
import { NotFoundError, ForbiddenError, InternalServerError } from "../../../lib/errors";
import { createErrorResponse, createJsonResponse, createNoContentResponse } from "../../../lib/httpHelpers";

/**
 * GET handler for fetching a single trip note with itinerary
 *
 * Returns 200 with TripNoteWithItineraryDTO on success
 * Returns 400 if id parameter is invalid
 * Returns 401 if user is not authenticated
 * Returns 404 if trip note doesn't exist or doesn't belong to user
 * Returns 500 on unexpected errors
 */
export const GET: APIRoute = async ({ params, locals }) => {
  try {
    const { supabase } = locals;

    // TODO: Once authentication is properly implemented, get session from locals
    // For now, using DEFAULT_USER_ID for development
    const userId = DEFAULT_USER_ID;

    // Check for authentication
    if (!userId) {
      return createErrorResponse(401, "Unauthorized");
    }

    // Validate path parameter with Zod
    const validationResult = TripNoteIdParamSchema.safeParse(params);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Invalid id parameter", errors.fieldErrors);
    }

    const { id } = validationResult.data;

    // Fetch trip note with itinerary via service layer
    const tripNote = await TripNotesService.getOneWithItinerary(userId, id, supabase);

    // Return 404 if trip note not found or doesn't belong to user
    if (!tripNote) {
      return createErrorResponse(404, "Trip note not found");
    }

    // Return trip note with itinerary
    return createJsonResponse(tripNote);
  } catch (error: any) {
    // Log error for debugging
    console.error("Error in GET /api/trip-notes/{id}:", error);

    // Return 500 for unexpected errors
    return createErrorResponse(500, "Internal server error");
  }
};

/**
 * DELETE handler for deleting a trip note
 *
 * Deletes the specified trip note and all related records via CASCADE:
 * - itineraries (1-to-1 relationship)
 * - ai_generation_jobs (1-to-N relationship)
 *
 * Returns 204 No Content on success
 * Returns 400 if id parameter is invalid
 * Returns 401 if user is not authenticated
 * Returns 403 if trip note belongs to different user
 * Returns 404 if trip note doesn't exist
 * Returns 500 on unexpected errors
 */
export const DELETE: APIRoute = async ({ params, locals }) => {
  try {
    const { supabase } = locals;

    // TODO: Once authentication is properly implemented, get session from locals
    // For now, using DEFAULT_USER_ID for development
    const userId = DEFAULT_USER_ID;

    // Check for authentication
    if (!userId) {
      return createErrorResponse(401, "Unauthorized");
    }

    // Validate path parameter with Zod
    const validationResult = TripNoteIdParamSchema.safeParse(params);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Invalid id parameter", errors.fieldErrors);
    }

    const { id } = validationResult.data;

    // Delete trip note via service layer
    // Service handles ownership verification and throws appropriate errors
    await TripNotesService.deleteTripNote(id, userId, supabase);

    // Return 204 No Content on successful deletion
    return createNoContentResponse();
  } catch (error: any) {
    // Log error for debugging
    console.error("Error in DELETE /api/trip-notes/{id}:", error);

    // Map service errors to HTTP responses
    if (error instanceof ForbiddenError) {
      return createErrorResponse(403, error.message);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(404, error.message);
    }

    if (error instanceof InternalServerError) {
      return createErrorResponse(500, error.message);
    }

    // Return 500 for truly unexpected errors
    return createErrorResponse(500, "Internal server error");
  }
};

// Disable prerendering for API routes
export const prerender = false;
