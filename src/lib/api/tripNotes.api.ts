/**
 * Frontend API Client for Trip Notes
 * Handles HTTP requests to the trip notes API endpoints
 */

import type { TripNoteListItemDTO, PaginatedResponse, TripNotesListQuery } from "../../types";

/**
 * Builds query string from TripNotesListQuery object
 */
function buildQueryString(query: TripNotesListQuery): string {
  const params = new URLSearchParams();

  if (query.page) params.append("page", query.page.toString());
  if (query.pageSize) params.append("pageSize", query.pageSize.toString());
  if (query.destination) params.append("destination", query.destination);
  if (query.startFrom) params.append("startFrom", query.startFrom);
  if (query.sort) params.append("sort", query.sort);
  if (query.hasItinerary !== undefined) params.append("hasItinerary", query.hasItinerary.toString());

  return params.toString();
}

/**
 * Fetches paginated list of trip notes
 *
 * @param query - Query parameters for filtering, sorting, and pagination
 * @returns Promise<PaginatedResponse<TripNoteListItemDTO>>
 * @throws Error if request fails
 */
export async function fetchTripNotes(query: TripNotesListQuery = {}): Promise<PaginatedResponse<TripNoteListItemDTO>> {
  const queryString = buildQueryString(query);
  const url = `/api/trip-notes${queryString ? `?${queryString}` : ""}`;

  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch trip notes");
  }

  return response.json();
}

/**
 * Deletes a trip note by ID
 *
 * @param id - Trip note ID to delete
 * @returns Promise<void>
 * @throws Error if request fails
 */
export async function deleteTripNote(id: number): Promise<void> {
  const response = await fetch(`/api/trip-notes/${id}`, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete trip note");
  }
}
