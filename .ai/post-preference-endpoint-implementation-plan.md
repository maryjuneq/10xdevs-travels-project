# API Endpoint Implementation Plan: Create User Preference (`POST /api/preferences`)

## 1. Endpoint Overview
Creates a single user travel preference record that influences future itinerary generation. The endpoint is authenticated; each new preference is persisted in the `user_preferences` table and linked to the requesting `user_id`.

## 2. Request Details
- **HTTP Method:** POST  
- **URL:** `/api/preferences`  
- **Headers:**  
  - `Content-Type: application/json` (required)  
  - `Authorization: Bearer <JWT>` (managed automatically by `context.locals.supabase`)
- **Request Body Schema:**

```json
{
  "category": "culture", // Optional. Enum: food | culture | adventure | nature | other. Defaults to "other".
  "preferenceText": "Prefer local art museums" // Required, non-empty, max 255 chars.
}
```

### Parameters
| Name | In | Type | Required | Notes |
|------|----|------|----------|-------|
| `category` | body | string (enum) | No | Defaults to `other` if absent. Case-insensitive. |
| `preferenceText` | body | string | Yes | Trimmed, 1-255 characters. |

## 3. Used Types

### DTOs
```ts
// src/types.ts
export type PreferenceCategory = 'food' | 'culture' | 'adventure' | 'nature' | 'other';

export interface CreatePreferenceDTO {
  category?: PreferenceCategory;
  preferenceText: string;
}

export interface PreferenceDTO {
  id: number;
  userId: string;          // UUID
  category: PreferenceCategory;
  preferenceText: string;
  createdAt: string;       // ISO date-time
  updatedAt: string;       // ISO date-time
}
```

### Command/Service Models
```ts
// src/lib/services/preferences.service.ts
export interface CreatePreferenceCommand {
  userId: string;
  category: PreferenceCategory;
  preferenceText: string;
}
```

## 4. Response Details
| Status | Condition | Body |
|--------|-----------|------|
| **201 Created** | Preference successfully persisted | `PreferenceDTO` |
| **400 Bad Request** | Validation fails (schema, enum, length) | `{ error: 'Validation failed', details?: ZodError }` |
| **401 Unauthorized** | Missing/invalid session | `{ error: 'Unauthorized' }` |
| **500 Internal Server Error** | Database error or unhandled exception | `{ error: 'Server error', referenceId?: string }` |

## 5. Data Flow
1. Astro route handler receives POST `/api/preferences`.
2. Extract Supabase client from `context.locals.supabase` and verify authenticated user.
3. Parse and validate body with Zod `createPreferenceSchema`.
4. Map to `CreatePreferenceCommand` and pass to `PreferencesService.create()`.
5. Service performs `insert` into `user_preferences`, returning full row.
6. Handler serialises row to `PreferenceDTO` and returns `201`.
7. On error, log via centralized logger (e.g. `src/lib/logger.ts`) and respond with appropriate status.

## 6. Security Considerations
- **Authentication:** Require valid Supabase session; reject anonymous requests (401).
- **Authorization:** Ensure `user_id` in inserted row is set from session, not client input.
- **Validation:** Strong Zod schema for payload; length limits to mitigate DoS.
- **Enum Safety:** Enforce allowed `category` values, defaulting to `other` when missing.
- **Rate Limiting:** (Optional) Apply middleware-level per-user limits to prevent spam.
- **RLS:** Confirm Supabase Row-Level Security allows insert for authenticated user and restricts cross-user access.
- **Headers:** Return `Cache-Control: no-store` because response contains user-specific data.

## 7. Error Handling
| Scenario | Status | Action |
|----------|--------|--------|
| Missing/invalid JWT | 401 | Short response, no body details. |
| Body parse error (invalid JSON) | 400 | `text/plain` "Malformed JSON". |
| Zod validation error | 400 | Return flattened Zod errors. |
| DB constraint violation (e.g. enum mismatch) | 400 | Map Postgres error code 22P02 to 400. |
| DB connectivity failure | 500 | Log error; return generic message with optional `referenceId`. |

`referenceId` corresponds to a logged entry (e.g. in Sentry or custom `api_error_logs` table) for cross-team debugging.

## 8. Performance Considerations
- Single row insert—lightweight.  
- Use `select()` projection post-insert to avoid follow-up query.  
- Do not await unnecessary Supabase session refresh calls.  
- Ensure JSON parsing leverages stream (Astro does by default).

## 9. Implementation Steps
1. **Define Types**  
   - Add `PreferenceCategory`, `CreatePreferenceDTO`, `PreferenceDTO` to `src/types.ts`.
2. **Create Zod Schema**  
   ```ts
   const createPreferenceSchema = z.object({
     category: z
       .enum(['food', 'culture', 'adventure', 'nature', 'other'])
       .optional()
       .default('other'),
     preferenceText: z
       .string()
       .trim()
       .min(1, 'Preference cannot be empty')
       .max(255, 'Preference too long'),
   });
   ```
3. **Extend Service Layer** (`src/lib/services/preferences.service.ts`)  
   - Add `create(cmd: CreatePreferenceCommand): Promise<PreferenceDTO>` that performs `supabase.from('user_preferences').insert({...}).select().single()` with error handling.
4. **Create API Route**  
   - Path: `src/pages/api/preferences/index.ts` (Astro server endpoint).  
   - Export `POST` handler:  
     - Guard: `if (!locals.user) return new Response(...401)`.
     - Parse JSON, validate with schema.
     - Call `PreferencesService.create({ userId: locals.user.id, ...validated })`.
     - Return `201` with DTO.
5. **Middleware / RLS Checks**  
   - Verify existing middleware injects `locals.user`. If not, enhance.
6. **Logging**  
   - On any caught error, log using `logger.error(err, { route: '/api/preferences' })`.
7. **Unit & Integration Tests**  
   - Add tests in `src/__tests__/api/preferences/createPreference.test.ts` covering:  
     - Successful insert (201).  
     - Validation failures (400).  
     - Unauthorized (401).
8. **Documentation & OpenAPI**  
   - Update `docs/openapi.yaml` (if exists) or `.ai/api-plan.md` with implemented fields.
9. **Lint & Prettier**  
   - Run `pnpm lint` and fix issues.
10. **Deploy & Verify**  
    - Deploy preview, test via Postman.
