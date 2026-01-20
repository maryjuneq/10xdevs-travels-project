# API Endpoint Implementation Plan: Create Trip Note (`POST /api/trip-notes`)

## 1. Endpoint Overview

Create a new trip note for the authenticated user (handled by Supabase Auth). Returns the created note in camel-cased DTO format.

## 2. Request Details

- HTTP Method: **POST**
- URL: `/api/trip-notes`
- Authentication: Supabase session cookie (handled by `src/middleware/index.ts`).
- Request Body (JSON):
  - Required
    - `destination` (string ≤ 255)
    - `earliestStartDate` (ISO-8601 date)
    - `latestStartDate` (ISO-8601 date, ≥ `earliestStartDate`)
    - `groupSize` (integer > 0)
    - `approximateTripLength` (integer > 0)
  - Optional
    - `budgetAmount` (integer > 0)
    - `currency` (3-letter ISO-4217)
    - `details` (string)
- Example:

```json
{
  "destination": "Tokyo, Japan",
  "earliestStartDate": "2026-03-10",
  "latestStartDate": "2026-03-15",
  "groupSize": 4,
  "approximateTripLength": 7,
  "budgetAmount": 2500,
  "currency": "USD",
  "details": "Cherry blossom season!"
}
```

## 3. Used Types

- `CreateTripNoteCommand` – request DTO (already in `src/types.ts`).
- `TripNoteDTO` – response DTO (already in `src/types.ts`).

Service-layer helper types (no changes needed):

- `TripNoteCommandToInsert`
- `TripNoteEntityToDTO`

## 4. Response Details

| Status                      | When                                                                        | Body                        |
| --------------------------- | --------------------------------------------------------------------------- | --------------------------- |
| `201 Created`               | Successful creation                                                         | `TripNoteDTO`               |
| `400 Bad Request`           | Fails Zod validation                                                        | `{ error: string }`         |
| `401 Unauthorized`          | No valid session                                                            | `{ error: "unauthorized" }` |
| `409 Conflict`              | Unique-constraint violation (`user_id`,`destination`,`earliest_start_date`) | `{ error: string }`         |
| `500 Internal Server Error` | Unhandled errors                                                            | `{ error: string }`         |

## 5. Data Flow

1. Astro route handler (`src/pages/api/trip-notes.post.ts`) receives `Request` & obtains `supabase` and `session` from `Astro.locals`.
2. JSON body → `CreateTripNoteCommand`.
3. Validate with Zod.
4. Pass command to `TripNotesService.createTripNote(command, userId, supabase)`.
5. Service:
   - Transform command → `TablesInsert<'trip_notes'>` via `TripNoteCommandToInsert`.
   - Insert row using Supabase JS RPC.
   - Transform resulting entity → `TripNoteDTO` via `TripNoteEntityToDTO`.
6. Handler returns `201` + DTO.

## 6. Security Considerations

- **Authentication**: Require valid Supabase session; reject otherwise.
- **Authorization**: `user_id` forced from session, not client input.
- **Input sanitisation**: Zod schema enforces lengths, numeric ranges, ISO dates, ISO-4217 currency.
- **Rate limiting**: Consider global middleware; out-of-scope for this task.
- **Error exposure**: Return generic messages for DB errors; log internals server-side.

## 7. Error Handling

- **Validation**: Zod `.safeParse`; on failure respond `400` with flattened error map.
- **DB constraint violations**: Detect `23505` unique violation → `409`.
- **Others**: Log with `console.error` (or future `src/lib/logger`) and return `500`.

## 8. Performance Considerations

- Single insert; negligible latency.
- Use Postgres `RETURNING *` to avoid additional round-trip.
- Keep service stateless.

## 9. Implementation Steps

1. **Types** – confirm existing `CreateTripNoteCommand`, `TripNoteDTO`, helpers.
2. **Service** – `src/lib/services/tripNotes.service.ts`
   ```ts
   import { z } from "zod";
   import { TripNoteCommandSchema } from "../schemas/tripNote.schema";
   export class TripNotesService {
     static async createTripNote(cmd: CreateTripNoteCommand, userId: string, db: SupabaseClient) {
       // transform & insert
     }
   }
   ```
3. **Validation Schema** – `src/lib/schemas/tripNote.schema.ts` using Zod with `.refine` for date order.
4. **Astro API Route** – `src/pages/api/trip-notes.post.ts`
   ```ts
   export const POST: APIRoute = async ({ request, locals }) => {
     /* ... */
   };
   export const prerender = false;
   ```
5. **Middleware** – ensure `supabase` + `session` available (already in place).
6. **Error mapping util** – translate Supabase error codes to HTTP status.
7. **Unit Tests** (Jest/Vitest) for service validation and transformation.
8. **Integration Tests** (supertest) hitting the API route.
9. **Documentation** – update API docs in `.ai/api-plan.md` and Postman collection.
10. **CI Pipeline** – add tests to GitHub Actions.
