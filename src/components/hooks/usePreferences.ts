/**
 * Custom hook for managing user preferences with React Query
 * Supports optimistic updates for create, update, and delete operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  fetchPreferences,
  createPreference,
  updatePreference,
  deletePreference,
} from "../../lib/api/preferences.api";
import type { UserPreferenceDTO, CreateUserPreferenceCommand, UpdatePreferenceDTO } from "../../types";

const PREFERENCES_QUERY_KEY = ["preferences"];

/**
 * Hook for fetching user preferences list
 *
 * @returns React Query result with preferences data
 */
export function usePreferences() {
  return useQuery({
    queryKey: PREFERENCES_QUERY_KEY,
    queryFn: fetchPreferences,
    staleTime: 30000, // Consider data fresh for 30 seconds
  });
}

/**
 * Hook for creating a new preference with optimistic updates
 *
 * @returns Mutation object with create function
 */
export function useCreatePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (command: CreateUserPreferenceCommand) => createPreference(command),
    onMutate: async (newPreference) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<UserPreferenceDTO[]>(PREFERENCES_QUERY_KEY);

      // Optimistically update with temporary ID
      const tempId = `temp-${Date.now()}-${Math.random()}`;
      const optimisticPreference: UserPreferenceDTO = {
        id: -1, // Temporary negative ID
        category: newPreference.category || "other",
        preferenceText: newPreference.preferenceText,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      queryClient.setQueryData<UserPreferenceDTO[]>(PREFERENCES_QUERY_KEY, (old) => [
        ...(old || []),
        optimisticPreference,
      ]);

      // Return context with previous data for rollback
      return { previousPreferences, tempId };
    },
    onError: (err, newPreference, context) => {
      // Rollback to previous state on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previousPreferences);
      }
    },
    onSuccess: () => {
      // Refetch to get the real ID from server
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });
}

/**
 * Hook for updating an existing preference with optimistic updates
 *
 * @returns Mutation object with update function
 */
export function useUpdatePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: number; updates: UpdatePreferenceDTO }) => updatePreference(id, updates),
    onMutate: async ({ id, updates }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<UserPreferenceDTO[]>(PREFERENCES_QUERY_KEY);

      // Optimistically update
      queryClient.setQueryData<UserPreferenceDTO[]>(PREFERENCES_QUERY_KEY, (old) =>
        old?.map((pref) =>
          pref.id === id
            ? {
                ...pref,
                ...updates,
                updatedAt: new Date().toISOString(),
              }
            : pref
        ) || []
      );

      // Return context with previous data for rollback
      return { previousPreferences };
    },
    onError: (err, variables, context) => {
      // Rollback to previous state on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previousPreferences);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });
}

/**
 * Hook for deleting a preference with optimistic updates
 *
 * @returns Mutation object with delete function
 */
export function useDeletePreference() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => deletePreference(id),
    onMutate: async (deletedId) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: PREFERENCES_QUERY_KEY });

      // Snapshot the previous value
      const previousPreferences = queryClient.getQueryData<UserPreferenceDTO[]>(PREFERENCES_QUERY_KEY);

      // Optimistically remove the preference
      queryClient.setQueryData<UserPreferenceDTO[]>(
        PREFERENCES_QUERY_KEY,
        (old) => old?.filter((pref) => pref.id !== deletedId) || []
      );

      // Return context with previous data for rollback
      return { previousPreferences };
    },
    onError: (err, deletedId, context) => {
      // Rollback to previous state on error
      if (context?.previousPreferences) {
        queryClient.setQueryData(PREFERENCES_QUERY_KEY, context.previousPreferences);
      }
    },
    onSuccess: () => {
      // Refetch to ensure consistency with server
      queryClient.invalidateQueries({ queryKey: PREFERENCES_QUERY_KEY });
    },
  });
}
