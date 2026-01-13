# View Implementation Plan: Dashboard (Trip Notes List)

## 1. Overview
The Dashboard view serves as the landing page for authenticated users (`/`). It provides a comprehensive overview of the user's trip notes, allowing them to browse, filter, sort, and manage their trips. It acts as the primary entry point for creating new notes, managing user preferences, and accessing specific notes to edit details or generate itineraries.

## 2. View Routing
- **Path:** `/`
- **Component:** `src/pages/index.astro`
- **Protection:** Protected route (requires authentication).

## 3. Component Structure
```text
src/pages/index.astro (Page)
└── Layout (MainLayout)
    └── DashboardView (React Component - client:load)
        ├── DashboardHeader
        │   ├── CreateNoteButton
        │   └── ManagePreferencesButton
        ├── TripNotesToolbar
        │   ├── SearchInput
        │   ├── DateFilter
        │   ├── StatusToggle
        │   └── SortSelect
        ├── TripNotesTable
        │   ├── TripNoteRow
        │   │   ├── ItineraryBadge
        │   │   └── RowActionsMenu
        │   └── TableSkeleton (Loading state)
        ├── PaginationControls
        └── DeleteTripNoteDialog
```

## 4. Component Details

### `DashboardView` (Container)
- **Description:** Main container component that manages the state of the list (filters, pagination) and coordinates data fetching.
- **Main elements:** Wrapper `div`, `DashboardHeader`, `TripNotesToolbar`, `TripNotesTable`, `PaginationControls`.
- **Handled interactions:**
    - URL parameter synchronization (reading/writing filters to URL).
    - Managing "Delete" dialog visibility and state.
- **Types:** Uses `TripNotesListQuery` for state.
- **Props:** None (Top-level view).

### `DashboardHeader`
- **Description:** The top section of the dashboard containing the page title and primary actions.
- **Main elements:** 
    - Title ("My Trips").
    - "Add Note" Button (Links to `/trip-notes/new`).
    - "Manage Preferences" Button (Links to `/preferences`, secondary style).
- **Handled interactions:** None (contains links).
- **Types:** None.
- **Props:** None.

### `TripNotesToolbar`
- **Description:** Contains all filter and sort controls.
- **Main elements:**
    - `Input` (Search destination).
    - `Popover` + `Calendar` (Start From date).
    - `Select` (Sort order).
    - `Switch` or `Toggle` (Has Itinerary filter).
- **Handled interactions:**
    - `onSearchChange`: Updates destination filter (debounced).
    - `onSortChange`: Updates sort parameter.
    - `onFilterChange`: Updates specific filters (date, status).
- **Types:** `TripNotesListQuery`.
- **Props:**
    - `filters`: `TripNotesListQuery`
    - `onFilterChange`: `(updates: Partial<TripNotesListQuery>) => void`

### `TripNotesTable`
- **Description:** Displays the list of trip notes in a tabular format.
- **Main elements:** `Table` (Shadcn/ui), `TableHeader`, `TableBody`, `TableRow`.
- **Handled interactions:**
    - `onEdit`: Navigates to the note details page (`/trip-notes/[id]`). This single view handles both editing the note properties and triggering the itinerary generation.
    - `onDelete`: Triggers delete confirmation in parent.
- **Types:** `TripNoteListItemDTO`.
- **Props:**
    - `data`: `TripNoteListItemDTO[]`
    - `isLoading`: `boolean`
    - `onDelete`: `(id: number) => void`

### `DeleteTripNoteDialog`
- **Description:** Confirmation modal for deleting a note.
- **Main elements:** `AlertDialog`, `AlertDialogContent`, `AlertDialogHeader`, `AlertDialogFooter`.
- **Handled interactions:**
    - `onConfirm`: Calls API to delete.
    - `onCancel`: Closes dialog.
- **Props:**
    - `open`: `boolean`
    - `onOpenChange`: `(open: boolean) => void`
    - `onConfirm`: `() => void`
    - `isDeleting`: `boolean`

## 5. Types

### Required DTOs (from `src/types.ts`)
- `TripNoteListItemDTO`: Represents a single row in the table.
- `PaginatedResponse<TripNoteListItemDTO>`: API response structure.
- `TripNotesListQuery`: URL/Filter state structure.

### View Models
**SortOption**
```typescript
type SortOption = {
  label: string;
  value: TripNotesListQuery['sort'];
}
```
**DashboardState**
- Managed via URL Search Params + React State (for debounce).

## 6. State Management
- **URL State:** The "Truth" for filters and pagination is stored in the URL query parameters to support deep linking and browser history.
- **React Query:** Used for caching, fetching, and loading states of the trip notes list.
- **Local State:**
    - `debouncedSearch`: Temporary state for search input to prevent excessive API calls.
    - `deleteId`: ID of the note currently selected for deletion (null if none).
- **Hooks:**
    - `useTripNotes(params)`: Custom hook wrapping `useQuery`.
    - `useDeleteTripNote()`: Custom hook wrapping `useMutation`.
    - `useUrlFilters()`: Custom hook to read/write `TripNotesListQuery` from/to URL.

## 7. API Integration

### Fetching Notes
- **Endpoint:** `GET /api/trip-notes`
- **Request:** Query params mapping `TripNotesListQuery`.
- **Response:** `PaginatedResponse<TripNoteListItemDTO>`.
- **Integration:** Use `fetch` inside `useQuery`.

### Deleting Note
- **Endpoint:** `DELETE /api/trip-notes/{id}`
- **Request:** URL param `id`.
- **Response:** 204 No Content.
- **Integration:** Use `fetch` inside `useMutation`. On success, invalidate `['trip-notes']` query.

## 8. User Interactions
1.  **Initial Load:** View reads URL params, defaults to `{ page: 1, pageSize: 10, sort: '-created_at' }`, fetches data.
2.  **Navigation:**
    - Click "Add Note" -> Go to `/trip-notes/new`.
    - Click "Manage Preferences" -> Go to `/preferences`.
3.  **Search:** User types in "Tokyo". URL updates to `?destination=Tokyo&page=1`. List refreshes.
4.  **Filter Date:** User picks a date. URL updates. List refreshes.
5.  **Pagination:** User clicks "Next". URL updates to `?page=2`. List refreshes.
6.  **Row Actions:**
    - **Open/Edit:** Click row or "Edit" action -> Go to `/trip-notes/[id]`. (This page handles editing and generation).
7.  **Delete:**
    - User clicks trash icon on a row.
    - Dialog opens asking for confirmation.
    - User clicks "Delete".
    - Loading spinner on button.
    - Dialog closes.
    - Table refreshes (optimistic update or refetch).

## 9. Conditions and Validation
- **Search:** Minimum 2 characters recommended for effective search (though API handles any).
- **Date:** Start Date filter implies "trips starting on or after this date".
- **Empty State:** If API returns `data: []` and no filters are active, show "Welcome" empty state. If filters are active, show "No results found".

## 10. Error Handling
- **Load Error:** If `GET /api/trip-notes` fails, show error alert in place of table with "Retry" button.
- **Delete Error:** If `DELETE` fails, show Toast error ("Failed to delete note. Please try again.") and keep the note in the list.

## 11. Implementation Steps
1.  **Setup Services:** Ensure `TripNotesService` in frontend (or direct fetcher) handles the query params correctly.
2.  **Create Hooks:** Implement `useTripNotes` (Query) and `useDeleteTripNote` (Mutation).
3.  **Create `DashboardView`:** Scaffold the main component and layout.
4.  **Implement Header:** Create `DashboardHeader` with "Add Note" and "Manage Preferences" links.
5.  **Implement Toolbar:** Build `TripNotesToolbar` with Shadcn inputs/selects and connect to URL state.
6.  **Implement Table:** Build `TripNotesTable` using Shadcn Table component. Map `TripNoteListItemDTO` fields to columns.
7.  **Add Actions:** Implement the Dropdown menu for row actions, directing "Edit" to `/trip-notes/[id]`.
8.  **Implement Delete:** Add the `DeleteTripNoteDialog` and connect it to the actions.
9.  **Pagination:** Add pagination controls synced with API metadata.
10. **Integration:** Mount `DashboardView` in `src/pages/index.astro`.
11. **Refinement:** Add loading skeletons and empty states.
