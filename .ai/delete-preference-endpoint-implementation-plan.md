# API Endpoint Implementation Plan: Delete User Preference (`DELETE /api/preferences/{id}`)

## 1. Endpoint Overview
Removes a specific travel preference record belonging to the authenticated user. The operation deletes the row from the `user_preferences` table and returns no content on success.

## 2. Request Details
- **HTTP Method:** DELETE  
- **URL:** `/api/preferences/{id}`  
  - `id` – **path param** – integer – required – primary key of the preference to remove.
- **Headers:**  
  - `Authorization: Bearer <JWT>` (handled via Supabase session)
- **Request Body:** _None_

### Parameters
| Name | In | Type | Required | Notes |
|------|----|------|----------|-------|
| `id` | path | integer | Yes | Positive integer. |

## 3. Used Types
No request body; response is empty. However, for consistency tests can reuse:
```ts
export interface DeletePreferenceParams {
  id: number;
}
```

## 4. Response Details
| Status | Condition | Body |
|--------|-----------|------|
| **204 No Content** | Deletion succeeded | _Empty_ |
| **401 Unauthorized** | Missing/invalid session | `{ error: 'Unauthorized' }` |
| **404 Not Found** | Record not found or not owned by user | `{ error: 'Preference not found' }` |
| **500 Internal Server Error** | Unhandled server error | `{ error: 'Server error', referenceId }` |

## 5. Data Flow
1. Astro route handler receives `DELETE /api/preferences/{id}`.
2. Pull Supabase client and user from `locals.supabase`.
3. Validate `id` path param (positive integer).
4. Call `PreferencesService.delete({ id, userId })`.
   - Executes `delete` from `user_preferences` with `match({ id, user_id: userId })` returning minimal result.
   - If row count = 0 ⇒ not found.
5. Handler returns 204 on success, 404 if not found.
6. Errors are logged via centralized logger.

## 6. Security Considerations
- **Authentication:** Required.
- **Authorization:** Delete scoped to record owner by matching `user_id` as well as RLS.
- **RLS:** Policy `user_id = auth.uid()` must permit `DELETE`.
- **Path Validation:** Prevent path traversal by strict integer parsing; reject non-numeric ids.
- **Rate Limiting:** Consider per-user deletes to avoid abuse.

## 7. Error Handling
| Scenario | Status | Handling |
|----------|--------|----------|
| Invalid `id` (non-numeric) | 400 | `{ error: 'Invalid id' }` |
| Unauthorized | 401 | Short message. |
| Not found or not owned | 404 | Conceal existence. |
| Supabase error | 500 | Log + generic. |

## 8. Performance Considerations
- Single-row deletion is O(1); inexpensive.
- Ensure table has primary key & `user_id` index (implicit on PK + FK) for quick delete.
- No response serialization overhead (204).

## 9. Implementation Steps
1. **Update Service Layer** (`src/lib/services/preferences.service.ts`)
   ```ts
   export interface DeletePreferenceCommand { id: number; userId: string; }
   export async function remove(cmd: DeletePreferenceCommand): Promise<boolean> {
     const { error, count } = await supabase
       .from('user_preferences')
       .delete({ count: 'exact' })
       .match({ id: cmd.id, user_id: cmd.userId });
     if (error) throw error;
     return (count ?? 0) > 0;
   }
   ```
2. **Create API Route**  
   - File: `src/pages/api/preferences/[id].ts` (same file as PUT; export `DELETE` handler).
   - Validate `id`; if NaN ⇒ 400.
   - Call `PreferencesService.remove({ id, userId })`.
   - If false ⇒ 404; else return `new Response(null, { status: 204 })`.
3. **Logging**  
   - Use `logger.info` for successful deletes and `logger.error` for failures.
4. **Tests**  
   - Successful deletion (204).  
   - Not found (404).  
   - Unauthorized (401).
5. **Docs**  
   - Update OpenAPI.
6. **Quality Checks**  
   - Lint, type-check, run tests.
7. **Deploy & Verify**  
   - Deploy preview and test via CLI/Postman.
