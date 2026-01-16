/**
 * React Query hooks for Trip Note Detail view
 * Handles data fetching and mutations for trip notes and itineraries
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type {
  TripNoteWithItineraryDTO,
  TripNoteDTO,
  ItineraryDTO,
  CreateTripNoteCommand,
  UpdateTripNoteCommand,
} from "@/types";
import {
  fetchTripNoteById,
  createTripNote,
  updateTripNote,
  generateItinerary,
  updateItinerary,
} from "@/lib/api/tripNotes.api";

// Query keys
export const tripNoteKeys = {
  all: ["trip-notes"] as const,
  lists: () => [...tripNoteKeys.all, "list"] as const,
  list: (filters: string) => [...tripNoteKeys.lists(), { filters }] as const,
  details: () => [...tripNoteKeys.all, "detail"] as const,
  detail: (id: number) => [...tripNoteKeys.details(), id] as const,
};

/**
 * Hook to fetch a single trip note with its itinerary
 * @param id - Trip note ID
 * @returns Query result with trip note data
 */
export function useTripNoteQuery(id: number) {
  return useQuery({
    queryKey: tripNoteKeys.detail(id),
    queryFn: () => fetchTripNoteById(id),
    enabled: id > 0, // Only fetch if we have a valid ID
    retry: 1,
  });
}

/**
 * Hook to create a new trip note
 * @returns Mutation result for creating trip notes
 */
export function useCreateTripNote() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: CreateTripNoteCommand) => createTripNote(command),
    onSuccess: () => {
      // Invalidate trip notes list to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: tripNoteKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing trip note
 * @param id - Trip note ID
 * @returns Mutation result for updating trip notes
 */
export function useUpdateTripNote(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: UpdateTripNoteCommand) => updateTripNote(id, command),
    onSuccess: (data) => {
      // Update the detail cache with the new data
      queryClient.setQueryData(tripNoteKeys.detail(id), data);
      // Invalidate lists to refresh the dashboard
      queryClient.invalidateQueries({ queryKey: tripNoteKeys.lists() });
    },
  });
}

/**
 * Hook to generate an itinerary for a trip note
 * @param id - Trip note ID
 * @returns Mutation result for generating itineraries
 */
export function useGenerateItinerary(id: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: CreateTripNoteCommand) => generateItinerary(id, command),
    onSuccess: (data) => {
      // Update the detail cache with the new data including the itinerary
      queryClient.setQueryData(tripNoteKeys.detail(id), data);
      // Invalidate lists to update hasItinerary flag on dashboard
      queryClient.invalidateQueries({ queryKey: tripNoteKeys.lists() });
    },
  });
}

/**
 * Hook to update an existing itinerary
 * @param tripNoteId - Trip note ID (for cache invalidation)
 * @returns Mutation result for updating itineraries
 */
export function useUpdateItinerary(tripNoteId: number) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ itineraryId, text }: { itineraryId: number; text: string }) =>
      updateItinerary(itineraryId, text),
    onMutate: async ({ text }) => {
      // Cancel any outgoing refetches to prevent optimistic update from being overwritten
      await queryClient.cancelQueries({ queryKey: tripNoteKeys.detail(tripNoteId) });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData<TripNoteWithItineraryDTO>(tripNoteKeys.detail(tripNoteId));

      // Optimistically update to the new value
      if (previousData && previousData.itinerary) {
        queryClient.setQueryData<TripNoteWithItineraryDTO>(tripNoteKeys.detail(tripNoteId), {
          ...previousData,
          itinerary: {
            ...previousData.itinerary,
            itinerary: text,
          },
        });
      }

      // Return context with the previous data
      return { previousData };
    },
    onError: (err, variables, context) => {
      // Revert to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(tripNoteKeys.detail(tripNoteId), context.previousData);
      }
    },
    onSuccess: (data) => {
      // Update the itinerary in the cache
      const previousData = queryClient.getQueryData<TripNoteWithItineraryDTO>(tripNoteKeys.detail(tripNoteId));
      if (previousData) {
        queryClient.setQueryData<TripNoteWithItineraryDTO>(tripNoteKeys.detail(tripNoteId), {
          ...previousData,
          itinerary: data,
        });
      }
    },
  });
}

/**
 * Consolidated hook that provides all trip note operations
 * Combines query and mutations for convenience
 * @param id - Trip note ID (0 for new notes)
 * @returns Combined query and mutation operations
 */
export function useTripNote(id: number) {
  const query = useTripNoteQuery(id);
  const createMutation = useCreateTripNote();
  const updateMutation = useUpdateTripNote(id);
  const generateMutation = useGenerateItinerary(id);
  const updateItineraryMutation = useUpdateItinerary(id);

  return {
    // Query
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,

    // Mutations
    save: async (command: CreateTripNoteCommand): Promise<TripNoteDTO> => {
      if (id === 0) {
        return createMutation.mutateAsync(command);
      } else {
        return updateMutation.mutateAsync(command);
      }
    },
    generate: async (noteId: number, command: CreateTripNoteCommand): Promise<TripNoteWithItineraryDTO> => {
      return generateMutation.mutateAsync(command);
    },
    updateItinerary: async (itineraryId: number, text: string): Promise<ItineraryDTO> => {
      return updateItineraryMutation.mutateAsync({ itineraryId, text });
    },

    // Mutation states
    isSaving: createMutation.isPending || updateMutation.isPending,
    isGenerating: generateMutation.isPending,
    isUpdatingItinerary: updateItineraryMutation.isPending,

    // Error states
    saveError: (createMutation.error || updateMutation.error) as Error | undefined,
    generateError: generateMutation.error as Error | undefined,
    updateItineraryError: updateItineraryMutation.error as Error | undefined,
  };
}

