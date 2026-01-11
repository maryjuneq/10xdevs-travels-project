/**
 * POST /api/trip-notes
 * Creates a new trip note for the authenticated user
 * 
 * Authentication: Requires valid Supabase session
 * Request Body: CreateTripNoteCommand (JSON)
 * Response: 201 Created with TripNoteDTO
 */

import type { APIRoute } from 'astro';
import { CreateTripNoteSchema } from '../../lib/schemas/tripNote.schema';
import { TripNotesService } from '../../lib/services/tripNotes.service';
import { DEFAULT_USER_ID } from '../../db/supabase.client';

/**
 * Maps Supabase/Postgres error codes to HTTP status codes and messages
 */
function mapDatabaseError(error: any): { status: number; message: string } {
  // Unique constraint violation (user_id, destination, earliest_start_date)
  if (error.code === '23505') {
    return {
      status: 409,
      message: 'A trip note with this destination and start date already exists',
    };
  }

  // Default to internal server error
  return {
    status: 500,
    message: 'An error occurred while creating the trip note',
  };
}

/**
 * POST handler for creating trip notes
 */
export const POST: APIRoute = async ({ request, locals }) => {
  try {
    const { supabase } = locals;

    // TODO: Once authentication is properly implemented, get session from locals
    // For now, using DEFAULT_USER_ID for development
    const userId = DEFAULT_USER_ID;

    // Temporary check - remove when auth is implemented
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
    const validationResult = CreateTripNoteSchema.safeParse(body);

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

    // Create trip note via service layer
    const tripNote = await TripNotesService.createTripNote(
      validationResult.data,
      userId,
      supabase
    );

    // Return created trip note
    return new Response(
      JSON.stringify(tripNote),
      {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      }
    );

  } catch (error: any) {
    // Log error for debugging
    console.error('Error in POST /api/trip-notes:', error);

    // Map database errors to appropriate HTTP responses
    const { status, message } = mapDatabaseError(error);

    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Disable prerendering for API routes
export const prerender = false;

