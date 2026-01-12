/**
 * Preferences Service
 * Business logic layer for user preferences operations
 * Handles retrieval and transformation of user preferences for AI prompts
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type {
  UserPreferenceEntity,
  UserPreferenceDTO,
} from '../../types';

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
export class PreferencesService {
  /**
   * Lists all preferences for a given user
   * Used to enrich AI prompts with user's saved preferences
   * 
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @returns Promise<UserPreferenceDTO[]> - Array of user preferences in DTO format
   * @throws Error if database operation fails
   */
  static async listByUser(
    userId: string,
    supabase: SupabaseClient
  ): Promise<UserPreferenceDTO[]> {
    const { data, error } = await supabase
      .from('user_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('category', { ascending: true })
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Database error fetching user preferences:', error);
      throw error;
    }

    // Return empty array if no preferences found (not an error)
    if (!data || data.length === 0) {
      return [];
    }

    // Transform all entities to DTOs
    return data.map(entityToDTO);
  }
}

