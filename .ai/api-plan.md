# REST API Plan

## 1. Resources
| Resource | DB Table | Description |
|----------|----------|-------------|
| `trip_notes` | `trip_notes` | User-authored notes describing an upcoming trip idea. |
| `itineraries` | `itineraries` | AI-generated travel plans linked 1-to-1 with a `trip_note`. |
| `ai_generation_jobs` | `ai_generation_jobs` | Store statistics data on itenerary generation jobs. For admin use. |
| `user_preferences` | `user_preferences` | Personal travel preferences used to shape itinerary generation. |
| `auth` | Supabase `auth.users` | Managed by Supabase Auth for registration, login, and account deletion. |

*All endpoints are mounted under `/api` and protected by Supabase JWT-based session middleware unless explicitly stated as public (e.g., `POST /api/auth/login`).*

---

## 2. Endpoints

### 2.2 Trip Notes
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/trip-notes` | List notes for authenticated user. Supports pagination, filtering & sorting. |
| `POST` | `/api/trip-notes` | Create a new trip note. |
| `GET` | `/api/trip-notes/{id}` | Fetch a single note. |
| `PUT` | `/api/trip-notes/{id}` | Replace a note in full. |
| `DELETE` | `/api/trip-notes/{id}` | Delete a note (cascades itinerary & jobs). |

**Query Parameters (List)**
- `page` ≧ 1 (default 1)
- `pageSize` 1-100 (default 20)
- `destination` → case-insensitive substring filter
- `startFrom`, `startTo` → filter by `earliest_start_date`
- `sort` → `destination|earliest_start_date|created_at` (prefix `-` for desc)

**Request Payload (`POST` / `PUT`)**
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

**Response Payload (single)**
```json
{
  "id": 42,
  "destination": "Tokyo, Japan",
  "earliestStartDate": "2026-03-10",
  "latestStartDate": "2026-03-15",
  "groupSize": 4,
  "approximateTripLength": 7,
  "budgetAmount": 2500,
  "currency": "USD",
  "details": "Cherry blossom season!",
  "createdAt": "2026-01-06T10:43:17Z",
  "updatedAt": "2026-01-06T10:43:17Z"
}
```

**Success Codes**: `200 OK`, `201 Created`, `204 No Content`

**Error Codes**
- `400` Validation error (see Section 4)
- `404` Note not found or not owned by user

---

### 2.3 Itineraries
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/trip-notes/{id}/itinerary` | Retrieve itinerary for a note. Returns `404` if none exists. |
| `PUT` | `/api/trip-notes/{id}/itinerary` | Replace entire itinerary text (manual edits). |

**Request Payload (PUT )**
```json
{
  "itinerary": "Day 1: … Day 2: …"
}
```

**Response Payload**
```json
{
  "id": 17,
  "tripNoteId": 42,
  "suggestedTripLength": 7,
  "itinerary": "Day 1: …",
  "createdAt": "2026-01-06T11:02:55Z",
  "updatedAt": "2026-01-06T11:04:12Z"
}
```

---

### 2.4 Generation

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/trip-notes/{id}/generate` | Synchronously calls the AI service. On success: stores itinerary, creates a *succeeded* job record, and returns the itinerary payload (see 2.3). On failure: stores a *failed* job record and returns an error with details. |
| `GET` | `/api/jobs` | (Admin only) List generation job records for analytics; supports pagination, filtering by `status`, and date range. |

**Job Record Example**

```json
{
  "id": 99,
  "tripNoteId": 42,
  "status": "succeeded", // succeeded | failed
  "durationMs": 31000,
  "errorText": null,
  "createdAt": "2026-01-06T11:01:12Z",
  "updatedAt": "2026-01-06T11:01:43Z"
}
```

---

### 2.5 User Preferences
| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/preferences` | List preferences for current user. |
| `POST` | `/api/preferences` | Create new preference entry. |
| `GET` | `/api/preferences/{id}` | Get single preference. |
| `PUT` | `/api/preferences/{id}` | Replace preference. |
| `DELETE` | `/api/preferences/{id}` | Remove preference. |

**Request Payload (`POST` / `PUT`)**
```json
{
  "category": "culture", // food | culture | adventure | nature | other
  "preferenceText": "Prefer local art museums"
}
```

---

## 3. Authentication and Authorization
1. **Authentication**: Supabase Auth issues JWT tokens; clients attach them as `Authorization: Bearer <jwt>`. Astro middleware (`src/middleware/index.ts`) validates the token and populates `locals.user`.
2. **Authorization**:
   - Row-level security (RLS) in PostgreSQL ensures a user can only access rows where `user_id = auth.uid()`.
   - API layer performs an early check that the resource belongs to `locals.user.id`, returning `404` to avoid ID probing.

Additional security layers:
- **Rate limiting**: Global & per-route limit (e.g., 100 req/min) enforced via Astro middleware + Redis store.
- **Input sanitization**: All inputs validated via Zod schemas.
- **CORS**: Allow only same-origin frontend or pre-defined domains.

---

## 4. Validation and Business Logic
### 4.1 Validation Rules
| Resource | Field | Rule |
|----------|-------|------|
| Trip Note | `destination` | Required, non-empty string ≤ 255 chars |
| Trip Note | `earliestStartDate` | Required, ISO 8601 date |
| Trip Note | `latestStartDate` | Required, ISO 8601 date, ≥ `earliestStartDate` |
| Trip Note | `groupSize` | Required, integer > 0 (DB `CHECK group_size > 0`) |
| Trip Note | `approximateTripLength` | Required, integer > 0 |
| Trip Note | `budgetAmount` | Optional, integer > 0 |
| Trip Note | `currency` | Optional, 3-letter ISO 4217 code |
| Preference | `category` | Enum: food/culture/adventure/nature/other |
| Preference | `preferenceText` | Required, non-empty |
| Generation Job | `status` | Enum: succeeded/failed |

### 4.2 Business Logic Mapping
| Feature (PRD) | Endpoint(s) | Logic |
|---------------|-------------|-------|
| FR-002 CRUD Trip Notes | `/api/trip-notes*` | Standard CRUD with RLS & validation. |
| FR-004 Generate Itinerary | `POST /api/trip-notes/{id}/generateItenerary` | 1) Validate note 2)get preferences (if any). 3) Call AI service asynchronously and await comletion. 4) On success: store itinerary and add `ai_generation_job` with `succeeded` status + duration. 5) On failure: add `ai_generation_job` with `failed` status and error text. |
| FR-006 Persist Plan | Occurs within the generation endpoint (step 3 above). |
| FR-007 Retry on Failure | If job status `failed`, frontend displays `errorText` & allows re-POST generate. |
| FR-008 Delete Account | `DELETE /api/auth/account` | 1) Call Supabase `auth.admin.deleteUser`. 2) Cascade deletes via FK `ON DELETE CASCADE`. |
| FR-013 Secure Session | Middleware enforces JWT; endpoints double-check `user_id`.

---

### 4.3 Pagination, Filtering & Sorting
- Cursor or offset pagination supported (offset shown above for simplicity). Cursor pagination optional via `cursor` & `limit` params.
- Filtering parameters documented per list endpoint; unspecified params ignored.
- Sorting uses `sort` query with `-` prefix for descending order.

### 4.4 Error Handling (Common)
| Code | Meaning |
|------|---------|
| 400 | Invalid input (message array of validation errors) |
| 401 | Missing/invalid JWT |
| 403 | Authenticated but not allowed (should not occur w/ RLS) |
| 404 | Resource not found or not owned by user |
| 409 | Conflict (e.g., unique constraint) |
| 429 | Rate limit exceeded |
| 500 | Unhandled server error |

---

## 5. Non-Functional Considerations
- **Documentation**: OpenAPI 3 spec generated from Zod schemas & served at `/api/docs` (Swagger UI).

