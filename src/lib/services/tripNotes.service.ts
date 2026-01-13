/**
 * Trip Notes Service
 * Business logic layer for trip notes operations
 * Handles data transformations between API DTOs and database entities
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type { TablesInsert } from "../../db/database.types";
import type {
  CreateTripNoteCommand,
  TripNoteEntity,
  TripNoteDTO,
  TripNotesListQuery,
  TripNoteListItemDTO,
  PaginatedResponse,
  TripNoteWithItineraryDTO,
  LightItineraryDTO,
} from "../../types";
import { NotFoundError, ForbiddenError, ValidationError, InternalServerError } from "../errors";

/**
 * Transforms a CreateTripNoteCommand (camelCase) to database insert format (snake_case)
 */
function commandToInsert(command: CreateTripNoteCommand, userId: string): TablesInsert<"trip_notes"> {
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
 * Transforms itinerary data to LightItineraryDTO (camelCase)
 * Only includes essential fields for detail view
 */
function itineraryToLightDTO(data: any): LightItineraryDTO {
  return {
    id: data.id,
    suggestedTripLength: data.suggested_trip_length,
    itinerary: data.itinerary,
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
   * @throws InternalServerError if database operation fails
   */
  static async createTripNote(
    command: CreateTripNoteCommand,
    userId: string,
    supabase: SupabaseClient
  ): Promise<TripNoteDTO> {
    // Transform command to database insert format
    const insertData = commandToInsert(command, userId);

    // Insert into database with RETURNING clause
    const { data, error } = await supabase.from("trip_notes").insert(insertData).select().single();

    // Handle database errors
    if (error) {
      console.error("Database error creating trip note:", error);
      throw new InternalServerError("Failed to create trip note");
    }

    if (!data) {
      throw new InternalServerError("No data returned from database after insert");
    }

    // Transform entity to DTO
    return entityToDTO(data);
  }

  /**
   * Finds a trip note by ID
   *
   * @param id - Trip note ID
   * @param supabase - Supabase client instance
   * @returns Promise<TripNoteEntity | null> - The trip note entity or null if not found
   * @throws InternalServerError if database operation fails
   */
  static async findById(id: number, supabase: SupabaseClient): Promise<TripNoteEntity | null> {
    const { data, error } = await supabase.from("trip_notes").select("*").eq("id", id).single();

    if (error) {
      // Handle "not found" gracefully
      if (error.code === "PGRST116") {
        return null;
      }
      console.error("Database error finding trip note:", error);
      throw new InternalServerError("Failed to find trip note");
    }

    return data;
  }

  /**
   * Asserts that a trip note belongs to the specified user
   *
   * @param tripNote - The trip note entity to check
   * @param userId - The authenticated user ID
   * @throws NotFoundError if trip note doesn't exist or doesn't belong to user
   */
  static assertBelongsToUser(tripNote: TripNoteEntity | null, userId: string): asserts tripNote is TripNoteEntity {
    if (!tripNote || tripNote.user_id !== userId) {
      throw new NotFoundError("Trip note not found");
    }
  }

  /**
   * Updates a trip note if the command contains different values
   *
   * IMPORTANT: Destination cannot be changed - it's immutable for existing trip notes.
   * If destination differs, this method throws a validation error.
   *
   * @param id - Trip note ID
   * @param command - CreateTripNoteCommand with potentially updated values
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @returns Promise<TripNoteEntity> - The updated (or unchanged) trip note entity
   * @throws NotFoundError if trip note doesn't exist or doesn't belong to user
   * @throws ValidationError if destination has changed (immutable field)
   * @throws InternalServerError if database operation fails
   */
  static async updateIfChanged(
    id: number,
    command: CreateTripNoteCommand,
    userId: string,
    supabase: SupabaseClient
  ): Promise<TripNoteEntity> {
    // Fetch current trip note
    const current = await this.findById(id, supabase);
    this.assertBelongsToUser(current, userId);

    // Validate that destination has NOT changed (immutable field)
    if (current.destination !== command.destination) {
      throw new ValidationError("Destination cannot be changed once a trip note is created");
    }

    // Check if any other fields have changed
    const hasChanges =
      current.earliest_start_date !== command.earliestStartDate ||
      current.latest_start_date !== command.latestStartDate ||
      current.group_size !== command.groupSize ||
      current.approximate_trip_length !== command.approximateTripLength ||
      current.budget_amount !== (command.budgetAmount ?? null) ||
      current.currency !== (command.currency ?? null) ||
      current.details !== (command.details ?? null);

    // If no changes, return current entity
    if (!hasChanges) {
      return current;
    }

    // Transform command to update format
    const updateData = commandToInsert(command, userId);

    // Update in database
    const { data, error } = await supabase.from("trip_notes").update(updateData).eq("id", id).select().single();

    if (error) {
      console.error("Database error updating trip note:", error);
      throw new InternalServerError("Failed to update trip note");
    }

    if (!data) {
      throw new InternalServerError("No data returned from database after update");
    }

    return data;
  }

  /**
   * Converts a trip note entity to a DTO suitable for AI prompt
   *
   * @param entity - The trip note entity
   * @returns TripNoteDTO - The trip note in DTO format
   */
  static toPromptDTO(entity: TripNoteEntity): TripNoteDTO {
    return entityToDTO(entity);
  }

  /**
   * Fetches a single trip note with its itinerary (if exists) for the authenticated user
   *
   * Uses a single query with LEFT JOIN to fetch both trip note and itinerary efficiently.
   * Enforces user ownership - returns null if trip note doesn't exist or doesn't belong to user.
   *
   * @param userId - Authenticated user ID from session
   * @param id - Trip note ID from path parameter
   * @param supabase - Supabase client instance
   * @returns Promise<TripNoteWithItineraryDTO | null> - Trip note with embedded itinerary, or null if not found/not owned
   * @throws InternalServerError if database operation fails
   */
  static async getOneWithItinerary(
    userId: string,
    id: number,
    supabase: SupabaseClient
  ): Promise<TripNoteWithItineraryDTO | null> {
    // Execute single query with LEFT JOIN to fetch trip note + optional itinerary
    // Filter by both id and user_id to enforce ownership at database level
    // Only select essential itinerary fields for efficiency
    const { data, error } = await supabase
      .from("trip_notes")
      .select(
        `
        id,
        destination,
        earliest_start_date,
        latest_start_date,
        group_size,
        approximate_trip_length,
        budget_amount,
        currency,
        details,
        created_at,
        updated_at,
        itineraries (
          id,
          suggested_trip_length,
          itinerary
        )
      `
      )
      .eq("id", id)
      .eq("user_id", userId)
      .maybeSingle();

    // Handle database errors
    if (error) {
      console.error("Database error fetching trip note with itinerary:", error);
      throw new InternalServerError("Failed to fetch trip note with itinerary");
    }

    // Return null if no trip note found (either doesn't exist or doesn't belong to user)
    if (!data) {
      return null;
    }

    // Transform trip note data to DTO (manual mapping since we don't have user_id in response)
    const tripNoteDTO: TripNoteDTO = {
      id: data.id,
      destination: data.destination,
      earliestStartDate: data.earliest_start_date,
      latestStartDate: data.latest_start_date,
      groupSize: data.group_size,
      approximateTripLength: data.approximate_trip_length,
      budgetAmount: data.budget_amount,
      currency: data.currency,
      details: data.details,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    // Transform itinerary data to light DTO (or null if no itinerary exists)
    // Supabase returns null for LEFT JOIN when no match, or an object when matched
    const itineraryDTO = data.itineraries ? itineraryToLightDTO(data.itineraries) : null;

    // Compose and return combined DTO
    return {
      ...tripNoteDTO,
      itinerary: itineraryDTO,
    };
  }

  /**
   * Deletes a trip note belonging to the authenticated user
   *
   * Verifies ownership before deletion to prevent unauthorized access.
   * Thanks to ON DELETE CASCADE constraints, related itineraries and
   * AI generation jobs are automatically removed.
   *
   * @param id - Trip note ID to delete
   * @param userId - Authenticated user ID from session
   * @param supabase - Supabase client instance
   * @returns Promise<void>
   * @throws NotFoundError if trip note doesn't exist for this user
   * @throws ForbiddenError if trip note belongs to different user
   * @throws InternalServerError if database operation fails
   */
  static async deleteTripNote(id: number, userId: string, supabase: SupabaseClient): Promise<void> {
    // Verify ownership: check that trip note exists and belongs to user
    const { data: ownershipCheck, error: checkError } = await supabase
      .from("trip_notes")
      .select("id, user_id")
      .eq("id", id)
      .maybeSingle();

    // Handle database errors during ownership check
    if (checkError) {
      console.error("Database error checking trip note ownership:", checkError);
      throw new NotFoundError("Trip note not found");
    }

    // If trip note doesn't exist at all, return 404
    if (!ownershipCheck) {
      throw new NotFoundError("Trip note not found");
    }

    // If trip note exists but belongs to different user, return 403
    if (ownershipCheck.user_id !== userId) {
      throw new ForbiddenError("You do not have permission to delete this trip note");
    }

    // Perform deletion
    // ON DELETE CASCADE will automatically remove related:
    // - itineraries (1-to-1 relationship)
    // - ai_generation_jobs (1-to-N relationship)
    const { error: deleteError } = await supabase.from("trip_notes").delete().eq("id", id);

    // Handle database errors during deletion
    if (deleteError) {
      console.error("Database error deleting trip note:", deleteError);
      throw new InternalServerError("Failed to delete trip note");
    }

    // Success - no return value needed
  }

  /**
   * Lists trip notes for a user with pagination, filtering, and sorting
   *
   * @param query - Validated query parameters (page, pageSize, filters, sort)
   * @param userId - Authenticated user ID from session
   * @param supabase - Supabase client instance
   * @returns Promise<PaginatedResponse<TripNoteListItemDTO>> - Paginated list of trip notes
   * @throws InternalServerError if database operation fails
   */
  static async listTripNotes(
    query: TripNotesListQuery,
    userId: string,
    supabase: SupabaseClient
  ): Promise<PaginatedResponse<TripNoteListItemDTO>> {
    // Extract query parameters with defaults
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const sort = query.sort ?? "-created_at";

    // Build base query with LEFT JOIN to itineraries
    // Select only fields needed for list view + itineraries.id for hasItinerary flag
    let queryBuilder = supabase
      .from("trip_notes")
      .select("id,destination,earliest_start_date,approximate_trip_length,created_at,updated_at,itineraries(id)", {
        count: "exact",
      })
      .eq("user_id", userId);

    // Apply destination filter (case-insensitive contains)
    if (query.destination) {
      queryBuilder = queryBuilder.ilike("destination", `%${query.destination}%`);
    }

    // Apply date range filters
    if (query.startFrom) {
      queryBuilder = queryBuilder.gte("earliest_start_date", query.startFrom);
    }

    // Note: hasItinerary filter is applied post-query in JavaScript
    // because Supabase's PostgREST doesn't support filtering on embedded array length

    // Apply sorting
    const isDescending = sort.startsWith("-");
    const sortColumn = isDescending ? sort.slice(1) : sort;
    queryBuilder = queryBuilder.order(sortColumn, { ascending: !isDescending });

    // Apply pagination
    const offset = (page - 1) * pageSize;
    queryBuilder = queryBuilder.range(offset, offset + pageSize - 1);

    // Execute query
    const { data, error, count } = await queryBuilder;

    // Handle database errors
    if (error) {
      console.error("Database error listing trip notes:", error);
      throw new InternalServerError("Failed to list trip notes");
    }

    if (!data) {
      throw new InternalServerError("No data returned from database");
    }

    // Transform rows to TripNoteListItemDTO
    let items: TripNoteListItemDTO[] = data.map((row: any) => ({
      id: row.id,
      destination: row.destination,
      earliestStartDate: row.earliest_start_date,
      approximateTripLength: row.approximate_trip_length,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      // hasItinerary is true if itineraries object exists (one-to-one relationship)
      // Supabase returns null for LEFT JOIN when no match, or an object with {id: ...} when matched
      hasItinerary: row.itineraries !== null && row.itineraries?.id !== undefined,
    }));

    // Apply hasItinerary filter in JavaScript (post-query)
    // This is necessary because Supabase's PostgREST doesn't support filtering on embedded array length
    if (query.hasItinerary === true) {
      items = items.filter((item) => item.hasItinerary);
    } else if (query.hasItinerary === false) {
      items = items.filter((item) => !item.hasItinerary);
    }

    // Recalculate total and totalPages after filtering
    const total = items.length;
    const totalPages = Math.ceil(total / pageSize);

    // Return paginated response
    return {
      data: items,
      page,
      pageSize,
      total,
      totalPages,
    };
  }
}
