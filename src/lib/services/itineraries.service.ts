/**
 * Itineraries Service
 * Business logic layer for itinerary operations
 * Handles creation and transformation of AI-generated itineraries
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { TablesInsert } from "../../db/database.types";
import type { ItineraryEntity, ItineraryDTO } from "../../types";
import { InternalServerError } from "../errors";

/**
 * Transforms an ItineraryEntity (snake_case) to ItineraryDTO (camelCase)
 * Excludes user_id for security
 */
function entityToDTO(entity: ItineraryEntity): ItineraryDTO {
  return {
    id: entity.id,
    tripNoteId: entity.trip_note_id,
    suggestedTripLength: entity.suggested_trip_length,
    itinerary: entity.itinerary,
    manuallyEdited: entity.manually_edited,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * Itineraries Service
 * Provides methods for CRUD operations on itineraries
 */
export class ItinerariesService {
  /**
   * Creates a new itinerary for a trip note
   *
   * @param tripNoteId - ID of the associated trip note
   * @param itinerary - The generated itinerary text (markdown format)
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @param suggestedTripLength - Optional suggested trip length from AI
   * @returns Promise<ItineraryDTO> - The created itinerary in DTO format
   * @throws InternalServerError if database operation fails
   */
  static async create(
    tripNoteId: number,
    itinerary: string,
    userId: string,
    supabase: SupabaseClient,
    suggestedTripLength?: number | null
  ): Promise<ItineraryDTO> {
    // Prepare insert data
    const insertData: TablesInsert<"itineraries"> = {
      trip_note_id: tripNoteId,
      itinerary,
      user_id: userId,
      suggested_trip_length: suggestedTripLength ?? null,
    };

    // Insert into database with RETURNING clause
    const { data, error } = await supabase.from("itineraries").insert(insertData).select().single();

    // Handle database errors
    if (error) {
      console.error("Database error creating itinerary:", error);
      throw new InternalServerError("Failed to create itinerary");
    }

    if (!data) {
      throw new InternalServerError("No data returned from database after insert");
    }

    // Transform entity to DTO
    return entityToDTO(data);
  }

  /**
   * Finds an itinerary by trip note ID
   *
   * @param tripNoteId - Trip note ID
   * @param supabase - Supabase client instance
   * @returns Promise<ItineraryEntity | null> - The itinerary entity or null if not found
   * @throws InternalServerError if database operation fails
   */
  static async findByTripNoteId(tripNoteId: number, supabase: SupabaseClient): Promise<ItineraryEntity | null> {
    const { data, error } = await supabase.from("itineraries").select("*").eq("trip_note_id", tripNoteId).single();

    if (error) {
      // Handle "not found" gracefully
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Database error finding itinerary:", error);
      throw new InternalServerError("Failed to find itinerary");
    }

    return data;
  }

  /**
   * Updates an existing itinerary
   *
   * @param id - Itinerary ID
   * @param itinerary - Updated itinerary text
   * @param supabase - Supabase client instance
   * @returns Promise<ItineraryDTO> - The updated itinerary in DTO format
   * @throws InternalServerError if database operation fails
   */
  static async update(id: number, itinerary: string, manuallyEdited: boolean, supabase: SupabaseClient): Promise<ItineraryDTO> {
    const { data, error } = await supabase.from("itineraries").update({ itinerary, manually_edited: manuallyEdited }).eq("id", id).select().single();

    if (error) {
      console.error("Database error updating itinerary:", error);
      throw new InternalServerError("Failed to update itinerary");
    }

    if (!data) {
      throw new InternalServerError("No data returned from database after update");
    }

    return entityToDTO(data);
  }
}
