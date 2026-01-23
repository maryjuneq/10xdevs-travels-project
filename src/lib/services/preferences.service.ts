/**
 * Preferences Service
 * Business logic layer for user preferences operations
 * Handles retrieval and transformation of user preferences for AI prompts
 */

import type { SupabaseClient } from "../../db/supabase.client";
import type {
  UserPreferenceEntity,
  UserPreferenceDTO,
  CreateUserPreferenceCommand,
  UpdatePreferenceCommand,
  DeletePreferenceCommand,
} from "../../types";
import { InternalServerError } from "../errors";

/**
 * Transforms a UserPreferenceEntity (snake_case) to UserPreferenceDTO (camelCase)
 * Excludes user_id for security
 */
function entityToDTO(entity: UserPreferenceEntity): UserPreferenceDTO {
  return {
    id: entity.id,
    category: entity.category,
    preferenceText: entity.preference_text,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * Preferences Service
 * Provides methods for fetching user preferences
 */
export const PreferencesService = {
  /**
   * Lists all preferences for a given user
   * Used to enrich AI prompts with user's saved preferences
   *
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @returns Promise<UserPreferenceDTO[]> - Array of user preferences in DTO format
   * @throws InternalServerError if database operation fails
   */
  async listByUser(userId: string, supabase: SupabaseClient): Promise<UserPreferenceDTO[]> {
    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", userId)
      .order("category", { ascending: true })
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Database error fetching user preferences:", error);
      throw new InternalServerError("Failed to fetch user preferences");
    }

    // Return empty array if no preferences found (not an error)
    if (!data || data.length === 0) {
      return [];
    }

    // Transform all entities to DTOs
    return data.map(entityToDTO);
  },

  /**
   * Creates a new user preference
   * Used to persist user preferences that influence future itinerary generation
   *
   * @param command - The preference data to create
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @returns Promise<UserPreferenceDTO> - The created preference in DTO format
   * @throws InternalServerError if database operation fails
   */
  async create(
    command: CreateUserPreferenceCommand,
    userId: string,
    supabase: SupabaseClient
  ): Promise<UserPreferenceDTO> {
    const { data, error } = await supabase
      .from("user_preferences")
      .insert({
        user_id: userId,
        category: command.category,
        preference_text: command.preferenceText,
      })
      .select()
      .single();

    if (error) {
      console.error("Database error creating user preference:", error);
      throw new InternalServerError("Failed to create user preference");
    }

    if (!data) {
      console.error("No data returned after inserting user preference");
      throw new InternalServerError("Failed to create user preference");
    }

    // Transform entity to DTO
    return entityToDTO(data);
  },

  /**
   * Updates an existing user preference
   * Used to modify user preferences that influence future itinerary generation
   *
   * @param command - The update command with id, userId, and changes
   * @param supabase - Supabase client instance
   * @returns Promise<UserPreferenceDTO | null> - The updated preference in DTO format, or null if not found
   * @throws InternalServerError if database operation fails
   */
  async update(command: UpdatePreferenceCommand, supabase: SupabaseClient): Promise<UserPreferenceDTO | null> {
    const { data, error } = await supabase
      .from("user_preferences")
      .update({
        category: command.changes.category,
        preference_text: command.changes.preferenceText,
      })
      .eq("id", command.id)
      .eq("user_id", command.userId)
      .select()
      .single();

    if (error) {
      console.error("Database error updating user preference:", error);
      throw new InternalServerError("Failed to update user preference");
    }

    // Return null if no row was updated (preference not found or not owned by user)
    if (!data) {
      return null;
    }

    // Transform entity to DTO
    return entityToDTO(data);
  },

  /**
   * Removes a user preference
   * Used to delete user preferences that are no longer relevant
   *
   * @param command - The delete command with id and userId
   * @param supabase - Supabase client instance
   * @returns Promise<boolean> - True if a preference was deleted, false if not found
   * @throws InternalServerError if database operation fails
   */
  async remove(command: DeletePreferenceCommand, supabase: SupabaseClient): Promise<boolean> {
    const { error, count } = await supabase
      .from("user_preferences")
      .delete({ count: "exact" })
      .match({ id: command.id, user_id: command.userId });

    if (error) {
      console.error("Database error deleting user preference:", error);
      throw new InternalServerError("Failed to delete user preference");
    }

    // Return true if at least one row was deleted, false otherwise
    return (count ?? 0) > 0;
  },
};
