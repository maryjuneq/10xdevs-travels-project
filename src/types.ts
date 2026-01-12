/**
 * Shared TypeScript types for backend and frontend
 * 
 * This file contains:
 * - Entity types (direct mappings to database tables)
 * - DTO types (Data Transfer Objects for API responses)
 * - Command Models (for API request payloads)
 * 
 * All types are derived from the database schema in ./db/database.types.ts
 */

import type { Tables, TablesInsert, Enums } from './db/database.types';

// ============================================================================
// Enums
// ============================================================================

/**
 * Status of an AI generation job
 * Directly mapped from database enum
 */
export type GenerationStatus = Enums<'generation_status'>;

/**
 * Category of a user preference
 * Directly mapped from database enum
 */
export type PreferenceCategory = Enums<'preference_category'>;

// ============================================================================
// Entity Types (Direct database table mappings)
// ============================================================================

/**
 * Trip Note entity - represents a row from the trip_notes table
 */
export type TripNoteEntity = Tables<'trip_notes'>;

/**
 * Itinerary entity - represents a row from the itineraries table
 */
export type ItineraryEntity = Tables<'itineraries'>;

/**
 * AI Generation Job entity - represents a row from the ai_generation_jobs table
 */
export type GenerationJobEntity = Tables<'ai_generation_jobs'>;

/**
 * User Preference entity - represents a row from the user_preferences table
 */
export type UserPreferenceEntity = Tables<'user_preferences'>;

// ============================================================================
// Trip Notes - DTOs and Commands
// ============================================================================

/**
 * DTO for Trip Note responses
 * Converts snake_case database fields to camelCase for API consistency
 * Excludes user_id for security (inferred from session)
 */
export type TripNoteDTO = {
  id: number;
  destination: string;
  earliestStartDate: string;
  latestStartDate: string;
  groupSize: number;
  approximateTripLength: number;
  budgetAmount: number | null;
  currency: string | null;
  details: string | null;
  createdAt: string;
  updatedAt: string;
};

/**
 * Lightweight DTO for Trip Note list items
 * Used in GET /api/trip-notes for paginated list view
 * Includes hasItinerary flag to indicate if an itinerary exists
 */
export type TripNoteListItemDTO = {
  id: number;
  destination: string;
  earliestStartDate: string;
  approximateTripLength: number;
  createdAt: string;
  updatedAt: string;
  hasItinerary: boolean;
};

/**
 * Command for creating a new trip note
 * Used in POST /api/trip-notes
 * Derived from TablesInsert but with camelCase field names
 */
export type CreateTripNoteCommand = {
  destination: string;
  earliestStartDate: string;
  latestStartDate: string;
  groupSize: number;
  approximateTripLength: number;
  budgetAmount?: number | null;
  currency?: string | null;
  details?: string | null;
};

/**
 * Command for updating an existing trip note
 * Used in PUT /api/trip-notes/{id}
 * All fields from CreateTripNoteCommand with same structure
 */
export type UpdateTripNoteCommand = CreateTripNoteCommand;

/**
 * Lightweight DTO for Itinerary in detail view
 * Used in GET /api/trip-notes/{id}
 * Excludes timestamps and redundant tripNoteId for efficiency
 */
export type LightItineraryDTO = Pick<ItineraryDTO, 'id' | 'suggestedTripLength' | 'itinerary'>;

/**
 * DTO for Trip Note with embedded itinerary
 * Used in GET /api/trip-notes/{id}
 * Combines TripNoteDTO with optional lightweight itinerary
 */
export type TripNoteWithItineraryDTO = TripNoteDTO & {
  itinerary: LightItineraryDTO | null;
};

// ============================================================================
// Itineraries - DTOs and Commands
// ============================================================================

/**
 * DTO for Itinerary responses
 * Converts snake_case database fields to camelCase
 * Excludes user_id for security
 */
export type ItineraryDTO = {
  id: number;
  tripNoteId: number;
  suggestedTripLength: number | null;
  itinerary: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Command for updating an itinerary
 * Used in PUT /api/trip-notes/{id}/itinerary
 * Allows manual editing of the itinerary text
 */
export type UpdateItineraryCommand = {
  itinerary: string;
};

// ============================================================================
// AI Generation Jobs - DTOs
// ============================================================================

/**
 * DTO for AI Generation Job responses
 * Used for admin analytics endpoint GET /api/jobs
 * Converts snake_case to camelCase, excludes user_id
 */
export type GenerationJobDTO = {
  id: number;
  tripNoteId: number;
  status: GenerationStatus;
  durationMs: number | null;
  errorText: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// User Preferences - DTOs and Commands
// ============================================================================

/**
 * DTO for User Preference responses
 * Converts snake_case to camelCase, excludes user_id
 */
export type UserPreferenceDTO = {
  id: number;
  category: PreferenceCategory;
  preferenceText: string;
  createdAt: string;
  updatedAt: string;
};

/**
 * Command for creating a new user preference
 * Used in POST /api/preferences
 */
export type CreateUserPreferenceCommand = {
  category?: PreferenceCategory;
  preferenceText: string;
};

/**
 * Command for updating an existing user preference
 * Used in PUT /api/preferences/{id}
 */
export type UpdateUserPreferenceCommand = CreateUserPreferenceCommand;

// ============================================================================
// Pagination and List Responses
// ============================================================================

/**
 * Generic paginated response wrapper
 * Used for all list endpoints that support pagination
 */
export type PaginatedResponse<T> = {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

/**
 * Query parameters for listing trip notes
 * Used in GET /api/trip-notes
 */
export type TripNotesListQuery = {
  page?: number;
  pageSize?: number;
  destination?: string;
  startFrom?: string;

  sort?: 'destination' | 'earliest_start_date' | 'created_at' | '-destination' | '-earliest_start_date' | '-created_at';
  hasItinerary?: boolean;
};

/**
 * Query parameters for listing generation jobs (admin)
 * Used in GET /api/jobs
 */
export type GenerationJobsListQuery = {
  page?: number;
  pageSize?: number;
  durationMs: number | null;
  status?: GenerationStatus;
  createdFrom?: string;
  createdTo?: string;
};

// ============================================================================
// Helper Types for Type Transformations
// ============================================================================

/**
 * Helper type to convert entity (snake_case) to DTO (camelCase)
 * This documents the transformation pattern used throughout the API
 */
export type EntityToDTO<T extends TripNoteEntity | ItineraryEntity | GenerationJobEntity | UserPreferenceEntity> = 
  T extends TripNoteEntity ? TripNoteDTO :
  T extends ItineraryEntity ? ItineraryDTO :
  T extends GenerationJobEntity ? GenerationJobDTO :
  T extends UserPreferenceEntity ? UserPreferenceDTO :
  never;

// ============================================================================
// Utility Functions Type Signatures
// ============================================================================

/**
 * Type for a function that converts a TripNoteEntity to TripNoteDTO
 * Useful for ensuring consistent transformation logic
 */
export type TripNoteEntityToDTO = (entity: TripNoteEntity) => TripNoteDTO;

/**
 * Type for a function that converts a CreateTripNoteCommand to TablesInsert<'trip_notes'>
 * Useful for ensuring consistent transformation logic
 */
export type TripNoteCommandToInsert = (command: CreateTripNoteCommand, userId: string) => TablesInsert<'trip_notes'>;

/**
 * Type for a function that converts an ItineraryEntity to ItineraryDTO
 */
export type ItineraryEntityToDTO = (entity: ItineraryEntity) => ItineraryDTO;

/**
 * Type for a function that converts a GenerationJobEntity to GenerationJobDTO
 */
export type GenerationJobEntityToDTO = (entity: GenerationJobEntity) => GenerationJobDTO;

/**
 * Type for a function that converts a UserPreferenceEntity to UserPreferenceDTO
 */
export type UserPreferenceEntityToDTO = (entity: UserPreferenceEntity) => UserPreferenceDTO;

/**
 * Type for a function that converts a CreateUserPreferenceCommand to TablesInsert<'user_preferences'>
 */
export type UserPreferenceCommandToInsert = (command: CreateUserPreferenceCommand, userId: string) => TablesInsert<'user_preferences'>;

