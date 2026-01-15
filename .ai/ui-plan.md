# UI Architecture for VibeTravels

## 1. UI Structure Overview

VibeTravels is a desktop-focused single-page application (SPA) built with Astro 5, React 19, Tailwind CSS 4, and Shadcn/ui. Routing is handled by Astro’s file-based system with React islands for dynamic regions. React Query manages server state and caching, while React Context holds lightweight UI state (e.g., unsaved edits). The application is divided into three core domains that align with backend resources and user goals:

1. Trip Notes
2. Itinerary Generation
3. User Preferences

Supporting domains include Authentication (Supabase) and Account Management. Each domain maps to one or more views that together satisfy every functional requirement in the PRD and expose the API endpoints defined in the API Plan.

## 2. View List

| # | View Name | Path | Main Purpose | Key Information / Components | UX / A11y / Security Notes |
|---|-----------|------|--------------|-----------------------------|---------------------------|
| 1 | Dashboard | `/` | Provide an overview of all Trip Notes and quick access to core actions. | • NoteTable (destination, earliest date, length, badge if itinerary exists)  
• Sort & filter bar (destination, date range, itinerary-only toggle)  
• Primary CTA buttons: “Add Note”, “Manage Preferences” | • Keyboard-navigable table rows  
• `aria-label` on itinerary badge  
• Data fetched via `GET /api/trip-notes` with React Query; page & filter params mirror URL search params. |
| 2 | Trip Note Detail | `/trip-notes/:id` | Enable creating, viewing, and editing a Trip Note and its generated itinerary in a two-pane layout. | • ResizablePanelGroup with NoteForm (left) and ItineraryForm (right)  
• Primary Action Button (Save / Generate / Save & Regenerate)  
• Switch for manual edit on generated itenerary (visible only when itenerary exists) 
• GenerationModal overlay (timer, progress)  
• DeleteNoteButton with confirmation | • Split-pane fully keyboard draggable via Shadcn accessibility hooks  
• Form inputs use `label` & error messages mapped from `400` responses  
• GET `/api/trip-notes/{id}`; POST `/api/trip-notes/generateItenerary`; PUT `api/iteneraries/{id}`
• UnsavedPrompt on internal navigation. |
| 3 | Add Trip Note | `/trip-notes/new` (shares componentry with Detail) | Create a new Trip Note. | • Empty NoteForm  
• Disabled right-pane placeholder (“No itinerary yet”) | • Destination field initially editable; other rules identical to View 2. |
| 4 | Preferences | `/preferences` | CRUD for user travel preferences. | • TileGrid listing PreferenceTile (category icon + text)  
• AddPreferenceCard (“+”) opens modal form  
• TrashIcon deletes with confirmation | • Grid is keyboard navigable (arrow keys)  
• Uses `/api/preferences` endpoints with optimistic updates. |
| 5 | Login | `/login` | Authenticate returning users. | • Email, password fields  
• Supabase Auth call  
• ErrorAlert on failure | • After login redirect to originally intended route  
• Rate-limit messaging on 429. |
| 6 | Register | `/register` | Create a new account. | • Email, password, confirm  
• T&C checkbox | • Follows Supabase password policy; field-level validation with inline errors. |
| 7 | Account Deletion | `/account/delete` or modal from Settings | Allow users to permanently delete their account and data. | • Danger zone card with “Delete Account” button  
• Confirmation dialog requiring email re-entry | • Calls `DELETE /api/auth/account`  
• Ensures CSRF via Supabase JWT; redirects to `/goodbye`. |
| 8 | Generation Modal (overlay) | N/A (portal) | Show real-time status while the itinerary is being generated. | • Spinner, elapsed timer, cancel disabled  
• Auto-close on success; show error on failure | • Traps focus; escape key disabled  
• 60 s max timeout aligned with SLA  
• Cancels background requests if closed due to error. |
| 9 | Error / Not Found | `*` | Gracefully handle unknown routes and API errors. | • ErrorMessage with guidance  
• “Back to Dashboard” link | • Shown on 404s from router or API. |

## 3. User Journey Map

### Primary Flow – From Idea to Itinerary

1. **Landing on Dashboard** (`/`) – user sees existing Trip Notes.  
2. **Add Note** – clicks “Add Note” → **Add Trip Note** (`/trip-notes/new`).  
3. **Create Note** – fills in destination, dates, etc. → clicks “Save Note”.  
   • Backend `POST /api/trip-notes` returns new ID; React Query cache invalidated.  
4. **Return to Note Detail** (`/trip-notes/:id`) – left pane editable, right pane placeholder. Primary button now “Generate Plan”.  
5. **Generate Itinerary** – click triggers GenerationModal; UI locked.  
   • POST `/api/trip-notes/generateItenerary`  
6. **View Itinerary** – on success modal closes, right pane populated with read-only itinerary; primary button becomes “Save & Regenerate”.  The switch appears over itenerary panel "Manual edit". 
**Edit Itenerary** - If users swiches manual edit switch, itenerary becomes editable. When users edits the itenerary text details, on blur it saves changes by calling `PUT api/iteneraries/{id}`.
7. **Navigate Back** – back arrow or breadcrumb → Dashboard shows badge on edited note.  
8. **Manage Preferences** (optional) – Dashboard “Manage Preferences” → Preferences grid; creates/deletes tiles.  
9. **Account Settings** (optional) – User menu → Delete Account confirmation.

### Alternate / Error Paths

• Validation errors show inline under fields with focus-jump for screen readers.  
• Generation failure closes modal and shows inline message; primary button resets to “Generate Plan” for retry.  
• Unsaved edits prompt on route change.

## 4. Layout and Navigation Structure

• **Top Navigation Bar** – Logo (Dashboard), optional user menu (Login/Logout, Account).  
• **Sidebar** – not needed for MVP (simple flow).  
• **Breadcrumbs** – appear on Note Detail (`Dashboard / Destination`).  
• **Routing** – Astro file routes with React islands:  
  - `/index.astro` – Dashboard  
  - `/trip-notes/[id].astro` – wraps Trip Note React island  
  - `/preferences.astro`  
  - Auth pages under `/auth/*.astro`  
• **Modal Portals** – GenerationModal and confirmation dialogs rendered to `#modal-root` outside stacking context.

Navigation interactions adhere to SPA rules: client-side link elements (`<a>` with `aria-current`) and React Router’s `useNavigate` for programmatic transitions. UnsavedPrompt uses React Router’s unstable `useBlocker` + custom dialog.

## 5. Key Components

| Component | Description | Reuse Locations |
|-----------|-------------|-----------------|
| **NoteTable** | Paginated, sortable table of Trip Notes. | Dashboard |
| **NoteCard / Row** | Presents destination, date, badge. | NoteTable |
| **ItineraryBadge** | Green checkmark with `aria-label="has itinerary"`. | Note rows |
| **NoteForm** | Controlled form with destination, dates(“Flexible dates?” checkbox shows both earliest & latest pickers; if unchecked, latest date auto-mirrors earliest.), group size, budget, details. | Add & Detail views |
| **PrimaryActionButton** | Context-aware CTA (Save / Generate / Save & Regenerate). | Note Detail |
| **IteneraryForm** | Controlled form “Manual edit” switch; if switched on, itenerary text becomes editable and is automatically saved on loosing focus. | |
| **ResizablePanelGroup** | Shadcn/ui wrapper providing accessible split-pane. | Note Detail |
| **GenerationModal** | Full-screen overlay displaying spinner and elapsed timer. | Note Detail (portal) |
| **DateRangePicker** | `react-day-picker` based component supporting flexible vs fixed dates. | NoteForm |
| **PreferenceTile** | Card showing category icon + text; deletable. | Preferences |
| **AddPreferenceCard** | Last tile with “+” icon to open modal. | Preferences |
| **ConfirmationDialog** | Re-usable yes/no or text-entry confirmation. | Delete note, delete preference, delete account |
| **UnsavedPrompt** | Blocks navigation when dirty forms exist. | Note Detail |

---

### Edge Cases & Error Handling Summary

1. API `400` – map Zod validation messages to field errors.
2. API `401` – redirect to Login with return URL.
3. API `404` – show Error view (note not found or deleted).
4. API `429` – show toast advising retry after cooldown.
5. Generation timeout (> 60 s) – modal shows error and allows retry.
6. Network offline – React Query offline status banner; disable mutations.

### Requirements & User Story Mapping

| PRD User Story | UI Element(s) / View | Notes |
|----------------|----------------------|-------|
| US-001, US-002 | Login & Register views | Supabase Auth forms |
| US-003 – US-006 | Dashboard, Add & Detail views, ConfirmationDialog | Full CRUD paths |
| US-007 | Preferences view | Tile grid CRUD |
| US-008 | PrimaryActionButton + GenerationModal | 60 s SLA feedback |
| US-009 | Error toast + retry path | Modal closes on error |
| US-010 | Editable itinerary |  |
| US-011 | Account Deletion view / dialog | Cascade deletion confirmation |
| US-013 | Middleware + React Query hooks | All protected routes check JWT |

Every functional requirement is backed by at least one view and component, ensuring tight coupling between the UI and API capabilities while keeping future extensibility in mind.

