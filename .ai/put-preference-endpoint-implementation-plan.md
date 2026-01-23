# API Endpoint Implementation Plan: Update User Preference (`PUT /api/preferences/{id}`)

## 1. Endpoint Overview
Replaces an existing travel preference record owned by the authenticated user. The endpoint updates `category` and/or `preference_text` for the given preference `id` in the `user_preferences` table and returns the updated record.

## 2. Request Details
- **HTTP Method:** PUT  
- **URL:** `/api/preferences/{id}`  
  - `id` – **path param** – integer – required – primary key of the preference to update.
- **Headers:**  
  - `Content-Type: application/json`  
  - `Authorization: Bearer <JWT>`
- **Request Body Schema:**

```json
{
  "category": "adventure", // Optional. Enum: food | culture | adventure | nature | other. Defaults to current value if omitted.
  "preferenceText": "Love hiking and outdoor activities" // Optional, non-empty, max 255 chars. Defaults to current value if omitted.
}
```

### Parameters
| Name | In | Type | Required | Notes |
|------|----|------|----------|-------|
| `id` | path | integer | Yes | Preference primary key. |
| `category` | body | string (enum) | No | At least one of `category` or `preferenceText` must be provided. |
| `preferenceText` | body | string | No | |

## 3. Used Types

### DTOs (add to `src/types.ts` if not present)
```ts
export interface UpdatePreferenceDTO {
  category?: PreferenceCategory;
  preferenceText?: string;
}
```

### Command Model
```ts
export interface UpdatePreferenceCommand {
  id: number;
  userId: string;           // enforced on server
  changes: UpdatePreferenceDTO; // validated non-empty object
}
```

## 4. Response Details
| Status | Condition | Body |
|--------|-----------|------|
| **200 OK** | Update succeeded | `PreferenceDTO` |
| **400 Bad Request** | Validation error, empty body, or no allowed fields provided | `{ error: 'Validation failed', details }` |
| **401 Unauthorized** | No valid session | `{ error: 'Unauthorized' }` |
| **404 Not Found** | Record not found for user | `{ error: 'Preference not found' }` |
| **500 Internal Server Error** | Unhandled error | `{ error: 'Server error', referenceId }` |

## 5. Data Flow
1. Handler receives `PUT /api/preferences/{id}`.
2. Verify Supabase session from `locals.supabase`.
3. Parse `id` from URL; ensure positive integer.
4. Parse JSON body; validate with `updatePreferenceSchema` (must include ≥1 updatable field).
5. Build `UpdatePreferenceCommand` with `userId` from session.
6. Call `PreferencesService.update(command)`:
   - Executes `update` on `user_preferences` where `id = cmd.id AND user_id = cmd.userId`.
   - `select()` updated row (`.single()`); if not found, return `null`.
7. Handler:
   - If service returns `null`, respond 404.
   - Else, map to `PreferenceDTO` and return 200.
8. Errors are logged through `logger.error` with contextual data.

## 6. Security Considerations
- **Authentication:** Required.
- **Authorization:** Update restricted to record owner via `user_id` match in query and/or Supabase RLS.
- **Validation:** Ensure `id` is integer; body validated with Zod, at least one field present.
- **RLS:** Confirm policy `user_id = auth.uid()` allows update & select; deny otherwise.
- **Input Sanitization:** Trim `preferenceText` and enforce length to avoid SQL & XSS vectors.
- **Rate Limiting:** Consider per-user update throttling.

## 7. Error Handling
| Scenario | Status | Handling |
|----------|--------|----------|
| Invalid `id` (non-numeric) | 400 | Short message. |
| Body empty or unknown keys | 400 | Zod error details. |
| Record not owned by user | 404 | Conceal existence. |
| Supabase upsert error (constraint) | 400 | Map PG code. |
| DB downtime | 500 | Log and generic message. |

`referenceId` links to centralized logging (Sentry / `api_error_logs`).

## 8. Performance Considerations
- Use `prefer('return=representation')` insert-style update to avoid second query (Supabase will still require `.select()` in JS client).
- Index on `user_preferences(id, user_id)` already implicit via PK; additional composite index not required.
- Limit returned columns to necessary set.

## 9. Implementation Steps
1. **Add Types**  
   - `UpdatePreferenceDTO`, `UpdatePreferenceCommand` in `src/types.ts` / service file.
2. **Create Zod Schema**  
   ```ts
   const updatePreferenceSchema = z.object({
     category: z.enum(['food', 'culture', 'adventure', 'nature', 'other']).optional(),
     preferenceText: z.string().trim().min(1).max(255).optional(),
   }).refine(obj => Object.keys(obj).length > 0, {
     message: 'At least one field must be provided',
   });
   ```
3. **Extend Service Layer**  
   - Implement `update(cmd)` inside `preferences.service.ts`.
4. **Create API Route**  
   - Path: `src/pages/api/preferences/[id].ts`.
   - Export `PUT` handler implementing flow above.
5. **Middleware & RLS**  
   - Ensure RLS policies permit `UPDATE` for owner.
6. **Logging**  
   - Use shared `logger` util for errors.
7. **Tests**  
   - Success 200.  
   - Not found 404.  
   - Validation 400.  
   - Unauthorized 401.
8. **Docs**  
   - Update OpenAPI / markdown docs.
9. **Quality Checks**  
   - Run linter, type-check, tests.  
10. **Deploy & Verify**  
    - Deploy, hit endpoint with curl/Postman.
