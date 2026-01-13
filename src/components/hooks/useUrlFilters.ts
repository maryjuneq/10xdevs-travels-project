/**
 * Custom hook for managing URL-based filter state
 * Synchronizes filter state with URL search parameters for deep linking
 */

import { useEffect, useState } from "react";
import type { TripNotesListQuery } from "../../types";

/**
 * Parses URL search parameters into TripNotesListQuery object
 */
function parseUrlParams(): TripNotesListQuery {
  if (typeof window === "undefined") {
    return { page: 1, pageSize: 10, sort: "-created_at" };
  }

  const params = new URLSearchParams(window.location.search);

  const query: TripNotesListQuery = {
    page: params.get("page") ? parseInt(params.get("page") || "1") : 1,
    pageSize: params.get("pageSize") ? parseInt(params.get("pageSize") || "10") : 10,
    sort: (params.get("sort") as TripNotesListQuery["sort"]) || "-created_at",
  };

  const destination = params.get("destination");
  if (destination) {
    query.destination = destination;
  }

  const startFrom = params.get("startFrom");
  if (startFrom) {
    query.startFrom = startFrom;
  }

  if (params.get("hasItinerary")) {
    query.hasItinerary = params.get("hasItinerary") === "true";
  }

  return query;
}

/**
 * Updates URL search parameters without triggering page reload
 */
function updateUrlParams(query: TripNotesListQuery) {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams();

  if (query.page && query.page !== 1) {
    params.set("page", query.page.toString());
  }
  if (query.pageSize && query.pageSize !== 10) {
    params.set("pageSize", query.pageSize.toString());
  }
  if (query.destination) {
    params.set("destination", query.destination);
  }
  if (query.startFrom) {
    params.set("startFrom", query.startFrom);
  }
  if (query.sort && query.sort !== "-created_at") {
    params.set("sort", query.sort);
  }
  if (query.hasItinerary !== undefined) {
    params.set("hasItinerary", query.hasItinerary.toString());
  }

  const newUrl = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ""}`;
  window.history.pushState({}, "", newUrl);
}

/**
 * Hook for managing URL-synced filter state
 *
 * @returns [filters, updateFilters] - Current filters and function to update them
 */
export function useUrlFilters(): [TripNotesListQuery, (updates: Partial<TripNotesListQuery>) => void] {
  const [filters, setFilters] = useState<TripNotesListQuery>(() => parseUrlParams());

  // Sync with URL on mount and when URL changes (back/forward navigation)
  useEffect(() => {
    const handlePopState = () => {
      setFilters(parseUrlParams());
    };

    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  /**
   * Updates filters and syncs with URL
   * Resets page to 1 when filters change (except for page changes)
   */
  const updateFilters = (updates: Partial<TripNotesListQuery>) => {
    setFilters((prev) => {
      const newFilters = {
        ...prev,
        ...updates,
      };

      // Reset to page 1 if any filter changed (except page itself)
      if (updates.page === undefined && Object.keys(updates).length > 0) {
        newFilters.page = 1;
      }

      updateUrlParams(newFilters);
      return newFilters;
    });
  };

  return [filters, updateFilters];
}
