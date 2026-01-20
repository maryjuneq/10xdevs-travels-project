# Database Schema – VibeTravels MVP

## 1. Tables

### 1.1 `users`

This table is managed by Supabase Auth.

| Column             | Type         | Constraints              |
| ------------------ | ------------ | ------------------------ |
| id                 | uuid         | primary key              |
| email              | varchar(255) | not null unique          |
| encrypted_password | varchar      | not null                 |
| created_at         | timestamptz  | not null default `now()` |
| confirmed_at       | timestamptz  |                          |

> Supabase manages authentication in `auth.users`. The `profiles` table extends that record.

### 1.2 `trip_notes`

| Column                  | Type        | Constraints                                        |
| ----------------------- | ----------- | -------------------------------------------------- |
| id                      | bigserial   | primary key                                        |
| user_id                 | uuid        | not null, references `users(id)` on delete cascade |
| destination             | text        | not null                                           |
| earliest_start_date     | date        | not null                                           |
| latest_start_date       | date        | not null                                           |
| group_size              | smallint    | not null, check `group_size > 0`                   |
| approximate_trip_length | smallint    | not null, check `approximate_trip_length > 0`      |
| budget_amount           | integer     | check `budget_amount > 0`                          |
| currency                | char(3)     |                                                    |
| details                 | text        |                                                    |
| created_at              | timestamptz | default `now()`                                    |
| updated_at              | timestamptz | default `now()`                                    |

_Unique Constraints_

- `unique(user_id, destination, earliest_start_date)`

_Trigger_

- Automatically update the updated_at column on record updates.

### 1.3 `itineraries`

| Column                | Type        | Constraints                                                     |
| --------------------- | ----------- | --------------------------------------------------------------- |
| id                    | bigserial   | primary key                                                     |
| trip_note_id          | bigserial   | not null, unique, references `trip_notes(id)` on delete cascade |
| user_id               | uuid        | not null, references `users(id)` on delete cascade              |
| suggested_trip_length | smallint    |                                                                 |
| itinerary             | text        | not null                                                        |
| manually_edited       | boolean     | default `false`                                                 |
| created_at            | timestamptz | default `now()`                                                 |
| updated_at            | timestamptz | default `now()`                                                 |

_Trigger_

- Automatically update the updated_at column on record updates.

### 1.4 `ai_generation_jobs`

| Column       | Type              | Constraints                                             |
| ------------ | ----------------- | ------------------------------------------------------- |
| id           | bigserial         | primary key                                             |
| user_id      | uuid              | not null, references `users(id)` on delete cascade      |
| trip_note_id | bigserial         | not null, references `trip_notes(id)` on delete cascade |
| status       | generation_status | not null                                                |
| duration_ms  | integer           |                                                         |
| error_text   | text              |                                                         |
| created_at   | timestamptz       | default `now()`                                         |
| updated_at   | timestamptz       | default `now()`                                         |

**Enum** `generation_status` values: `succeeded`, `failed`.

### 1.5 `user_preferences`

| Column          | Type                | Constraints                                        |
| --------------- | ------------------- | -------------------------------------------------- |
| id              | bigserial           | primary key                                        |
| user_id         | uuid                | not null, references `users(id)` on delete cascade |
| category        | preference_category | default 'other'                                    |
| preference_text | text                | not null                                           |
| created_at      | timestamptz         | default `now()`                                    |
| updated_at      | timestamptz         | default `now()`                                    |

**Enum** `preference_category` values: `food`, `culture`, `adventure`, `nature`, `other` (extendable).

_Trigger_

- Automatically update the updated_at column on record updates.

## 2. Relationships

- `users` 1 → N `trip_notes` (`users.id` → `trip_notes.user_id`)
- `trip_notes` 1 → 1 `itineraries` (`trip_notes.id` → `itineraries.trip_note_id`)
- `users` 1 → N `ai_generation_jobs` (`users.id` → `ai_generation_jobs.user_id`)
- `trip_notes` 1 → N `ai_generation_jobs` (`trip_notes.id` → `ai_generation_jobs.trip_note_id`)
- `users` 1 → N `user_preferences` (`users.id` → `user_preferences.user_id`)

All foreign keys use `ON DELETE CASCADE` to simplify cleanup when a user or note is removed.

## 3. Indexes

| Table              | Index                                                           | Purpose                    |
| ------------------ | --------------------------------------------------------------- | -------------------------- |
| trip_notes         | `idx_trip_notes_user` on `(user_id)`                            | list notes per user        |
| trip_notes         | `idx_trip_notes_user_start` on `(user_id, earliest_start_date)` | upcoming-trip queries      |
| itineraries        | `idx_itineraries_user` on `(user_id)`                           | fetch itineraries per user |
| ai_generation_jobs | `idx_jobs_user` on `(user_id)`                                  | dashboards per user        |
| ai_generation_jobs | `idx_jobs_status` on `(status)`                                 | filter by status           |
| user_preferences   | `idx_preferences_user` on `(user_id)`                           | load preferences per user  |

## 4. PostgreSQL Policies (RLS)

Apply RLS policy on `trip_notes`, `itineraries` and `user_preferences` so that only user with maching user_id to user from Supabase Auth can access records.

```sql
CREATE POLICY "Users can access their own notes" ON trip_notes
  USING (user_id = auth.uid());
```

## 5. Additional Notes

- Timestamps use `now()` defaults and should be updated via triggers or application logic.
