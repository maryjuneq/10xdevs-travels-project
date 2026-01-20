/**
 * POST /api/trip-notes/generateItenerary
 * Generates a travel itinerary for an existing trip note
 *
 * Authentication: Requires valid Supabase session
 * Request Body: GenerateItineraryInput (CreateTripNoteCommand + id)
 * Response: 201 Created with TripNoteWithItineraryDTO
 *
 * Flow:
 * 1. Validate request body (Zod schema)
 * 2. Load trip note and verify ownership
 * 3. Update trip note if fields have changed
 * 4. Fetch user preferences
 * 5. Generate itinerary via AI service
 * 6. Persist itinerary and log success
 * 7. Return updated trip note with generated itinerary
 */

import type { APIRoute } from "astro";
import { GenerateItinerarySchema } from "../../../lib/schemas/generateItinerary.schema";
import { TripNotesService } from "../../../lib/services/tripNotes.service";
import { PreferencesService } from "../../../lib/services/preferences.service";
import { AIService } from "../../../lib/services/ai.service";
import { ItinerariesService } from "../../../lib/services/itineraries.service";
import { JobsService } from "../../../lib/services/jobs.service";
import { NotFoundError, ValidationError } from "../../../lib/errors";
import { createErrorResponse, createJsonResponse } from "../../../lib/httpHelpers";

/**
 * POST handler for generating itineraries
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let tripNoteId: number | undefined;
  const startTime = performance.now();

  try {
    const { supabase, user } = locals;

    // Authentication check
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
    const validationResult = GenerateItinerarySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return createErrorResponse(400, "Validation failed", errors.fieldErrors);
    }

    const { id, ...tripNoteFields } = validationResult.data;
    tripNoteId = id;

    // Load trip note and verify ownership
    const tripNote = await TripNotesService.findById(id, supabase);

    try {
      TripNotesService.assertBelongsToUser(tripNote, userId);
    } catch (error: any) {
      if (error instanceof NotFoundError) {
        return createErrorResponse(404, "Trip note not found or access denied");
      }
      throw error;
    }

    // Update trip note if any fields have changed
    let updatedTripNote;
    try {
      updatedTripNote = await TripNotesService.updateIfChanged(id, tripNoteFields, userId, supabase);
    } catch (error: any) {
      if (error instanceof ValidationError) {
        return createErrorResponse(400, "Validation failed", {
          destination: [error.message],
        });
      }
      throw error;
    }

    // Fetch user preferences for AI prompt enrichment
    let preferences;
    try {
      preferences = await PreferencesService.listByUser(userId, supabase);
    } catch (error) {
      console.error("Error fetching user preferences:", error);
      // Log failed job - preferences fetch error
      const durationMs = Math.round(performance.now() - startTime);
      await JobsService.logFailed(
        tripNoteId,
        `Failed to fetch user preferences: ${error}`,
        userId,
        supabase,
        durationMs
      );

      return createErrorResponse(500, "Failed to fetch user preferences");
    }

    // Generate itinerary via AI service
    let aiResult;
    try {
      const tripNoteDTO = TripNotesService.toPromptDTO(updatedTripNote);
      aiResult = await AIService.generateItinerary(tripNoteDTO, preferences);
    } catch (error: any) {
      console.error("AI generation error:", error);
      // Log failed job - AI generation error
      const durationMs = Math.round(performance.now() - startTime);
      await JobsService.logFailed(
        tripNoteId,
        `AI generation failed: ${error.message || error}`,
        userId,
        supabase,
        durationMs
      );

      return createErrorResponse(500, "Failed to generate itinerary");
    }

    // Persist itinerary to database (create or regenerate)
    let itinerary;
    try {
      const existing = await ItinerariesService.findByTripNoteId(tripNoteId, supabase);

      if (existing) {
        // Regenerate scenario – overwrite text and set manuallyEdited = false
        itinerary = await ItinerariesService.update(
          existing.id,
          aiResult.itinerary,
          false,
          supabase,
          aiResult.suggestedTripLength,
          aiResult.suggestedBudget
        );
      } else {
        // First-time generation
        itinerary = await ItinerariesService.create(
          tripNoteId,
          aiResult.itinerary,
          userId,
          supabase,
          aiResult.suggestedTripLength,
          aiResult.suggestedBudget
        );
      }
    } catch (error: any) {
      console.error("Error persisting itinerary:", error);
      // Log failed job - database insert error
      await JobsService.logFailed(
        tripNoteId,
        `Failed to persist itinerary: ${error.message || error}`,
        userId,
        supabase,
        aiResult.durationMs
      );

      return createErrorResponse(500, "Failed to save itinerary");
    }

    // Log successful job
    try {
      await JobsService.logSucceeded(tripNoteId, aiResult.durationMs, userId, supabase);
    } catch (error) {
      // Job logging failure shouldn't fail the request
      // The itinerary was created successfully
      console.error("Warning: Failed to log successful job:", error);
    }

    // Transform full itinerary to light DTO for consistent response format
    const lightItineraryDTO = {
      id: itinerary.id,
      suggestedTripLength: itinerary.suggestedTripLength,
      suggestedBudget: itinerary.suggestedBudget,
      itinerary: itinerary.itinerary,
    };

    // Combine updated trip note with generated itinerary
    const tripNoteDTO = TripNotesService.toPromptDTO(updatedTripNote);
    const response = {
      ...tripNoteDTO,
      itinerary: lightItineraryDTO,
    };

    // Return combined trip note with itinerary
    return createJsonResponse(response, 201);
  } catch (error: any) {
    // Catch-all error handler for unexpected errors
    console.error("Unexpected error in POST /api/trip-notes/generateItenerary:", error);

    // Try to log failed job if we have tripNoteId
    if (tripNoteId) {
      try {
        const { supabase, user } = locals;
        const userId = user?.id;
        const durationMs = Math.round(performance.now() - startTime);

        if (!userId) {
          console.error("Cannot log failed job - user not authenticated");
          return createErrorResponse(500, "AI generation failed");
        }

        await JobsService.logFailed(
          tripNoteId,
          `Unexpected error: ${error.message || error}`,
          userId,
          supabase,
          durationMs
        );
      } catch (logError) {
        console.error("Failed to log error to jobs table:", logError);
      }
    }

    return createErrorResponse(500, "An unexpected error occurred", {
      message: error.message || "Unknown error",
    });
  }
};

// Disable prerendering for API routes
export const prerender = false;
