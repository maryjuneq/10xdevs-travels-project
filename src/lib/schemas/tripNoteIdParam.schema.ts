/**
 * Zod validation schema for Trip Note ID parameter
 * Validates path parameters for endpoints like GET /api/trip-notes/{id}
 */

import { z } from "zod";

/**
 * Schema for validating trip note ID from URL path parameters
 * Ensures the ID is:
 * - A valid number
 * - An integer
 * - Greater than 0 (positive)
 */
export const TripNoteIdParamSchema = z.object({
  id: z.coerce
    .number({
      required_error: "Trip note ID is required",
      invalid_type_error: "Trip note ID must be a number",
    })
    .int("Trip note ID must be an integer")
    .positive("Trip note ID must be greater than 0"),
});

/**
 * Type inference from the schema
 */
export type TripNoteIdParam = z.infer<typeof TripNoteIdParamSchema>;
