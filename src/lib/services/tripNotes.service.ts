/**
 * Trip Notes Service
 * Business logic layer for trip notes operations
 * Handles data transformations between API DTOs and database entities
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type { TablesInsert } from '../../db/database.types';
import type {
  CreateTripNoteCommand,
  TripNoteEntity,
  TripNoteDTO,
} from '../../types';

/**
 * Transforms a CreateTripNoteCommand (camelCase) to database insert format (snake_case)
 */
function commandToInsert(
  command: CreateTripNoteCommand,
  userId: string
): TablesInsert<'trip_notes'> {
  return {
    user_id: userId,
    destination: command.destination,
    earliest_start_date: command.earliestStartDate,
    latest_start_date: command.latestStartDate,
    group_size: command.groupSize,
    approximate_trip_length: command.approximateTripLength,
    budget_amount: command.budgetAmount ?? null,
    currency: command.currency ?? null,
    details: command.details ?? null,
  };
}

/**
 * Transforms a TripNoteEntity (snake_case) to TripNoteDTO (camelCase)
 * Excludes user_id for security
 */
function entityToDTO(entity: TripNoteEntity): TripNoteDTO {
  return {
    id: entity.id,
    destination: entity.destination,
    earliestStartDate: entity.earliest_start_date,
    latestStartDate: entity.latest_start_date,
    groupSize: entity.group_size,
    approximateTripLength: entity.approximate_trip_length,
    budgetAmount: entity.budget_amount,
    currency: entity.currency,
    details: entity.details,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * Trip Notes Service
 * Provides methods for CRUD operations on trip notes
 */
export class TripNotesService {
  /**
   * Creates a new trip note
   * 
   * @param command - Validated CreateTripNoteCommand from request body
   * @param userId - Authenticated user ID from session
   * @param supabase - Supabase client instance
   * @returns Promise<TripNoteDTO> - The created trip note in DTO format
   * @throws Error if database operation fails
   */
  static async createTripNote(
    command: CreateTripNoteCommand,
    userId: string,
    supabase: SupabaseClient
  ): Promise<TripNoteDTO> {
    // Transform command to database insert format
    const insertData = commandToInsert(command, userId);

    // Insert into database with RETURNING clause
    const { data, error } = await supabase
      .from('trip_notes')
      .insert(insertData)
      .select()
      .single();

    // Handle database errors
    if (error) {
      console.error('Database error creating trip note:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from database after insert');
    }

    // Transform entity to DTO
    return entityToDTO(data);
  }
}

