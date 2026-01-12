# API Endpoint Implementation Plan: GET /api/trip-notes

## 1. Endpoint Overview
Lists all *trip notes* that belong to the authenticated user.  
The endpoint supports:
* Pagination (page, pageSize)
* Filtering by destination substring and whether an itinerary exists
* Sorting by destination, earliest start date, or creation date (asc/desc)

Returned objects are *light-weight* representations that include an extra `hasItinerary` flag.

---

## 2. Request Details
* **HTTP Method**: `GET`
* **URL**: `/api/trip-notes`
* **Query Parameters**
  | Name | Type | Constraints | Default | Description |
  |------|------|-------------|---------|-------------|
  | `page` | number | ≥ 1 | `1` | Page index (1-based) |
  | `pageSize` | number | 1-100 | `20` | Page size |
  | `destination` | string | any<br>(trimmed) | — | Case-insensitive *contains* filter on destination |
  | `sort` | enum | `destination`\|`earliest_start_date`\|`created_at` + optional `-` prefix | `-created_at` | Sort column (prefix `-` = DESC) |
  | `hasItinerary` | boolean | `true`\|`false` | — | Filter rows that *have / don’t have* an itinerary |

* **Request Body**: *none*
* **Headers**: `Authorization: Bearer <JWT>` (Supabase session)

---

## 3. Used Types
### DTOs
```ts
// src/types.ts (add)
export type TripNoteListItemDTO = {
  id: number;
  destination: string;
  earliestStartDate: string;   // ISO-date
  approximateTripLength: number;
  createdAt: string;           // ISO timestamp
  updatedAt: string;
  hasItinerary: boolean;
};
```

### Queries
Extend existing type and add missing flag:
```ts
export type TripNotesListQuery = {
  page?: number;
  pageSize?: number;
  destination?: string;
  startFrom?: string;
  startTo?: string;
  sort?: 'destination' | 'earliest_start_date' | 'created_at' | '-destination' | '-earliest_start_date' | '-created_at';
  hasItinerary?: boolean;
};
```

`PaginatedResponse<TripNoteListItemDTO>` already exists and will be used as the envelope.

---

## 4. Response Details
* **Status Codes**
  * `200 OK` – success
  * `400 Bad Request` – invalid query
  * `401 Unauthorized` – no/invalid session
  * `500 Internal Server Error` – unexpected failure

* **Successful Payload** (wrapper):
```json
{
  "data": [
    {
      "id": 42,
      "destination": "Tokyo, Japan",
      "earliestStartDate": "2026-03-10",
      "approximateTripLength": 7,
      "createdAt": "2026-01-06T10:43:17Z",
      "updatedAt": "2026-01-06T10:43:17Z",
      "hasItinerary": true
    }
  ],
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
}
```

(If the UI prefers the bare array, adjust in the controller; the service returns envelope.)

---

## 5. Data Flow
1. **Astro route** (`src/pages/api/trip-notes.ts` – `GET`):
   * Extract & validate query params (Zod schema).
   * Retrieve `userId` from `locals.supabase.auth.getUser()` (temporary fallback to `DEFAULT_USER_ID`).
   * Call `TripNotesService.listTripNotes(query, userId, supabase)`.
   * Serialize result → `Response` 200 JSON.
2. **Service Layer** (`TripNotesService`):
   * Build Supabase query with filters, sort, pagination.
   * `select('id,destination,earliest_start_date,approximate_trip_length,created_at,updated_at,itineraries(id)')`.
   * `eq('user_id', userId)` to enforce ownership.
   * Apply destination `ilike` `'%search%'`.
   * `hasItinerary` → `.isNotNull('itineraries.id')` or `.is('itineraries.id', null)`.
   * Sorting: parse column & asc/desc.
   * Pagination: `range(offset, offset + pageSize - 1)` & request `count: 'exact'`.
   * Map each row to `TripNoteListItemDTO` with `hasItinerary = !!row.itineraries`.
   * Return `PaginatedResponse`.
3. **Database**: single query against `trip_notes` LEFT JOIN `itineraries`.

---

## 6. Security Considerations
* **Authentication** – Require valid Supabase session; reject otherwise (`401`).
* **Authorization** – Always filter by `user_id = session.user.id` to prevent IDOR.
* **Input Validation** – Zod schema ensures numeric ranges, enum values, and ISO-date format.
* **SQL Injection** – Using Supabase query builder eliminates string concatenation; validated enums for `sort`.
* **DoS / Abuse** – Enforce `pageSize ≤ 100`.
* **Information Leakage** – Do not expose `user_id` or itinerary text.
* **CORS** – Rely on Astro default / server config.

---

## 7. Error Handling
| Scenario | HTTP | Message |
|----------|------|---------|
| Missing/invalid JWT | 401 | `unauthorized` |
| Validation failure | 400 | `Validation failed`, Zod details |
| Page/pageSize out of bounds | 400 | `pageSize must be 1-100` etc. |
| DB connection or unexpected error | 500 | `An error occurred while fetching trip notes` (logged) |

Use a helper similar to `mapDatabaseError` already present for POST route.

---

## 8. Performance Considerations
* **Indexing** – Ensure index on `(user_id, destination)` and `(user_id, earliest_start_date)` for filter/sort; Supabase/Postgres likely already has PK on `id`.
* **COUNT Optimization** – Supabase exact count is O(n); acceptable for ≤100 rows per user. If list grows, consider `count: 'planned'`.
* **N+1** – Join on `itineraries` avoids separate queries.
* **Response Size** – Limit fields to lightweight DTO.

---

## 9. Implementation Steps
1. **Types**
   1.1 Add `TripNoteListItemDTO` & extend `TripNotesListQuery` in `src/types.ts`.
2. **Validation Schema**
   2.1 Create `src/lib/schemas/tripNotesListQuery.schema.ts` using Zod: parse/coerce query params, enforce constraints, default values.
3. **Service Layer**
   3.1 Add static `listTripNotes` method to `TripNotesService` as described in Data Flow.
4. **API Route**
   4.1 Update `src/pages/api/trip-notes.ts`:
   * export `GET` handler.
   * Parse `url.searchParams` → object → validate.
   * On success call service; on failure return 400.
5. **Error Mapping**
   5.1 Re-use/extend `mapDatabaseError` for list route (no unique-constraint cases expected).
6. **Testing**
   6.1 Unit tests for Zod schema (valid/invalid cases).  
   6.2 Service method integration test with Supabase test instance.
   6.3 E2E route test via supertest / fetch.
7. **Docs**
   7.1 Add endpoint description to API docs.
   7.2 Update README if pagination envelope differs from example.
8. **Future Enhancements** (optional)
   * Support full-text search on destination.
   * Cache frequent queries (Redis) if needed.

---

> After implementation, reference the *Trip Notes List* component in the UI to ensure it aligns with the new response structure.
