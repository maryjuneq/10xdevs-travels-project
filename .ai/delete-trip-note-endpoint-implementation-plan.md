# API Endpoint Implementation Plan: Delete Trip Note

## 1. Endpoint Overview
Deletes a specific trip note belonging to the authenticated user and, thanks to ON DELETE CASCADE constraints, automatically removes the related itinerary (1-to-1) and any AI-generation jobs (1-to-N).

## 2. Request Details
- HTTP Method: **DELETE**
- URL Structure: `/api/trip-notes/{id}`
- Parameters:
  - **Path – Required**
    - `id` (number, positive integer) – the primary key of the trip note to delete
- Request Body: _none_
- Authentication: Supabase session cookie / Bearer token (standard across the project)

## 3. Used Types
- `TripNoteEntity` – pulled internally (for ownership check) – *no DTO returned*
- `TripNoteIdParamSchema` (new zod schema) – validates `{ id }` path param
- No request/response DTOs needed for the happy path; we return **204 No Content**.

## 4. Response Details
| Status | When | Body |
|--------|------|------|
| 204 No Content | Deletion succeeded | _empty_ |
| 400 Bad Request | `id` param invalid | `{ message: string }` |
| 401 Unauthorized | User not signed in | `{ message: string }` |
| 403 Forbidden | Trip note belongs to different user | `{ message: string }` |
| 404 Not Found | No trip note with given id for this user | `{ message: string }` |
| 500 Internal Error | Database or unexpected error | `{ message: string }` |

## 5. Data Flow
1. Astro runtime invokes handler `export async function DELETE(context)` from `src/pages/api/trip-notes/[id].ts`.
2. Extract `{ id }` from `context.params`; validate with Zod schema.
3. Pull authenticated user via `const { data: { user } } = await context.locals.supabase.auth.getUser();`.
4. If no user → 401.
5. Verify ownership:
   - `const { data, error } = await supabase.from('trip_notes').select('id').eq('id', id).eq('user_id', user.id).maybeSingle();`
   - If `data` null → 404 (not found for this user).
6. Perform deletion:
   - `const { error: deleteError } = await supabase.from('trip_notes').delete().eq('id', id);`
7. ON DELETE CASCADE removes related `itineraries` and `ai_generation_jobs` rows automatically.
8. Return 204.
9. Any caught error → log (console + optionally `src/lib/logger.ts`) and return 500.

## 6. Security Considerations
1. **Authentication** – Require valid Supabase session.
2. **Authorization** – Check that the `trip_notes.user_id` matches `auth.user.id` to prevent horizontal privilege escalation.
3. **Input Validation** – Ensure `id` is an integer > 0, preventing SQL injection by disallowing non-numeric strings; Supabase query builder also parameterises values.
4. **Soft Information Leakage** – Return 404 rather than 403 if the note does not belong to the user, but we choose 403 for explicit forbidden and 404 when note doesn’t exist at all; adjust per product decision.
5. **Rate Limiting & Audit** – Out-of-scope for this implementation but hooks are available via Astro middleware.

## 7. Error Handling
- Use early returns.
- Map Supabase `error.code`:
  - `23503` (foreign-key) won’t occur; cascade.
  - `22P02` (invalid text representation) → 400.
- Log errors via `logger.error` with stack & userId.

## 8. Performance Considerations
- Single primary-key delete – O(1) cost.
- Use `delete().eq('id', id).select()` only if we need RETURNING; here we skip select for speed.
- Ensure relevant DB indices exist (primary key, foreign keys already indexed).

## 9. Implementation Steps
1. **Schema**
   - Create `src/lib/schemas/tripNoteIdParam.schema.ts`:
```ts
import { z } from 'zod';
export const tripNoteIdParamSchema = z.object({ id: z.preprocess(Number, z.number().int().positive()) });
export type TripNoteIdParam = z.infer<typeof tripNoteIdParamSchema>;
```
2. **Service Layer** (`TripNotesService`)
   - Add static `deleteTripNote(id: number, userId: string, supabase: SupabaseClient): Promise<void>`
     1. Verify note exists & belongs to user (single select). Throw specific `NotFoundError` / `ForbiddenError`.
     2. Execute delete query.
3. **Custom Errors** (if not already)
   - Define `NotFoundError`, `ForbiddenError`, `ValidationError` in `src/lib/errors.ts` for consistent mapping.
4. **API Route** `src/pages/api/trip-notes/[id].ts`
   - Add:
```ts
import { tripNoteIdParamSchema } from '../../lib/schemas/tripNoteIdParam.schema';
import { TripNotesService } from '../../lib/services/tripNotes.service';
import { createErrorResponse } from '../../lib/httpHelpers';

export const DELETE = async (context) => {
  const { supabase } = context.locals;
  const { id: idParam } = context.params;
  const parseResult = tripNoteIdParamSchema.safeParse({ id: idParam });
  if (!parseResult.success) return createErrorResponse(400, 'Invalid id');
  const id = parseResult.data.id;

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) return createErrorResponse(401, 'Unauthorized');

  try {
    await TripNotesService.deleteTripNote(id, user.id, supabase);
    return new Response(null, { status: 204 });
  } catch (err) {
    if (err instanceof ForbiddenError) return createErrorResponse(403, err.message);
    if (err instanceof NotFoundError) return createErrorResponse(404, err.message);
    console.error(err);
    return createErrorResponse(500, 'Internal server error');
  }
};
```
5. **Helper** `src/lib/httpHelpers.ts` if not exists – wrapper for error responses.
6. **Unit Tests** (Vitest)
   - Service: delete succeeds, unauthorized delete throws, not found.
   - API Route: 204 happy path, 400 invalid id, 401 unauthenticated, 403 forbidden, 404 not found.
7. **Docs** – Update OpenAPI / README.
8. **Linter & Formatting** – run `pnpm lint && pnpm format`.

