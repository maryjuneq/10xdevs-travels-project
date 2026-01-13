/**
 * Jobs Service
 * Business logic layer for AI generation job tracking
 * Handles logging of successful and failed AI generation attempts
 */

import type { SupabaseClient } from '../../db/supabase.client';
import type { TablesInsert } from '../../db/database.types';
import type {
  GenerationJobEntity,
  GenerationJobDTO,
  GenerationStatus,
} from '../../types';
import { InternalServerError } from '../errors';

/**
 * Transforms a GenerationJobEntity (snake_case) to GenerationJobDTO (camelCase)
 * Excludes user_id for security
 */
function entityToDTO(entity: GenerationJobEntity): GenerationJobDTO {
  return {
    id: entity.id,
    tripNoteId: entity.trip_note_id,
    status: entity.status,
    durationMs: entity.duration_ms,
    errorText: entity.error_text,
    createdAt: entity.created_at,
    updatedAt: entity.updated_at,
  };
}

/**
 * Jobs Service
 * Provides methods for logging AI generation jobs
 */
export class JobsService {
  /**
   * Logs a successful AI generation job
   * 
   * @param tripNoteId - ID of the trip note
   * @param durationMs - Duration of the AI generation in milliseconds
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @returns Promise<GenerationJobDTO> - The created job record in DTO format
   * @throws Error if database operation fails
   */
  static async logSucceeded(
    tripNoteId: number,
    durationMs: number,
    userId: string,
    supabase: SupabaseClient
  ): Promise<GenerationJobDTO> {
    const insertData: TablesInsert<'ai_generation_jobs'> = {
      trip_note_id: tripNoteId,
      status: 'succeeded' as GenerationStatus,
      duration_ms: durationMs,
      error_text: null,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('ai_generation_jobs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error logging successful job:', error);
      throw new InternalServerError('Failed to log successful generation job');
    }

    if (!data) {
      throw new InternalServerError('No data returned from database after job insert');
    }

    return entityToDTO(data);
  }

  /**
   * Logs a failed AI generation job
   * 
   * @param tripNoteId - ID of the trip note
   * @param errorText - Error message describing the failure
   * @param userId - Authenticated user ID
   * @param supabase - Supabase client instance
   * @param durationMs - Optional duration before failure (null if never started)
   * @returns Promise<GenerationJobDTO> - The created job record in DTO format
   * @throws InternalServerError if database operation fails
   */
  static async logFailed(
    tripNoteId: number,
    errorText: string,
    userId: string,
    supabase: SupabaseClient,
    durationMs?: number | null
  ): Promise<GenerationJobDTO> {
    const insertData: TablesInsert<'ai_generation_jobs'> = {
      trip_note_id: tripNoteId,
      status: 'failed' as GenerationStatus,
      duration_ms: durationMs ?? null,
      error_text: errorText,
      user_id: userId,
    };

    const { data, error } = await supabase
      .from('ai_generation_jobs')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Database error logging failed job:', error);
      throw new InternalServerError('Failed to log failed generation job');
    }

    if (!data) {
      throw new InternalServerError('No data returned from database after job insert');
    }

    return entityToDTO(data);
  }

  /**
   * Lists all generation jobs for a specific trip note
   * Useful for viewing generation history
   * 
   * @param tripNoteId - ID of the trip note
   * @param supabase - Supabase client instance
   * @returns Promise<GenerationJobDTO[]> - Array of job records in DTO format
   * @throws InternalServerError if database operation fails
   */
  static async listByTripNote(
    tripNoteId: number,
    supabase: SupabaseClient
  ): Promise<GenerationJobDTO[]> {
    const { data, error } = await supabase
      .from('ai_generation_jobs')
      .select('*')
      .eq('trip_note_id', tripNoteId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Database error listing jobs:', error);
      throw new InternalServerError('Failed to list generation jobs');
    }

    if (!data || data.length === 0) {
      return [];
    }

    return data.map(entityToDTO);
  }
}

