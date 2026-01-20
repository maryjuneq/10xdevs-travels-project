/**
 * API Route: /api/trip-notes/{id}
 *
 * GET: Fetches a single trip note with its itinerary (if exists) for the authenticated user
 * PUT: Updates an existing trip note with full replacement semantics
 * DELETE: Deletes a trip note (and cascades to related itineraries and jobs)
 *
 * Authentication: Requires valid Supabase session
 * Authorization: Only allows operations on trip notes owned by the authenticated user
 */

import type { APIRoute } from "astro";
import { TripNoteIdParamSchema } from "../../../lib/schemas/tripNoteIdParam.schema";
import { UpdateTripNoteSchema } from "../../../lib/schemas/tripNote.schema";
import { TripNotesService } from "../../../lib/services/tripNotes.service";
import {
  NotFoundError,
  ForbiddenError,
  InternalServerError,
  ConflictError,
  ValidationError,
} from "../../../lib/errors";
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
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

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
 * PUT handler for updating a trip note
 *
 * Updates an existing trip note with full replacement semantics (PUT).
 * Note: Destination cannot be updated - it's an immutable field.
 * Returns the updated trip note with its current itinerary.
 *
 * Returns 200 with TripNoteWithItineraryDTO on success
 * Returns 400 if id parameter or request body is invalid
 * Returns 401 if user is not authenticated
 * Returns 403 if trip note belongs to different user
 * Returns 404 if trip note doesn't exist
 * Returns 409 if unique constraint violation (duplicate destination + date)
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

    // Validate path parameter with Zod
    const paramValidation = TripNoteIdParamSchema.safeParse(params);

    if (!paramValidation.success) {
      const errors = paramValidation.error.flatten();
      return createErrorResponse(400, "Invalid id parameter", errors.fieldErrors);
    }

    const { id } = paramValidation.data;

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(400, "Invalid JSON in request body");
    }

    // Validate request body with Zod
    const bodyValidation = UpdateTripNoteSchema.safeParse(body);

    if (!bodyValidation.success) {
      const errors = bodyValidation.error.flatten();
      return createErrorResponse(400, "Validation failed", errors.fieldErrors);
    }

    const command = bodyValidation.data;

    // Update trip note via service layer
    // Service handles ownership verification and throws appropriate errors
    const updatedTripNote = await TripNotesService.updateTripNote(id, command, userId, supabase);

    // Return updated trip note with itinerary
    return createJsonResponse(updatedTripNote);
  } catch (error: any) {
    // Log error for debugging
    console.error("Error in PUT /api/trip-notes/{id}:", error);

    // Map service errors to HTTP responses
    if (error instanceof ValidationError) {
      return createErrorResponse(400, error.message);
    }

    if (error instanceof ForbiddenError) {
      return createErrorResponse(403, error.message);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(404, error.message);
    }

    if (error instanceof ConflictError) {
      return createErrorResponse(409, error.message);
    }

    if (error instanceof InternalServerError) {
      return createErrorResponse(500, error.message);
    }

    // Return 500 for truly unexpected errors
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
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

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
