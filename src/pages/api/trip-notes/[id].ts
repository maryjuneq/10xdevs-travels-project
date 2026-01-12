/**
 * API Route: /api/trip-notes/{id}
 * 
 * GET: Fetches a single trip note with its itinerary (if exists) for the authenticated user
 * 
 * Authentication: Requires valid Supabase session (temporary fallback to DEFAULT_USER_ID)
 * Authorization: Only returns trip notes owned by the authenticated user
 */

import type { APIRoute } from 'astro';
import { TripNoteIdParamSchema } from '../../../lib/schemas/tripNoteIdParam.schema';
import { TripNotesService } from '../../../lib/services/tripNotes.service';
import { DEFAULT_USER_ID } from '../../../db/supabase.client';

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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        {
          status: 401,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate path parameter with Zod
    const validationResult = TripNoteIdParamSchema.safeParse(params);

    if (!validationResult.success) {
      const errors = validationResult.error.flatten();
      return new Response(
        JSON.stringify({
          error: 'Invalid id',
          details: errors.fieldErrors,
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    const { id } = validationResult.data;

    // Fetch trip note with itinerary via service layer
    const tripNote = await TripNotesService.getOneWithItinerary(
      userId,
      id,
      supabase
    );

    // Return 404 if trip note not found or doesn't belong to user
    if (!tripNote) {
      return new Response(
        JSON.stringify({ error: 'Not found' }),
        {
          status: 404,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Return trip note with itinerary
    return new Response(
      JSON.stringify(tripNote),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    // Log error for debugging
    console.error('Error in GET /api/trip-notes/{id}:', error);

    // Return 500 for unexpected errors
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Disable prerendering for API routes
export const prerender = false;

