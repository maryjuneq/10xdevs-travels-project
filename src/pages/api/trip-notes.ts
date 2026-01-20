/**
 * API Route: /api/trip-notes
 *
 * GET: Lists all trip notes for the authenticated user with pagination and filtering
 * POST: Creates a new trip note for the authenticated user
 *
 * Authentication: Requires valid Supabase session
 */

import type { APIRoute } from "astro";
import { CreateTripNoteSchema } from "../../lib/schemas/tripNote.schema";
import { TripNotesListQuerySchema } from "../../lib/schemas/tripNotesListQuery.schema";
import { TripNotesService } from "../../lib/services/tripNotes.service";
import { createErrorResponse, createJsonResponse } from "../../lib/httpHelpers";

/**
 * Maps Supabase/Postgres error codes to HTTP status codes and messages
 * @param error - The error object from Supabase/Postgres
 * @param context - Context string ('creating' or 'fetching') for error messages
 */
function mapDatabaseError(
  error: unknown,
  context: "creating" | "fetching" = "creating"
): { status: number; message: string } {
  // Unique constraint violation (user_id, destination, earliest_start_date)
  if (error && typeof error === "object" && "code" in error && error.code === "23505") {
    return {
      status: 409,
      message: "A trip note with this destination and start date already exists",
    };
  }

  // Default to internal server error
  return {
    status: 500,
    message: `An error occurred while ${context} trip notes`,
  };
}

/**
 * GET handler for listing trip notes
 */
export const GET: APIRoute = async ({ url, locals }) => {
  try {
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Unauthorized");
    }

    const userId = user.id;

    // Extract query parameters from URL
    const searchParams = url.searchParams;
    const queryObject = {
      page: searchParams.get("page") || undefined,
      pageSize: searchParams.get("pageSize") || undefined,
      destination: searchParams.get("destination") || undefined,
      startFrom: searchParams.get("startFrom") || undefined,
      sort: searchParams.get("sort") || undefined,
      hasItinerary: searchParams.get("hasItinerary") || undefined,
    };

    // Validate query parameters with Zod
    const validationResult = TripNotesListQuerySchema.safeParse(queryObject);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Validation failed", errors.fieldErrors);
    }

    // Fetch trip notes via service layer
    const result = await TripNotesService.listTripNotes(validationResult.data, userId, supabase);

    // Return paginated result
    return createJsonResponse(result);
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in GET /api/trip-notes:", error);

    // Map database errors to appropriate HTTP responses
    const { status, message } = mapDatabaseError(error, "fetching");
    return createErrorResponse(status, message);
  }
};

/**
 * POST handler for creating trip notes
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
      return createErrorResponse(400, "Invalid JSON in request body");
    }

    // Validate request body with Zod
    const validationResult = CreateTripNoteSchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Validation failed", errors.fieldErrors);
    }

    // Create trip note via service layer
    const tripNote = await TripNotesService.createTripNote(validationResult.data, userId, supabase);

    // Return created trip note
    return createJsonResponse(tripNote, 201);
  } catch (error: unknown) {
    // Log error for debugging
    console.error("Error in POST /api/trip-notes:", error);

    // Map database errors to appropriate HTTP responses
    const { status, message } = mapDatabaseError(error, "creating");
    return createErrorResponse(status, message);
  }
};

// Disable prerendering for API routes
export const prerender = false;
