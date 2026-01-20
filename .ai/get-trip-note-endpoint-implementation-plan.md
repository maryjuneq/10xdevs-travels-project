# API Endpoint Implementation Plan: GET /api/trip-notes/{id}

## 1. Endpoint Overview

Fetch a single trip note owned by the authenticated user. If an itinerary exists for that note, embed it in the response. Used by the Trip Note Details page.

## 2. Request Details

- **HTTP Method:** GET
- **URL Pattern:** `/api/trip-notes/{id}`
- **Path Parameters:**
  - `id` (number, required) – Primary key of the `trip_notes` record.
- **Headers:**
  - `Authorization: Bearer <access_token>` – Supabase JWT.
- **Query Parameters:** none
- **Request Body:** none

## 3. Used Types

| Purpose            | Type                                      |
| ------------------ | ----------------------------------------- |
| Response base      | `TripNoteDTO`                             |
| Embedded object    | `ItineraryDTO`                            |
| Composite response | `TripNoteWithItineraryDTO` _(new helper)_ |

```ts
// src/types.ts (or co‐located in route file)
export type TripNoteWithItineraryDTO = TripNoteDTO & {
  itinerary: ItineraryDTO | null;
};
```

## 4. Response Details

| Status | Meaning                            | Payload                              |
| ------ | ---------------------------------- | ------------------------------------ |
| 200    | Success                            | `TripNoteWithItineraryDTO`           |
| 400    | Invalid `id` param                 | `{ error: 'Invalid id' }`            |
| 401    | No/invalid session                 | `{ error: 'Unauthorized' }`          |
| 404    | Note not found / not owned by user | `{ error: 'Not found' }`             |
| 500    | Unexpected error                   | `{ error: 'Internal server error' }` |

## 5. Data Flow

1. Astro API route `src/pages/api/trip-notes/[id].ts` handles the request.
2. Retrieve `supabase` and `session` from `Astro.locals` (middleware injects them).
3. Validate `id` using Zod schema `z.number().int().positive()`.
4. Call `TripNotesService.getOneWithItinerary(userId, id)` which:
   - Executes a single `LEFT JOIN` query to fetch note + optional itinerary.
   - Returns `null` if no row.
5. Transform DB row(s) → DTOs with existing mappers.
6. Compose `TripNoteWithItineraryDTO` and `return new Response(JSON.stringify(...), { status: 200 })`.
7. Catch service/DB errors: log + return 500.

## 6. Security Considerations

- **Authentication:** Require Supabase JWT; reject otherwise.
- **Authorization:** SQL `WHERE tn.user_id = :userId` to enforce ownership.
- **Validation:** Zod sanitises `id` to integer > 0 (prevents injection / overflow).
- **Least-privilege:** Only select needed columns.
- **Future:** Add middleware-level rate limiting.

## 7. Error Handling

Use custom `ApiError` class carrying `status` & `message`.
| Scenario | Status | Notes |
|----------|--------|-------|
| Non-numeric / ≤0 `id` | 400 | Validation error |
| Missing session | 401 | `session` is null |
| Row not found | 404 | Service returns `null` |
| Supabase error | 500 | `error.code`, include request id in logs |

Errors are logged to console and (optionally) `error_logs` table.

## 8. Performance Considerations

- Single DB round-trip using `LEFT JOIN` vs two queries.
- Ensure composite index `(user_id, id)` exists (PK covers `id`; add partial if needed).
- Return lightweight DTO (omit large itinerary text when `itinerary` is null).
- No caching—data is user-scoped & frequently updated.

## 9. Implementation Steps

1. **Schema**: Add `tripNoteIdParamSchema` in `src/lib/schemas/tripNoteIdParam.schema.ts`.
2. **Service** (`src/lib/services/tripNotes.service.ts`):
   ```ts
   export async function getOneWithItinerary(userId: string, id: number): Promise<TripNoteWithItineraryDTO | null> {
     const { data, error } = await supabase // injected client
       .from("trip_notes as tn")
       .select(
         `
         id, destination, earliest_start_date, latest_start_date,
         group_size, approximate_trip_length, budget_amount,
         currency, details, created_at, updated_at,
         itinerary:itineraries(id, suggested_trip_length, itinerary, created_at, updated_at)
       `
       )
       .eq("tn.id", id)
       .eq("tn.user_id", userId)
       .single();
     // transform & return
   }
   ```
3. **API Route** `src/pages/api/trip-notes/[id].ts`:
   - Parse `params.id` with Zod.
   - Verify `locals.session`.
   - Call service; map errors to `ApiError`.
4. **Error Utility** `src/lib/errors/apiError.ts` (create if not present).
5. **Unit Tests** for service (mock Supabase client).
6. **Integration Tests** for route (happy path, 400, 401, 404).
7. **Docs**: Update `.ai/api-plan.md` + any OpenAPI spec.
8. **Review & merge** – ensure ESLint passes, add JSDoc where missing.
