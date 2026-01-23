/**
 * Dashboard View - Main container for Trip Notes List
 * Displays paginated list of trip notes with filtering, sorting, and actions
 */

import { useState } from "react";
import { useUrlFilters } from "./hooks/useUrlFilters";
import { useTripNotes } from "./hooks/useTripNotes";
import { useDeleteTripNote } from "./hooks/useDeleteTripNote";
import {
  DashboardHeader,
  TripNotesToolbar,
  TripNotesTable,
  PaginationControls,
  DeleteTripNoteDialog,
} from "./dashboard/index";
import { DeleteAccountDialog } from "./auth";
import type { TripNotesListQuery } from "../types";

interface DashboardViewProps {
  userEmail: string;
}

/**
 * Main Dashboard View Component
 * Manages state and coordinates all child components
 */
export function DashboardView({ userEmail }: DashboardViewProps) {
  const [filters, updateFilters] = useUrlFilters();
  const [deleteId, setDeleteId] = useState<number | null>(null);

  // Fetch trip notes with current filters
  const { data, isLoading, error } = useTripNotes(filters);

  // Delete mutation
  const deleteMutation = useDeleteTripNote();

  /**
   * Handle filter changes from toolbar
   */
  const handleFilterChange = (updates: Partial<TripNotesListQuery>) => {
    updateFilters(updates);
  };

  /**
   * Handle page change from pagination
   */
  const handlePageChange = (page: number) => {
    updateFilters({ page });
  };

  /**
   * Handle delete click - opens confirmation dialog
   */
  const handleDeleteClick = (id: number) => {
    setDeleteId(id);
  };

  /**
   * Handle delete confirmation
   */
  const handleDeleteConfirm = async () => {
    if (deleteId === null) return;

    await deleteMutation.mutateAsync(deleteId);
    setDeleteId(null);
  };

  /**
   * Handle delete cancel
   */
  const handleDeleteCancel = () => {
    setDeleteId(null);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header with page title and action buttons */}
      <DashboardHeader userEmail={userEmail} />

      {/* Filters and sort toolbar */}
      <TripNotesToolbar filters={filters} onFilterChange={handleFilterChange} />

      {/* Error state */}
      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-destructive">
          <p className="font-medium">Error loading trip notes</p>
          <p className="mt-1 text-sm">{error.message}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:bg-destructive/90"
          >
            Retry
          </button>
        </div>
      )}

      {/* Trip notes table */}
      {!error && <TripNotesTable data={data?.data || []} isLoading={isLoading} onDelete={handleDeleteClick} />}

      {/* Pagination controls */}
      {data && data.totalPages > 1 && (
        <PaginationControls currentPage={data.page} totalPages={data.totalPages} onPageChange={handlePageChange} />
      )}

      {/* Delete confirmation dialog */}
      <DeleteTripNoteDialog
        open={deleteId !== null}
        onOpenChange={(open) => !open && handleDeleteCancel()}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteMutation.isPending}
      />

      {/* Footer with danger zone */}
      <footer className="mt-16 border-t border-border pt-8">
        <div className="text-center">
          <h3 className="text-sm font-semibold text-foreground mb-3">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">Permanently delete your account and all associated data</p>
          <DeleteAccountDialog />
        </div>
      </footer>
    </div>
  );
}
