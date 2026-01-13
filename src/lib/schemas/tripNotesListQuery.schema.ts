/**
 * Zod validation schema for Trip Notes List Query Parameters
 * Validates and coerces query parameters from GET /api/trip-notes
 */

import { z } from "zod";

/**
 * Schema for validating query parameters for listing trip notes
 * Handles:
 * - page: 1-based page index (default: 1)
 * - pageSize: results per page, 1-100 (default: 20)
 * - destination: case-insensitive substring filter (trimmed)
 * - sort: column name with optional '-' prefix for DESC (default: '-created_at')
 * - hasItinerary: filter by itinerary existence
 */
export const TripNotesListQuerySchema = z.object({
  // Page number (1-based)
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .pipe(z.number().int("page must be an integer").min(1, "page must be at least 1")),

  // Page size
  pageSize: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 20))
    .pipe(
      z
        .number()
        .int("pageSize must be an integer")
        .min(1, "pageSize must be at least 1")
        .max(100, "pageSize must not exceed 100")
    ),

  // Destination filter (case-insensitive contains)
  destination: z
    .string()
    .optional()
    .transform((val) => val?.trim()),

  // Date range filters (ISO-8601 dates)
  startFrom: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "startFrom must be in ISO-8601 format (YYYY-MM-DD)")
    .optional(),

  // Sort column and direction
  sort: z
    .enum(["destination", "earliest_start_date", "created_at", "-destination", "-earliest_start_date", "-created_at"])
    .optional()
    .default("-created_at"),

  // Filter by itinerary existence
  hasItinerary: z
    .string()
    .optional()
    .transform((val) => {
      if (val === undefined || val === "") return undefined;
      return val === "true";
    })
    .pipe(z.boolean().optional()),
});

/**
 * Type inference from the schema
 */
export type TripNotesListQueryInput = z.infer<typeof TripNotesListQuerySchema>;
