/**
 * Frontend API Client for Trip Notes
 * Handles HTTP requests to the trip notes API endpoints
 */

import type {
  TripNoteListItemDTO,
  PaginatedResponse,
  TripNotesListQuery,
  TripNoteWithItineraryDTO,
  TripNoteDTO,
  ItineraryDTO,
  CreateTripNoteCommand,
  UpdateTripNoteCommand,
  UpdateItineraryCommand,
} from "../../types";

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
 * Fetches a single trip note with its itinerary (if exists)
 *
 * @param id - Trip note ID
 * @returns Promise<TripNoteWithItineraryDTO>
 * @throws Error if request fails
 */
export async function fetchTripNoteById(id: number): Promise<TripNoteWithItineraryDTO> {
  const response = await fetch(`/api/trip-notes/${id}`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch trip note");
  }

  return response.json();
}

/**
 * Creates a new trip note
 *
 * @param command - Trip note creation command
 * @returns Promise<TripNoteDTO>
 * @throws Error if request fails
 */
export async function createTripNote(command: CreateTripNoteCommand): Promise<TripNoteDTO> {
  const response = await fetch("/api/trip-notes", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create trip note");
  }

  return response.json();
}

/**
 * Updates an existing trip note
 *
 * @param id - Trip note ID
 * @param command - Trip note update command
 * @returns Promise<TripNoteWithItineraryDTO>
 * @throws Error if request fails
 */
export async function updateTripNote(id: number, command: UpdateTripNoteCommand): Promise<TripNoteWithItineraryDTO> {
  const response = await fetch(`/api/trip-notes/${id}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update trip note");
  }

  return response.json();
}

/**
 * Generates an itinerary for a trip note
 *
 * @param id - Trip note ID
 * @param command - Trip note data for generation
 * @returns Promise<TripNoteWithItineraryDTO>
 * @throws Error if request fails
 */
export async function generateItinerary(id: number, command: CreateTripNoteCommand): Promise<TripNoteWithItineraryDTO> {
  const response = await fetch("/api/trip-notes/generateItenerary", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ id, ...command }),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to generate itinerary");
  }

  return response.json();
}

/**
 * Updates an existing itinerary
 *
 * @param itineraryId - Itinerary ID
 * @param text - Updated itinerary text
 * @returns Promise<ItineraryDTO>
 * @throws Error if request fails
 */
export async function updateItinerary(itineraryId: number, text: string): Promise<ItineraryDTO> {
  const command: UpdateItineraryCommand = { itinerary: text };

  const response = await fetch(`/api/itineraries/${itineraryId}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update itinerary");
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
