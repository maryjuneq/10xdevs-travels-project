/**
 * Zod validation schema for Generate Itinerary operation
 * Validates API request payload for POST /api/trip-notes/generateItenerary
 * Extends CreateTripNoteCommand with required id field
 */

import { z } from "zod";
import { BaseTripNoteSchema } from "./tripNote.schema";

/**
 * Schema for validating Generate Itinerary request
 * Requires:
 * - id: bigint (existing trip note id)
 * - All CreateTripNoteCommand fields (optional for update)
 *
 * The endpoint will validate ownership and optionally update
 * the trip note if any fields differ from stored values.
 */
export const GenerateItinerarySchema = BaseTripNoteSchema.extend({
  id: z.number().int("id must be an integer").positive("id must be greater than 0"),
}).refine(
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
 * Type inference from the schema
 */
export type GenerateItineraryInput = z.infer<typeof GenerateItinerarySchema>;
