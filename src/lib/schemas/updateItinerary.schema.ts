/**
 * Zod validation schema for Update Itinerary operation
 * Validates API request payload for updating an existing itinerary
 */

import { z } from "zod";

/**
 * Schema for validating UpdateItineraryCommand
 * Enforces all business rules:
 * - itinerary: min 10 chars, max 20,000 chars (prevents empty or overly large payloads)
 *
 * Note: manuallyEdited flag is automatically set to true on the server side
 * when this endpoint is called, as the endpoint itself implies manual editing
 */
export const UpdateItinerarySchema = z.object({
  itinerary: z
    .string()
    .min(10, "Itinerary must be at least 10 characters long")
    .max(20000, "Itinerary must not exceed 20,000 characters"),
});

/**
 * Type inference from the schema
 */
export type UpdateItineraryInput = z.infer<typeof UpdateItinerarySchema>;
