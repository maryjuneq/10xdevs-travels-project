/**
 * Zod validation schemas for Trip Note operations
 * Validates API request payloads for creating and updating trip notes
 */

import { z } from "zod";

/**
 * Base object schema for trip note fields (without date validation refinement)
 * Exported for reuse in other schemas that need to extend it
 */
export const BaseTripNoteSchema = z.object({
  destination: z.string().min(1, "Destination is required").max(255, "Destination must not exceed 255 characters"),

  earliestStartDate: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "earliestStartDate must be in ISO-8601 format (YYYY-MM-DD)"),

  latestStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "latestStartDate must be in ISO-8601 format (YYYY-MM-DD)"),

  groupSize: z.number().int("groupSize must be an integer").positive("groupSize must be greater than 0"),

  approximateTripLength: z
    .number()
    .int("approximateTripLength must be an integer")
    .positive("approximateTripLength must be greater than 0"),

  budgetAmount: z
    .number()
    .int("budgetAmount must be an integer")
    .positive("budgetAmount must be greater than 0")
    .nullable()
    .optional(),

  currency: z
    .string()
    .length(3, "currency must be a 3-letter ISO-4217 code")
    .regex(/^[A-Z]{3}$/, "currency must contain only uppercase letters")
    .nullable()
    .optional(),

  details: z.string().nullable().optional(),
});

/**
 * Schema for validating CreateTripNoteCommand
 * Enforces all business rules:
 * - destination: max 255 chars
 * - dates: ISO-8601 format, latestStartDate >= earliestStartDate
 * - groupSize: positive integer
 * - approximateTripLength: positive integer
 * - budgetAmount: positive integer (optional)
 * - currency: 3-letter ISO-4217 code (optional)
 * - details: free text (optional)
 */
export const CreateTripNoteSchema = BaseTripNoteSchema.refine(
  (data) => {
    // Validate that latestStartDate >= earliestStartDate
    const earliest = new Date(data.earliestStartDate);
    const latest = new Date(data.latestStartDate);
    return latest >= earliest;
  },
  {
    message: "latestStartDate must be greater than or equal to earliestStartDate",
    path: ["latestStartDate"],
  }
);

/**
 * Schema for validating UpdateTripNoteCommand
 * Same validation rules as CreateTripNoteSchema
 */
export const UpdateTripNoteSchema = CreateTripNoteSchema;

/**
 * Type inference from the schema
 */
export type CreateTripNoteInput = z.infer<typeof CreateTripNoteSchema>;
export type UpdateTripNoteInput = z.infer<typeof UpdateTripNoteSchema>;
