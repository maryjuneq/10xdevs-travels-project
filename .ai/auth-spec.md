# Authentication & Authorization Architecture Specification

Version: 1.1 – 2026-01-18  
Author: AI assistant

## 0. Scope & Goals
This document specifies the **registration, login, password recovery and account-deletion** capability requested in the PRD user stories **US-001, US-002, US-011, US-013** while keeping full compatibility with the existing Astro + React application, database schema, and CI/CD processes.

Supabase Auth is the single source of truth for identities. All new code MUST respect the project structure rules defined in `shared.mdc`.

---
## 1. User-Interface Architecture

### 1.1 Route Map (Astro Pages)
| Route | Access | Purpose |
|-------|--------|---------|
| `/login` | guest-only | Email + password sign-in |
| `/register` | guest-only | New account creation |
| `/password-reset` | guest-only | Request reset email |
| `/password-reset/[token]` | guest-only | Set new password |
| `/logout` | redirect | Performs sign-out then redirects to `/login` |

All routes are implemented as **Astro pages** rendering a minimal shell that mounts the **`AuthForm` React component**. Copy/SEO friendly content is rendered statically by Astro; form state and Supabase SDK calls happen in React.

### 1.2 Layout Strategy
* `src/layouts/GuestLayout.astro` – header + footer only; hides nav requiring auth.
* `src/layouts/AuthenticatedLayout.astro` – main app shell shown after login.
* `src/middleware/index.ts` already exists; we will extend it with `ensureAuth()` and `ensureGuest()` helpers that redirect accordingly.

### 1.3 React Components
* `AuthForm`
  * Prop: `mode: "login" | "register" | "reset" | "reset-confirm"`
  * Renders relevant inputs and validation messages.
* `InputField`, `PasswordField`, `FormError`, `FormSuccess` – shared, located in `src/components/ui` or `src/components/forms`.
* `DeleteAccountDialog` – confirmation modal (Shadcn/ui `AlertDialog`).

> Separation of concerns: **Astro** supplies routing, SSR, and guarded data‐fetching. **React** supplies interactive form validation, optimistic UI, and calls to Supabase JS client.

### 1.4 Validation & Error States
Validation is done **client-side** with [Zod](https://zod.dev) and **mirrored server-side** before calling Supabase.  
| Field | Rules | Error message |
|-------|-------|---------------|
| Email | RFC-5322 valid, ≤ 254 chars | "Enter a valid email" |
| Password | ≥ 8 chars, ≥ 1 number & 1 letter | "Password must be at least 8 characters and contain a number" |
| Confirm pwd | identical to password | "Passwords don’t match" |

Server responses are normalised into `FORM_ERROR` union: `INVALID_CREDENTIALS`, `EMAIL_TAKEN`, `TOKEN_EXPIRED`, `UNKNOWN`.  All unknown errors fall back to: *"Something went wrong. Please try again."*

### 1.5 Key Scenarios
1. **Happy registration** → user signs up → middleware detects session → redirects `/`.
2. **Login with wrong password** → Supabase returns 400 → form shows generic *"Invalid email or password"* (no user enumeration).
3. **Password reset** → user enters email → *success* always displayed to avoid enumeration.
4. **Account deletion** → CTA in dashboard footer opens `DeleteAccountDialog`; on confirm calls `/api/auth/delete` and redirects to landing.

---
## 2. Backend Logic

### 2.1 API Directory
```
src/pages/api/auth/
  ├─ register.ts      POST
  ├─ login.ts         POST
  ├─ logout.ts        POST
  ├─ password-reset.ts        POST (request email)
  ├─ password-reset/[token].ts POST (confirm new pwd)
  └─ delete.ts        POST (cascading delete)
```
Each endpoint is **thin**: performs Zod validation then delegates to `src/lib/services/auth.service.ts`.

### 2.2 `AuthService` (server-side only)
```ts
register(email, pwd): Promise<Session>
login(email, pwd): Promise<Session>
logout(accessToken): void
requestPasswordReset(email): void
confirmPasswordReset(token, newPwd): void
deleteAccount(userId): void   // cascades notes, plans, preferences
```
Implementation uses Supabase Admin API (`service_role` key read from env server-side only) for privileged actions like account deletion.

### 2.3 Input Validation
* Shared **schema files** in `src/lib/validation/auth.ts` using Zod.
* Astro API files import these schemas; if parsing fails return `400` JSON: `{ error: "VALIDATION_ERROR", details }`.

### 2.4 Exception Handling
* `AuthService` wraps Supabase errors and throws `AppError` (custom) with `code` & `message`.
* `pages/api/**` catch `AppError` and map to 4xx/5xx.

### 2.5 Server-Side Rendering & Middleware
* `src/middleware/index.ts` currently runs; extend with `@supabase/ssr`:
  ```ts
  import { createServerClient, parseCookieHeader } from '@supabase/ssr'

  // Inside defineMiddleware:
  context.locals.supabase = createServerClient(
    import.meta.env.SUPABASE_URL,
    import.meta.env.SUPABASE_KEY,
    {
      cookies: {
        getAll() {
          return parseCookieHeader(context.request.headers.get('Cookie') ?? '')
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            context.cookies.set(name, value, options)
          })
        },
      },
    }
  )

  // Auth Guards
  const { data: { session } } = await context.locals.supabase.auth.getSession();
  // ... perform redirection based on session
  ```
* Attach to page collections via Astro `prerender = false` & route config.

---
## 3. Authentication System (Supabase-centric)

### 3.1 Supabase Project Configuration
* **Auth Providers**: Email (magic link & password). Social providers disabled in MVP.
* **Password Reset Template**: link points to `https://<BASE_URL>/password-reset/{token}`.
* **Policies**: RLS enabled on `notes`, `itineraries`, `user_preferences`, `ai_generations` tables → `user_id = auth.uid()`.

### 3.2 Supabase Client Usage
* **Browser**: standard `@supabase/supabase-js` is sufficient for client-side interactions, but using `@supabase/ssr` `createBrowserClient` is recommended for consistency with cookies.
* **Server-side**: `createServerClient` from `@supabase/ssr` in Astro endpoint & middleware for SSR session injection.

### 3.3 Session Persistence
* `@supabase/ssr` automatically handles `sb:token` cookies. Astro SSR picks up session in middleware and injects into page props via `Astro.locals`.

### 3.4 Protected Routes
* List of protected directories: `/` (dashboard), `/trip-notes/**`, `/preferences`.
* Guarded via middleware `ensureAuth`.

### 3.5 Account Deletion Cascade
1. Call `AuthService.deleteAccount(userId)`
2. Ensure Postgres `ON DELETE CASCADE` constraints are active on `user_id` foreign keys in `trip_notes`, `itineraries`, etc.
3. Call Supabase Admin `deleteUser(userId)`.
4. Supabase session revoked, middleware redirects to home.

### 3.6 Rate Limiting & Security
* API endpoints sit behind Cloudflare rules (already set in infra). Add per-IP throttle (10 req/min) via middleware limiter.
* All error messages generic to avoid user enumeration.
* CSRF: endpoints accept **POST** only and require `Origin` header match.

---
## 4. Compatibility & Migration
* **Dependencies**: Add `@supabase/ssr` to `package.json`.
* No breaking DB schema changes for existing `trip_notes` etc.
* New tables **NOT** required – Supabase Auth user ID already exists; we reference it in existing tables (`user_id`).
* Middleware changes are additive; existing unprotected public pages continue to render.

---
## 5. Open Questions / Risks
1. **Email deliverability** – currently no SES/SendGrid account; risk to password reset.
2. **Logout on all devices** – default Supabase behaviour revokes only current session; is this sufficient?

---
## 6. Next Steps
1. Install `@supabase/ssr`.
2. Scaffold pages & components.
3. Implement API endpoints and services.
4. Update README with environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`).
