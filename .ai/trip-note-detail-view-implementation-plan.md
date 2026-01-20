# View Implementation Plan – Trip Note Detail (`/trip-notes/:id`)

## 1. Overview

The Trip Note Detail view allows users to create, view, and edit a single Trip Note and, if present, its generated Itinerary. It combines a form for note fields with a pane for itinerary text inside a resizable split-pane. From this screen the user can:

1. Save or update the Trip Note.
2. Generate an itinerary from the note.
3. Regenerate or manually edit an existing itinerary.
   The view fulfils User Stories US-003, US-005, US-008, US-009 and US-010 in the PRD.

## 2. View Routing

Astro file: `src/pages/trip-notes/[id].astro`
– Routed automatically by Astro’s file-based router at path `/trip-notes/:id` where `:id` is either
• a real numeric id (detail/edit), or
• the literal string `new` (create-new shortcut handled by sibling Add Trip Note view).

## 3. Component Structure

```
TripNoteDetailPage (React island, entrypoint)
├── Breadcrumbs (layout, optional)
├── ResizablePanelGroup (Shadcn)
│   ├── NoteFormPanel
│   │   └── NoteForm
│   │       ├── DestinationInput
│   │       ├── FlexibleDatesSwitch
│   │       ├── DatePicker (start date) & Conditional LatestDatePicker
│   │       ├── GroupSizeInput
│   │       ├── BudgetAmountInput
│   │       ├── CurrencySelect
│   │       ├── DetailsTextarea
│   │       └── PrimaryActionButton
│   │       └── GenerateItinerarySwitch
│   └── ItineraryPanel
│       └── ItineraryForm
│           ├── ManualEditSwitch
│           └── ItineraryTextarea / Placeholder
├── GenerationModal (portal – hidden until active)
└── UnsavedPrompt (navigation blocker)
```

## 4. Component Details

### 4.1 TripNoteDetailPage

- **Purpose**: Fetch note & itinerary, orchestrate child components, own global view state.
- **Elements**: wrapper `div`, React Query `QueryClientProvider`, child components.
- **Events**:
  • Mount → fetch note via `useTripNoteQuery`
  • `onSaveNote`, `onGenerate`, `onRegenerate`, `onManualEdit`, `onNavigate`
- **Validation**: delegates to NoteForm / ItineraryForm.
- **Types**: `TripNoteDTO`, `TripNoteWithItineraryDTO`, `ItineraryDTO`, view-local state types (see §5).
- **Props**: `id: string` (from Astro routing params).

### 4.2 NoteForm

- **Purpose**: Controlled form for Trip Note fields.
- **Elements**: Tailwind-styled `form` with:
  • `DestinationInput` (text)
  • `FlexibleDatesSwitch` (checkbox)
  • `StartDatePicker` and conditional `LatestDatePicker`
  • `GroupSizeInput` (number)
  • `ApproxTripLengthInput` (number, days)
  • `BudgetAmountInput` + `CurrencySelect`
  • `DetailsTextarea` (large height, supports Markdown bullet lists)
  • Error spans under each field
- **Events**:
  • `onSubmit` (Save) – fires POST (create) or PUT (update) mutation.
  • Field `onChange` – sets dirty flag.
- **Validation**:
  • Client: Zod mirroring backend `CreateTripNoteSchema` (required fields, date order, numeric ranges).
  • Server: handle 400 fieldErrors mapping.
- **Types**:
  • `TripNoteFormValues` (ViewModel) – camelCase.
- **Props**:
  • `initialValues?: TripNoteFormValues`
  • `onSave(values): Promise<void>`
  • `disabled: boolean` (true during generation).

### 4.3 PrimaryActionButton

- **Purpose**: Context-aware CTA: “Save & Generate” (default) or “Save” when Generate itinerary switch is off or the note was not created yet (first save).
- **Elements**: Shadcn `Button` with icon.
- **Events**:
  • `onClick` delegates to parent supplied handler.
- **Validation/State**: disabled when NoteForm invalid or generation in progress.
- **Props**: `{ mode: PrimaryActionMode; onClick(): void; disabled?: boolean }`

### 4.4 ItineraryForm

- **Purpose**: Display / edit itinerary text.
- **Elements**: if no itinerary → placeholder `div`;
  if itinerary exists:
  • `SuggestedTripLengthDisplay` (read-only badge)
  • `ManualEditSwitch` (Shadcn `Switch`) - Textarea for itenerary is editable only when this is swithed on; default - off.
  • Shadcn `Textarea` for itinerary
- **Events**:
  • Switch `onCheckedChange` – toggles editability.
  • Textarea `onBlur` – fires PUT `/api/itineraries/{id}` when dirty.
- **Validation**:
  • Client: non-empty when saving.
  • Server: map 400 fieldErrors.
- **Types**: `ItineraryFormValues` { itinerary: string }.
- **Props**:
  • `itinerary?: ItineraryDTO`
  • `onUpdate(text: string): Promise<void>`
  • `generationDisabled: boolean`

### 4.5 ResizablePanelGroup

- Wrapper from Shadcn (`ResizablePanelGroup`, `ResizablePanel`, `ResizableHandle`)
- **Props**: none custom – children panels.

### 4.6 GenerationModal

- **Purpose**: Full-screen overlay with spinner and elapsed timer.
- **Elements**: `Dialog` portal, countdown text, cancel disabled.
- **Events**: closed automatically on success/error; timer uses `useElapsedTime` hook.
- **Props**: `{ visible: boolean; error?: string }`

### 4.8 UnsavedPrompt

- **Purpose**: Blocks navigation when NoteForm or ItineraryForm dirty.
- **Implementation**: Custom hook wrapping React Router’s `usePrompt` or `unstable_useBlocker`.

## 5. Types

### 5.1 Backend DTOs (import from `src/types.ts`)

- `TripNoteDTO`, `TripNoteWithItineraryDTO`, `ItineraryDTO` – used directly by data hooks.

### 5.2 View Models / Form Types

```ts
interface TripNoteFormValues {
  destination: string;
  earliestStartDate: string; // YYYY-MM-DD
  latestStartDate: string; // empty = mirrors earliest
  groupSize: number;
  approximateTripLength: number;
  budgetAmount?: number | null;
  currency?: string | null;
  details?: string | null;
}

interface ItineraryFormValues {
  itinerary: string;
}

/** Discriminated union for CTA mode */
type PrimaryActionMode = "save" | "saveAndGenerate";
```

### 5.3 Hook Return Types

```ts
interface UseTripNoteResult {
  data?: TripNoteWithItineraryDTO;
  isLoading: boolean;
  error?: Error;
  save(values: TripNoteFormValues): Promise<void>;
  generate(values: TripNoteFormValues & { id: number }): Promise<void>;
  regenerate(id: number, values: TripNoteFormValues): Promise<void>;
  updateItinerary(itineraryId: number, text: string): Promise<void>;
}
```

## 6. State Management

1. **Server state** – React Query
   • `useTripNoteQuery(id)` – GET `/api/trip-notes/{id}`
   • Mutations: `useSaveNote`, `useGenerate`, `useUpdateItinerary`
   • Invalidate `trip-note` and dashboard list keys appropriately.
2. **Client form state** – `react-hook-form` (RHF) inside NoteForm & ItineraryForm.
3. **UI state** – `useState` in TripNoteDetailPage:
   • `isGenerating` (bool)
   • `generationError` (string | undefined)
   • `isDirty` from RHF via `formState.isDirty`.
4. **Elapsed timer** – custom `useElapsedTime(active: boolean)` returning ms string.
5. **Navigation block** – `useUnsavedPrompt(isDirty)`.

## 7. API Integration

| Purpose            | Method & Path                            | Request Body                            | Response Type              |
| ------------------ | ---------------------------------------- | --------------------------------------- | -------------------------- |
| Fetch note         | GET `/api/trip-notes/{id}`               | –                                       | `TripNoteWithItineraryDTO` |
| Save note (create) | POST `/api/trip-notes`                   | `TripNoteFormValues`                    | `TripNoteDTO`              |
| Save note (update) | PUT `/api/trip-notes/{id}`               | `TripNoteFormValues`                    | `TripNoteWithItineraryDTO` |
| Generate itinerary | POST `/api/trip-notes/generateItenerary` | `{ id: number, ...TripNoteFormValues }` | `TripNoteWithItineraryDTO` |
| Update itinerary   | PUT `/api/itineraries/{id}`              | `ItineraryFormValues`                   | `ItineraryDTO`             |

All calls attach Supabase JWT via middleware; handle `401` by redirecting to `/login`.

## 8. User Interactions

1. **Edit field** → form dirty.
2. **Click Save** → validates → calls save mutation → on success invalidate cache → dirty=false.
3. **Toggle “Generate itinerary” switch** (visible after first save) →
   • ON (default) – PrimaryActionButton acts as “Save & Generate” (POST generate)
   • OFF – PrimaryActionButton acts as “Save” (PUT update only)
4. **Click Save & Generate** → opens GenerationModal; POST generate; on success modal closes, itinerary pane populated.
5. **Toggle Manual Edit** → textarea enabled; on blur PUT update; show toast on success.
6. **Navigate away with dirty** → UnsavedPrompt dialog.

## 9. Conditions and Validation

| Field                   | Rule                                                       | Component                  |
| ----------------------- | ---------------------------------------------------------- | -------------------------- |
| destination             | required, min 2 chars                                      | NoteForm                   |
| dates                   | earliest ≤ latest; if flexible disabled, latest = earliest | NoteForm (DateRangePicker) |
| groupSize               | integer 1–99                                               | NoteForm                   |
| approximateTripLength   | 1–90 days                                                  | NoteForm                   |
| budgetAmount            | positive if provided                                       | NoteForm                   |
| itinerary (manual save) | non-empty string                                           | ItineraryForm              |

Backend rules are enforced again; map `400` `fieldErrors` to corresponding inputs.

## 10. Error Handling

• **HTTP 400** – display inline field errors.
• **HTTP 401** – redirect to `/login?return=/trip-notes/:id`.
• **HTTP 404** – show Error view (note deleted or missing).
• **HTTP 409** (duplicate) – toast explaining duplicate destination/date.
• **Generation failure / timeout** – close modal, show inline error above PrimaryActionButton, switch CTA back to "Generate Plan".
• **Network offline** – banner; disable submit buttons.
• **PUT itinerary conflict** – optimistic UI already updated; on 409 revert text and show toast.

## 11. Implementation Steps

1. **Scaffold Astro route** `src/pages/trip-notes/[id].astro` and mount `<TripNoteDetailPage />` as a React island.
2. **Define view-specific types** (`TripNoteFormValues`, etc.) in `src/types/view/tripNoteDetail.ts`.
3. **Create data hooks** (`useTripNoteQuery`, `useSaveNote`, `useGenerateItinerary`, `useUpdateItinerary`) backed by React Query.
4. **Build NoteForm**: RHF + Zod, include FlexibleDatesSwitch, BudgetAmountInput & CurrencySelect, large DetailsTextarea.
5. **Add GenerateItinerarySwitch** and compute `PrimaryActionMode`.
6. **Build ItineraryForm**: SuggestedTripLengthDisplay, ManualEditSwitch + Textarea.
7. **Compose UI** using Shadcn ResizablePanelGroup.
8. **Implement GenerationModal** with elapsed timer and error handling.
9. **Wire mutations & state** to PrimaryActionButton and switches, ensure optimistic updates and invalidations.
10. **Implement UnsavedPrompt** hook to guard navigation.
11. **Accessibility & UX polish**: labels, keyboard nav, focus trap, responsive layout.
12. **Testing, linting & docs**: RTL tests for hooks/components, run type-check, update `.ai/ui-plan.md`.
