/**
 * Custom hook for deleting trip notes with React Query
 */

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { deleteTripNote } from "../../lib/api/tripNotes.api";

/**
 * Hook for deleting a trip note
 * Automatically invalidates the trip-notes query cache on success
 *
 * @returns React Query mutation result
 */
export function useDeleteTripNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deleteTripNote(id),
    onSuccess: () => {
      // Invalidate and refetch trip notes list
      queryClient.invalidateQueries({ queryKey: ["trip-notes"] });
    },
  });
}
