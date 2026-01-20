/**
 * API Route: /api/itineraries/{id}
 *
 * PUT: Updates the full text of an existing itinerary and flags it as manually edited
 *
 * Authentication: Requires valid Supabase session
 * Authorization: Only allows operations on itineraries owned by the authenticated user
 */

import type { APIRoute } from "astro";
import { UpdateItinerarySchema } from "../../../lib/schemas/updateItinerary.schema";
import { ItinerariesService } from "../../../lib/services/itineraries.service";
import { NotFoundError, ForbiddenError, InternalServerError } from "../../../lib/errors";
import { createErrorResponse, createJsonResponse } from "../../../lib/httpHelpers";

/**
 * PUT handler for updating an itinerary
 *
 * Updates the itinerary text and sets the manually_edited flag to true.
 * Performs ownership verification to ensure user can only update their own itineraries.
 *
 * Returns 200 with ItineraryDTO on success
 * Returns 400 if id parameter or request body is invalid
 * Returns 401 if user is not authenticated
 * Returns 403 if itinerary belongs to different user
 * Returns 404 if itinerary doesn't exist
 * Returns 500 on unexpected errors
 */
export const PUT: APIRoute = async ({ params, request, locals }) => {
  try {
    const { supabase, user } = locals;

    // Check for authentication
    if (!user) {
      return createErrorResponse(401, "Authentication required");
    }

    const userId = user.id;

    // Validate and parse id from path parameter
    const idParam = params.id;
    const id = Number(idParam);

    if (isNaN(id) || id <= 0) {
      return createErrorResponse(400, "Invalid id parameter");
    }

    // Parse and validate request body
    let body;
    try {
      body = await request.json();
    } catch {
      return createErrorResponse(400, "Invalid JSON in request body");
    }

    const validationResult = UpdateItinerarySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Invalid request payload", errors.fieldErrors);
    }

    const { itinerary } = validationResult.data;

    // Fetch itinerary to verify existence and ownership
    const { data: existingItinerary, error: fetchError } = await supabase
      .from("itineraries")
      .select("user_id")
      .eq("id", id)
      .single();

    // Handle not found case
    if (fetchError) {
      if (fetchError.code === "PGRST116") {
        return createErrorResponse(404, "Itinerary not found");
      }
      console.error("Database error fetching itinerary for ownership check:", fetchError);
      return createErrorResponse(500, "Failed to verify itinerary ownership");
    }

    if (!existingItinerary) {
      return createErrorResponse(404, "Itinerary not found");
    }

    // Verify ownership
    if (existingItinerary.user_id !== userId) {
      return createErrorResponse(403, "Forbidden");
    }

    // Update itinerary via service layer
    // Always set manuallyEdited to true since this endpoint implies manual editing
    const updatedItinerary = await ItinerariesService.update(id, itinerary, true, supabase);

    // Return updated itinerary DTO
    return createJsonResponse(updatedItinerary);
  } catch (error: any) {
    // Log error for debugging
    console.error("Error in PUT /api/itineraries/{id}:", error);

    // Map service errors to HTTP responses
    if (error instanceof ForbiddenError) {
      return createErrorResponse(403, error.message);
    }

    if (error instanceof NotFoundError) {
      return createErrorResponse(404, error.message);
    }

    if (error instanceof InternalServerError) {
      return createErrorResponse(500, "Failed to update itinerary");
    }

    // Return 500 for truly unexpected errors
    return createErrorResponse(500, "Internal server error");
  }
};

// Disable prerendering for API routes
export const prerender = false;
