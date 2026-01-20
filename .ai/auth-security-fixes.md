# Authentication Security Fixes

## Issues Identified

### 1. Supabase Client Environment Variables in Browser

**Problem**: The `AuthForm.tsx` component was importing `supabaseClient` which uses server-side environment variables (`SUPABASE_URL` and `SUPABASE_KEY`) that are not available in the browser. This caused the error: "supabaseUrl is required."

**Root Cause**: In Astro, environment variables must be prefixed with `PUBLIC_` to be accessible in client-side code.

**Solution**:

- Created a new browser-safe Supabase client at `src/db/supabase.browser.ts` that uses `PUBLIC_SUPABASE_URL` and `PUBLIC_SUPABASE_ANON_KEY`
- Updated `AuthForm.tsx` to import and use `supabaseBrowser` instead of `supabaseClient`

### 2. Session Tokens in Response Body

**Problem**: The `/api/auth/login` and `/api/auth/register` endpoints were returning access and refresh tokens in the JSON response body. This is a security concern as:

- Tokens could be intercepted and logged by browser extensions or third-party scripts
- Requires client-side code to handle token storage (vulnerable to XSS)
- Not following security best practices for token management

**Solution**:

- Updated both endpoints to set tokens as **HTTP-only cookies**
- Cookies are configured with:
  - `HttpOnly`: Cannot be accessed by JavaScript (XSS protection)
  - `SameSite=Lax`: CSRF protection
  - `Secure` flag in production: HTTPS only
  - 7-day expiration
- Removed tokens from response body, only returning user info

## Required Environment Variables

The following environment variables must be configured:

### Server-side (Backend/API):

```bash
SUPABASE_URL=your_supabase_project_url
SUPABASE_KEY=your_supabase_service_role_key
```

### Client-side (Browser/Frontend):

```bash
PUBLIC_SUPABASE_URL=your_supabase_project_url
PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_public_key
```

**Important**:

- The `PUBLIC_` prefix is required for Astro to expose variables to client-side code
- Use the **anon/public key** for client-side, NOT the service role key
- The service role key should only be used server-side and never exposed to the browser

## Files Modified

1. **Created**: `src/db/supabase.browser.ts`
   - New browser-safe Supabase client with proper env variable usage
2. **Modified**: `src/components/auth/AuthForm.tsx`
   - Changed import from `supabaseClient` to `supabaseBrowser`
   - Updated `getSession()` call to use browser client

3. **Modified**: `src/pages/api/auth/login.ts`
   - Now sets HTTP-only cookies for session management
   - Removed tokens from response body
4. **Modified**: `src/pages/api/auth/register.ts`
   - Now sets HTTP-only cookies for session management
   - Removed tokens from response body

## Testing Checklist

- [ ] Login flow works and redirects to dashboard
- [ ] Registration flow works and redirects to dashboard
- [ ] Session persists across page refreshes
- [ ] Cookies are set correctly (check browser DevTools > Application > Cookies)
- [ ] No "supabaseUrl is required" errors in console
- [ ] Tokens are NOT visible in response body (check Network tab)
- [ ] Logout clears the cookies properly

## Additional Security Recommendations

1. **Cookie Management**: Consider implementing a proper cookie refresh mechanism
2. **CSRF Protection**: Add CSRF tokens for state-changing operations
3. **Rate Limiting**: Implement rate limiting on auth endpoints to prevent brute force attacks
4. **Session Timeout**: Implement proper session timeout and refresh logic
5. **Audit Logging**: Log authentication events for security monitoring
