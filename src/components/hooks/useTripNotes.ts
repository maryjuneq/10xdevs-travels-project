/**
 * Custom hook for fetching trip notes with React Query
 */

import { useQuery } from "@tanstack/react-query";
import { fetchTripNotes } from "../../lib/api/tripNotes.api";
import type { TripNotesListQuery } from "../../types";

/**
 * Hook for fetching paginated trip notes list
 *
 * @param query - Query parameters for filtering, sorting, and pagination
 * @returns React Query result with trip notes data
 */
export function useTripNotes(query: TripNotesListQuery = {}) {
  return useQuery({
    queryKey: ["trip-notes", query],
    queryFn: () => fetchTripNotes(query),
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}
