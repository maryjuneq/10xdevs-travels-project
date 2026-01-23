# View Implementation Plan – Manage Preferences (Inline Editing)

> **Update 2026-01-23** – Per latest requirement, creation and editing occur inline on the tile itself; no modal form is used. This document supersedes the previous version.

## 1. Overview
The Manage Preferences view lets an authenticated user create, edit-inline, and delete travel preferences that the AI itinerary generator will later consume. The UI displays a responsive, keyboard-navigable grid of tiles. Clicking the _Add_ tile instantly inserts a blank preference tile in **edit mode**. Clicking any existing tile also switches it to edit mode. Changes are saved by clicking a green ✅ tick button (or pressing Enter) or discarded with an ❌ cancel button (or Esc). Each tile contains a trash icon that opens a confirmation modal on click and on confirmation the preference is deleted.

## 2. View Routing
* **Astro page path**: `/preferences.astro`
* **Navigation entry**: Dashboard → “Manage Preferences”.
* **Access control**: guarded by existing `authGuard` middleware – redirects to `/login` if no session.

## 3. Component Structure
```
PreferencesPage (Astro)
│
└── <PreferencesGrid /> (React)
     ├── <PreferenceTile />  * n  ← handles both display & edit modes
     ├── <AddPreferenceCard />
     └── <ConfirmationDialog />   (portal, reusable)
```

## 4. Component Details
### 4.1 `PreferencesGrid`
* **Purpose**: Fetches preferences, renders grid, provides CRUD via custom hook, manages which tile is currently in edit mode.
* **Elements**: `<div className="grid grid-cols-2 md:grid-cols-4 gap-4">`; conditional empty-state section.
* **Events**
  - `onAdd` from `AddPreferenceCard` → creates temp tile in edit mode.
  - `onEdit(id)` from `PreferenceTile` when clicked.
  - `onSave(id, values)` → create or update via hook.
  - `onDelete(id)` → opens confirmation dialog then calls hook.
  - Keyboard arrow navigation; Delete key triggers delete; Enter while focused triggers edit mode.
* **Validation**: none (delegated to tile).

### 4.2 `PreferenceTile`
* **Purpose**: Displays a preference in view mode OR renders inline form in edit mode.
* **Modes**
  1. **View mode** – shows category icon + text + transparent trash icon overlay (visible on hover/focus).
  2. **Edit mode** – replaces text with `<textarea>` (auto-grow 3–200 chars) and category `<select>`; shows ✅ _Save_ and ❌ _Cancel_ buttons.
* **Elements**: Root `<div tabIndex={0}>` with Tailwind card styles; internal conditional form fields.
* **Events**
  - `onSave(values)` – validates locally then passes to grid.
  - `onCancel()` – reverts if new empty tile else returns to view mode.
  - `onDelete()` – from trash icon.
* **Validation**
  - `preferenceText.length` 3-200.
  - Category must be valid enum; default `other`.
  - Invalid → disable ✅ and show inline message.
* **Props**
```ts
interface PreferenceTileProps {
  preference: PreferenceVM;
  isEditing: boolean;
  onEnterEdit: () => void;
  onSave: (values: PreferenceFormValues) => void;
  onCancel: () => void;
  onDelete: () => void;
}
```

### 4.3 `AddPreferenceCard`
* **Purpose**: Visual placeholder tile with “+” icon; on click, triggers grid to add a new temp preference (id: `"temp-<uuid>"`).
* **Elements**: `<button className="flex flex-col items-center justify-center ...">` plus icon.
* **Events**: `onAdd()`.
* **Props**: `{ onAdd: () => void }`.

### 4.4 `ConfirmationDialog`
* Unchanged from previous version – confirms deletion.

## 5. Types
```ts
import { PreferenceCategory } from "@/types";

export interface PreferenceVM {
  id: number | string;          // temp ids can be string UUID
  category: PreferenceCategory;
  preferenceText: string;
  isNew?: boolean;              // indicates unsaved tile
  isSaving?: boolean;           // optimistic flag
}

export interface PreferenceFormValues {
  category: PreferenceCategory;
  preferenceText: string;
}
```

## 6. State Management
* **`usePreferences` hook** (same file path):
  - Holds `preferences: PreferenceVM[]`.
  - Methods: `create`, `update`, `remove`.
  - Support temp optimistic record on create: push with temp id, replace with server id on success; rollback on failure.
* **`editingId`** state in `PreferencesGrid` (string | number | null).
* **Focus management**: Ref map keyed by tile id for arrow navigation.

## 7. API Integration
Same endpoints as before. Request bodies come from inline form values.

## 8. User Interactions
| # | Interaction | Flow |
|---|-------------|------|
| 1 | Page load | GET preferences → render; spinner while loading |
| 2 | Click “+” | Grid pushes temp tile, sets editingId; focus textarea |
| 3 | Edit values & Save ✅ | Validate; POST /api/preferences, optimistic UI; on success replace temp |
| 4 | Cancel ❌ on new tile | Remove temp tile; focus Add card |
| 5 | Click existing tile | Switch to edit mode; focus textarea |
| 6 | Save edit ✅ | PUT /api/preferences/{id} optimistic update |
| 7 | Cancel edit ❌ | Revert to original data |
| 8 | Click Trash | Open confirm; on confirm DELETE endpoint; remove tile |
| 9 | Keyboard arrow keys | Move focus across grid items |
|10 | Delete key | If tile focused, open confirm |

## 9. Conditions & Validation
Same rules but now inside tile; ✅ disabled until valid.

## 10. Error Handling
* `isSaving` flag shows inline spinner overlay within tile during network op.
* On failure, revert changes and show toast (Shadcn).
* Temp tile creation error → remove tile, keep toast.
* Unauthorized → redirect to login.

## 11. Implementation Steps
1. Update previous scaffold; remove `PreferenceFormModal` import.
2. Implement `PreferenceTile` with `isEditing` prop and internal controlled form.
3. Enhance `usePreferences` hook to support temp optimistic tiles.
4. Refactor grid interactions (editingId, focus).
5. Adjust tests: simulate inline editing flows.
6. Update docs and commit.
