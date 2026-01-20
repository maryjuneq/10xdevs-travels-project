/**
 * View-specific types for Trip Note Detail view
 * Only includes UI-specific types that don't exist in the shared types
 * Reuses CreateTripNoteCommand and UpdateItineraryCommand for form values
 */

// ============================================================================
// UI State Types
// ============================================================================

/**
 * Discriminated union for the primary action button mode
 * - "save": Only save the trip note
 * - "saveAndGenerate": Save the trip note and generate itinerary
 */
export type PrimaryActionMode = "save" | "saveAndGenerate";

/**
 * Generation state for tracking AI itinerary generation
 */
export interface GenerationState {
  isGenerating: boolean;
  error?: string;
  startTime?: number;
}
