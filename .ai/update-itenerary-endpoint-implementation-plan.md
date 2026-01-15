# API Endpoint Implementation Plan: Update Itinerary

## 1. Endpoint Overview
Updates the full text of an existing itinerary and flags it as manually edited. Allows users to overwrite an AI-generated itinerary with their own content.

## 2. Request Details
- HTTP Method: **PUT**
- URL Structure: `/api/itineraries/{id}`
  - `id` (path param, required, integer): primary key of the itinerary record to update.
- Parameters
  - Required Path: `id`
- Request Body (JSON, validated with Zod)
  ```json
  {
    "itinerary": "Day 1: … Day 2: …",
    "manuallyEdited": true
  }
  ```
  - `itinerary` (string, required, min 10 chars, max ~20 000 chars)
  - `manuallyEdited` (boolean, required, must be `true` – ensures the flag is intentionally set)

## 3. Used Types
- `UpdateItineraryCommand` (extend existing type to include `manuallyEdited`)
- `ItineraryDTO` (response)

## 4. Response Details
- Success (200)
  ```json
  {
    "id": 17,
    "tripNoteId": 42,
    "suggestedTripLength": 7,
    "itinerary": "Day 1: …",
    "manuallyEdited": true,
    "createdAt": "2026-01-06T11:02:55Z",
    "updatedAt": "2026-01-06T11:04:12Z"
  }
  ```
- Error status codes
  - 400 Invalid input (Zod)
  - 401 Unauthenticated (no session)
  - 403 Forbidden (user is not owner)
  - 404 Not found (itinerary id does not exist)
  - 500 Server error

## 5. Data Flow
1. Client sends PUT with JSON body and auth cookie/JWT.
2. Astro API route obtains `supabase` from `context.locals` and validates session.
3. Parse `id` from URL → number; validate body with Zod → `UpdateItineraryCommand`.
4. Fetch itinerary by `id` to verify existence and ownership (`user_id === session.user.id`).
5. Call `ItinerariesService.update(id, command.itinerary, command.manuallyEdited, supabase)`.
6. Transform entity → `ItineraryDTO` (already in service) and return 200.

## 6. Security Considerations
- **Authentication**: require valid Supabase session; else 401.
- **Authorization**: cross-check `user_id`; if mismatch return 403.
- **Input Validation**: strict Zod schema (length limits, boolean true).
- **SQL Injection**: supabase query builders parameterize automatically.
- **Rate limiting**: rely on global middleware (out of scope but note).

## 7. Error Handling
| Scenario | Status | Message |
|-----------|--------|---------|
| Missing/invalid body | 400 | `"Invalid request payload"` |
| Not signed in | 401 | `"Authentication required"` |
| Itinerary not found | 404 | `"Itinerary not found"` |
| Not owner | 403 | `"Forbidden"` |
| DB failure | 500 | `"Failed to update itinerary"` |

Errors are logged with `console.error` (existing pattern) and wrapped in custom error classes in `src/lib/errors`.

## 8. Performance Considerations
- Single‐row update with `RETURNING` → negligible latency.
- Use `.select().single()` to avoid transferring large unnecessary data.
- JSON body size limited via Zod to prevent oversized payloads.

## 9. Implementation Steps
1. **Types**  
   - Extend `UpdateItineraryCommand` in `src/types.ts` to include `manuallyEdited: boolean`.
2. **Validation Schema**  
   - Create `src/lib/schemas/updateItinerary.schema.ts` exporting Zod schema that parses body → `UpdateItineraryCommand`.
3. **API Route**  
   - Add file `src/pages/api/itineraries/[id].ts`.
   - Export `PUT` handler:
     1. Get `supabase` and `user` from `context.locals`.
     2. Guard: if no user → 401.
     3. Parse `id` from `params` → number, else 400.
     4. `schema.safeParse(body)`; on failure → 400.
     5. Fetch itinerary row (`supabase.from('itineraries').select('user_id').eq('id', id).single()`):
        - if not found → 404.
        - if `user_id !== session.user.id` → 403.
     6. Call `ItinerariesService.update`.
     7. Return 200 with DTO.
4. **Service Enhancement**  
   - Ensure `ItinerariesService.update` already handles `manuallyEdited` flag (it does). No change needed.
5. **Error Utilities**  
   - Confirm `src/lib/errors.ts` contains `BadRequestError`, `UnauthorizedError`, `ForbiddenError`, `NotFoundError`; create if missing.
6. **Tests** (optional but recommended)  
   - Unit test schema validation.
   - Integration test successful update and each error path.
7. **Docs**  
   - Update API documentation to include new endpoint behaviour.

