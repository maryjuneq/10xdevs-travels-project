# API Endpoint Implementation Plan: PUT `/api/trip-notes/{id}`

## 1. Endpoint Overview
Updates an existing Trip Note with the payload supplied by the client (full update, **PUT semantics**).  
Returns the updated Trip Note, optionally embedded with its current Itinerary.

## 2. Request Details
- **HTTP Method:** PUT  
- **URL Pattern:** `/api/trip-notes/{id}`  
- **Path Parameter**
  - `id` (number, required) — primary key of the Trip Note to update  
- **Request Body** – JSON matching **`UpdateTripNoteCommand`**
  - Required:   
    - `earliestStartDate` (ISO date string)  
    - `latestStartDate` (ISO date string, must be ≥ `earliestStartDate`)  
    - `groupSize` (number > 0)  
    - `approximateTripLength` (number > 0)  
  - Optional:  
    - `budgetAmount` (number > 0 | null)  
    - `currency` (ISO 4217 3-letter code | null, required if `budgetAmount` present)  
    - `details` (string | null, max 10 000 chars)

**note**: destination cannot be updated by this endpoint. 

## 3. Used Types
- `UpdateTripNoteCommand` (request payload)
- `TripNoteWithItineraryDTO` (success response)
  - `TripNoteDTO`
  - `LightItineraryDTO`

## 4. Response Details
| Status | When | Body |
|--------|------|------|
| **200** | Update succeeded | `TripNoteWithItineraryDTO` |
| **400** | Invalid `id` path param or body validation failed | `{ error: "message" }` |
| **401** | No Supabase session | — |
| **403** | Trip Note does not belong to authenticated user | `{ error: "message" }` |
| **404** | Trip Note `id` not found | `{ error: "message" }` |
| **409** | Unique-constraint violation (destination + date) | `{ error: "message" }` |
| **500** | Unhandled server error | `{ error: "message" }` |

## 5. Data Flow
1. **Astro Server Endpoint** (`src/pages/api/trip-notes/[id].ts`):  
   a. Parse `id` from route.  
   b. Parse & validate body with Zod.  
   c. Retrieve `supabase` & session from `context.locals`.  
2. **Authorization guard**: reject if no session (401).  
3. **TripNotesService.update(id, cmd, userId)**  
   - Fetch note where `id` AND `user_id` = session.user.id.  
   - If none: return `null` for 404 or throw `ForbiddenError` for unauthorized.  
   - Map `UpdateTripNoteCommand` → `TablesUpdate<'trip_notes'>`.  
   - Execute update (single query, triggers handle `updated_at`).  
   - Select updated row plus left join `itineraries` (single round-trip).  
   - Transform to `TripNoteWithItineraryDTO`.  
4. Return DTO JSON with 200.  
5. Catch & map errors ⇢ handler ⇒ proper status code + log.

## 6. Security Considerations
- **Authentication**: required via Supabase session.
- **Authorization**: ensure `user_id` ownership before update.
- **Input Validation**: Zod schemas (type, range, enum, date ordering).
- **SQL Injection**: prevented by Supabase query builder.
- **Over-posting**: only mapped, whitelisted columns are persisted.
- **Rate Limiting** (future): middleware using Supabase RLS or KV cache.
- **Error Leakage**: return generic messages to client; detailed logs server-side.

## 7. Error Handling
| Scenario | Detection | Response | Log |
|----------|-----------|----------|-----|
| Path `id` not integer | `Number.isNaN` | 400 | warn |
| Body invalid | Zod error | 400 + aggregated issues | info |
| Not authenticated | `session == null` | 401 | info |
| Not owner | query returns 0 rows but id exists for another user | 403 | warn |
| No record | no rows & no foreign owner | 404 | info |
| Unique violation | Postgres error `23505` | 409 | warn |
| DB/network failure | catch-all | 500 | error (stack) |

Errors are logged via `logger` (pino/winston) with correlation id; no dedicated table required.

## 8. Performance Considerations
- Single round-trip: update & select in one query using Postgres `UPDATE … RETURNING *`.
- Column indexes (`user_id`, `destination`, `earliest_start_date`) already exist per DB-plan.
- Response payload is small (< 5 KB). No further optimization needed.
- Consider ETag header for conditional GET on subsequent reads (future work).

## 9. Implementation Steps
1. **Define Zod schema** `updateTripNoteSchema` in `src/lib/validation/tripNotes.ts`.  
2. **Create / Extend Service**  
   - File: `src/lib/services/tripNotes.service.ts`  
   - Add `updateTripNote(id, cmd, userId)` implementing step 5 Data Flow above.  
3. **Endpoint File**  
   - Path: `src/pages/api/trip-notes/[id].ts`  
   - Export `PUT` handler:  
     - Parse `id` from `Astro.params`.  
     - Validate body.  
     - Get `supabase` & `session`.  
     - Call service.  
     - Serialize DTO (`application/json`).  
4. **Middleware** ensures JSON `Content-Type` and attaches correlation id to `locals`.  
5. **Unit Tests** (`vitest`):  
   - Validation edge cases.  
   - Service happy path & authorization failure (mock Supabase).  
6. **Integration Tests** (`supertest` against dev server).  
7. **Update API docs** in `.ai/api-plan.md` and openAPI spec if present.  
8. **Run linter & type-check**, fix issues.  
9. **Commit**: `"feat(api): full update Trip Note endpoint"`.

