/**
 * Frontend API Client for User Preferences
 * Handles HTTP requests to the preferences API endpoints
 */

import type { UserPreferenceDTO, CreateUserPreferenceCommand, UpdatePreferenceDTO } from "../../types";

/**
 * Fetches all user preferences
 *
 * @returns Promise<UserPreferenceDTO[]>
 * @throws Error if request fails
 */
export async function fetchPreferences(): Promise<UserPreferenceDTO[]> {
  const response = await fetch("/api/preferences", {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch preferences");
  }

  return response.json();
}

/**
 * Creates a new user preference
 *
 * @param command - Preference creation command
 * @returns Promise<UserPreferenceDTO>
 * @throws Error if request fails
 */
export async function createPreference(command: CreateUserPreferenceCommand): Promise<UserPreferenceDTO> {
  const response = await fetch("/api/preferences", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create preference");
  }

  return response.json();
}

/**
 * Updates an existing user preference
 *
 * @param id - Preference ID
 * @param updates - Partial preference updates
 * @returns Promise<UserPreferenceDTO>
 * @throws Error if request fails
 */
export async function updatePreference(id: number, updates: UpdatePreferenceDTO): Promise<UserPreferenceDTO> {
  const response = await fetch(`/api/preferences/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(updates),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update preference");
  }

  return response.json();
}

/**
 * Deletes a user preference by ID
 *
 * @param id - Preference ID to delete
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deletePreference(id: number): Promise<void> {
  const response = await fetch(`/api/preferences/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete preference");
  }
}
