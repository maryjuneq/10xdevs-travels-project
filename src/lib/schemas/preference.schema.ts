/**
 * Zod validation schemas for User Preference operations
 * Validates API request payloads for creating and updating user preferences
 */

import { z } from "zod";

/**
 * Schema for validating CreateUserPreferenceCommand
 * Enforces all business rules:
 * - category: optional enum, defaults to 'other'
 * - preferenceText: required, trimmed, 3-200 characters
 */
export const CreatePreferenceSchema = z.object({
  category: z.enum(["food", "culture", "adventure", "nature", "other"]).optional().default("other"),
  preferenceText: z
    .string()
    .trim()
    .min(3, "Preference must be at least 3 characters")
    .max(200, "Preference must be at most 200 characters"),
});

/**
 * Schema for validating UpdateUserPreferenceCommand
 * Allows optional fields but requires at least one field to be provided
 */
export const UpdatePreferenceSchema = z
  .object({
    category: z.enum(["food", "culture", "adventure", "nature", "other"]).optional(),
    preferenceText: z
      .string()
      .trim()
      .min(3, "Preference must be at least 3 characters")
      .max(200, "Preference must be at most 200 characters")
      .optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: "At least one field must be provided",
  });

/**
 * Type inference from the schema
 */
export type CreatePreferenceInput = z.infer<typeof CreatePreferenceSchema>;
export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceSchema>;
