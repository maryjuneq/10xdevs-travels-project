/**
 * POST /api/trip-notes/generateItenerary
 * Generates a travel itinerary for an existing trip note
 * 
 * Authentication: Requires valid Supabase session (using DEFAULT_USER_ID for dev)
 * Request Body: GenerateItineraryInput (CreateTripNoteCommand + id)
 * Response: 201 Created with ItineraryDTO
 * 
 * Flow:
 * 1. Validate request body (Zod schema)
 * 2. Load trip note and verify ownership
 * 3. Update trip note if fields have changed
 * 4. Fetch user preferences
 * 5. Generate itinerary via AI service
 * 6. Persist itinerary and log success
 * 7. Return created itinerary
 */

import type { APIRoute } from 'astro';
import { GenerateItinerarySchema } from '../../../lib/schemas/generateItinerary.schema';
import { TripNotesService } from '../../../lib/services/tripNotes.service';
import { PreferencesService } from '../../../lib/services/preferences.service';
import { AIService } from '../../../lib/services/ai.service';
import { ItinerariesService } from '../../../lib/services/itineraries.service';
import { JobsService } from '../../../lib/services/jobs.service';
import { DEFAULT_USER_ID } from '../../../db/supabase.client';

/**
 * POST handler for generating itineraries
 */
export const POST: APIRoute = async ({ request, locals }) => {
  let tripNoteId: number | undefined;
  const startTime = performance.now();

  try {
    const { supabase } = locals;

    // TODO: Once authentication is properly implemented, get session from locals
    // For now, using DEFAULT_USER_ID for development
    const userId = DEFAULT_USER_ID;

    // Authentication check
    if (!userId) {
      return new Response(
        JSON.stringify({ error: 'unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Parse request body
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return new Response(
        JSON.stringify({ error: 'Invalid JSON in request body' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate request body with Zod
    const validationResult = GenerateItinerarySchema.safeParse(body);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return new Response(
        JSON.stringify({
          error: 'Validation failed',
          details: errors.fieldErrors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { id, ...tripNoteFields } = validationResult.data;
    tripNoteId = id;

    // Load trip note and verify ownership
    const tripNote = await TripNotesService.findById(id, supabase);

    try {
      TripNotesService.assertBelongsToUser(tripNote, userId);
    } catch (error: any) {
      if (error.message === 'not_found') {
        return new Response(
          JSON.stringify({ error: 'Trip note not found or access denied' }),
          {
            status: 404,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw error;
    }

    // Update trip note if any fields have changed
    let updatedTripNote;
    try {
      updatedTripNote = await TripNotesService.updateIfChanged(
        id,
        tripNoteFields,
        userId,
        supabase
      );
    } catch (error: any) {
      if (error.message === 'destination_immutable') {
        return new Response(
          JSON.stringify({ 
            error: 'Validation failed',
            details: {
              destination: ['Destination cannot be changed for existing trip notes']
            }
          }),
          {
            status: 400,
            headers: { 'Content-Type': 'application/json' },
          }
        );
      }
      throw error;
    }

    // Fetch user preferences for AI prompt enrichment
    let preferences;
    try {
      preferences = await PreferencesService.listByUser(userId, supabase);
    } catch (error) {
      console.error('Error fetching user preferences:', error);
      // Log failed job - preferences fetch error
      const durationMs = Math.round(performance.now() - startTime);
      await JobsService.logFailed(
        tripNoteId,
        `Failed to fetch user preferences: ${error}`,
        userId,
        supabase,
        durationMs
      );

      return new Response(
        JSON.stringify({ error: 'Failed to fetch user preferences' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Generate itinerary via AI service
    let aiResult;
    try {
      const tripNoteDTO = TripNotesService.toPromptDTO(updatedTripNote);
      aiResult = await AIService.generateItinerary(tripNoteDTO, preferences);
    } catch (error: any) {
      console.error('AI generation error:', error);
      // Log failed job - AI generation error
      const durationMs = Math.round(performance.now() - startTime);
      await JobsService.logFailed(
        tripNoteId,
        `AI generation failed: ${error.message || error}`,
        userId,
        supabase,
        durationMs
      );

      return new Response(
        JSON.stringify({ error: 'Failed to generate itinerary' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Persist itinerary to database
    let itinerary;
    try {
      itinerary = await ItinerariesService.create(
        tripNoteId,
        aiResult.itinerary,
        userId,
        supabase,
        aiResult.suggestedTripLength
      );
    } catch (error: any) {
      console.error('Error persisting itinerary:', error);
      // Log failed job - database insert error
      await JobsService.logFailed(
        tripNoteId,
        `Failed to persist itinerary: ${error.message || error}`,
        userId,
        supabase,
        aiResult.durationMs
      );

      return new Response(
        JSON.stringify({ error: 'Failed to save itinerary' }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Log successful job
    try {
      await JobsService.logSucceeded(
        tripNoteId,
        aiResult.durationMs,
        userId,
        supabase
      );
    } catch (error) {
      // Job logging failure shouldn't fail the request
      // The itinerary was created successfully
      console.error('Warning: Failed to log successful job:', error);
    }

    // Return created itinerary
    return new Response(
      JSON.stringify(itinerary),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    // Catch-all error handler for unexpected errors
    console.error('Unexpected error in POST /api/trip-notes/generateItenerary:', error);

    // Try to log failed job if we have tripNoteId
    if (tripNoteId) {
      try {
        const { supabase } = locals;
        const userId = DEFAULT_USER_ID;
        const durationMs = Math.round(performance.now() - startTime);
        await JobsService.logFailed(
          tripNoteId,
          `Unexpected error: ${error.message || error}`,
          userId,
          supabase,
          durationMs
        );
      } catch (logError) {
        console.error('Failed to log error to jobs table:', logError);
      }
    }

    return new Response(
      JSON.stringify({ 
        error: 'An unexpected error occurred',
        message: error.message || 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Disable prerendering for API routes
export const prerender = false;

