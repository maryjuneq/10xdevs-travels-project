/**
 * Trip Notes Table Component
 * Displays paginated list of trip notes with actions
 */

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../ui/table";
import { Badge } from "../ui/badge";
import { Button } from "../ui/button";
import { Pencil, Trash2 } from "lucide-react";
import type { TripNoteListItemDTO } from "../../types";

interface TripNotesTableProps {
  data: TripNoteListItemDTO[];
  isLoading: boolean;
  onDelete: (id: number) => void;
}

/**
 * Formats date to display format (e.g., "Jan 15, 2026")
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Loading skeleton row
 */
function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-16 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-20 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="h-4 w-24 animate-pulse rounded bg-muted" />
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
          <div className="h-8 w-8 animate-pulse rounded bg-muted" />
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Empty state component
 */
function EmptyState() {
  return (
    <TableRow>
      <TableCell colSpan={6} className="h-64 text-center">
        <div className="flex flex-col items-center justify-center space-y-3">
          <p className="text-lg font-medium text-muted-foreground">No trip notes found</p>
          <p className="text-sm text-muted-foreground">Create your first trip note to get started</p>
          <Button asChild>
            <a href="/trip-notes/new">Add Note</a>
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}

/**
 * Trip Notes Table Component
 */
export function TripNotesTable({ data, isLoading, onDelete }: TripNotesTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Destination</TableHead>
            <TableHead>Start Date</TableHead>
            <TableHead>Trip Length</TableHead>
            <TableHead>Itinerary</TableHead>
            <TableHead>Created</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {/* Loading State */}
          {isLoading && (
            <>
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
              <SkeletonRow />
            </>
          )}

          {/* Empty State */}
          {!isLoading && data.length === 0 && <EmptyState />}

          {/* Data Rows */}
          {!isLoading &&
            data.map((note) => (
              <TableRow
                key={note.id}
                className="cursor-pointer hover:bg-muted/50"
                onClick={() => (window.location.href = `/trip-notes/${note.id}`)}
              >
                <TableCell className="font-medium">{note.destination}</TableCell>
                <TableCell>{formatDate(note.earliestStartDate)}</TableCell>
                <TableCell>
                  {note.approximateTripLength} {note.approximateTripLength === 1 ? "day" : "days"}
                </TableCell>
                <TableCell>
                  {note.hasItinerary ? (
                    <Badge variant="default">Generated</Badge>
                  ) : (
                    <Badge variant="outline">Not Yet</Badge>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground">{formatDate(note.createdAt)}</TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-2">
                    {/* Edit Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.location.href = `/trip-notes/${note.id}`;
                      }}
                      aria-label="Edit trip note"
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>

                    {/* Delete Button */}
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(note.id);
                      }}
                      aria-label="Delete trip note"
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
        </TableBody>
      </Table>
    </div>
  );
}
