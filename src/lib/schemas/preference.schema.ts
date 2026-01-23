/**
 * Zod validation schemas for User Preference operations
 * Validates API request payloads for creating and updating user preferences
 */

import { z } from "zod";

/**
 * Schema for validating CreateUserPreferenceCommand
 * Enforces all business rules:
 * - category: optional enum, defaults to 'other'
 * - preferenceText: required, trimmed, 1-255 characters
 */
export const CreatePreferenceSchema = z.object({
  category: z
    .enum(['food', 'culture', 'adventure', 'nature', 'other'])
    .optional()
    .default('other'),
  preferenceText: z
    .string()
    .trim()
    .min(1, 'Preference cannot be empty')
    .max(255, 'Preference too long'),
});

/**
 * Schema for validating UpdateUserPreferenceCommand
 * Allows optional fields but requires at least one field to be provided
 */
export const UpdatePreferenceSchema = z.object({
  category: z.enum(['food', 'culture', 'adventure', 'nature', 'other']).optional(),
  preferenceText: z.string().trim().min(1).max(255).optional(),
}).refine(obj => Object.keys(obj).length > 0, {
  message: 'At least one field must be provided',
});

/**
 * Type inference from the schema
 */
export type CreatePreferenceInput = z.infer<typeof CreatePreferenceSchema>;
export type UpdatePreferenceInput = z.infer<typeof UpdatePreferenceSchema>;