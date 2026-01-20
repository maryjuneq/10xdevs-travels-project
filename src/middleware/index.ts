import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";
import { AIService } from "../lib/services/ai.service.ts";

// Initialize AI Service with OpenRouter API key
const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY || import.meta.env.API_KEY;
if (openRouterApiKey) {
  AIService.initialize(openRouterApiKey);
} else {
  console.warn("Warning: OPENROUTER_API_KEY not found. AI Service will use mock implementation.");
}

// Public paths that don't require authentication
const GUEST_PATHS = ["/login", "/register", "/password-reset", "/password-reset/confirm", "/logout"];

// API paths that don't require authentication
const PUBLIC_API_PATHS = [
  "/api/auth/login",
  "/api/auth/register",
  "/api/auth/password-reset",
  "/api/auth/password-reset-confirm",
  "/api/auth/logout",
];

// Paths that should only be accessible to guest users (redirect if authenticated)
const GUEST_ONLY_PATHS = ["/login", "/register", "/password-reset"];

/**
 * Check if a path matches any of the allowed paths
 */
function isPathAllowed(pathname: string, allowedPaths: string[]): boolean {
  return allowedPaths.some((path) => {
    // Exact match
    if (pathname === path) return true;
    // Pattern match for dynamic routes (e.g., /password-reset/[token])
    if (path.includes("[") && pathname.startsWith(path.split("[")[0])) return true;
    // Check if pathname starts with the allowed path (for nested routes)
    if (pathname.startsWith(`${path}/`)) return true;
    return false;
  });
}

export const onRequest = defineMiddleware(async ({ locals, cookies, url, request, redirect }, next) => {
  // Attach Supabase client to locals
  locals.supabase = supabaseClient;

  const pathname = url.pathname;

  // Skip auth check for public API paths
  if (isPathAllowed(pathname, PUBLIC_API_PATHS)) {
    return next();
  }

  // Try to restore session from cookies
  const accessToken = cookies.get("sb-access-token")?.value;
  const refreshToken = cookies.get("sb-refresh-token")?.value;

  if (accessToken && refreshToken) {
    // Set the session in Supabase client from cookies
    const { data, error } = await supabaseClient.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken,
    });

    if (error) {
      console.error("Error setting session from cookies:", error);
      // Clear invalid cookies
      cookies.delete("sb-access-token", { path: "/" });
      cookies.delete("sb-refresh-token", { path: "/" });
    }
  }

  // Get user session
  const {
    data: { user },
  } = await supabaseClient.auth.getUser();

  // Store user in locals if authenticated
  if (user) {
    locals.user = {
      id: user.id,
      email: user.email || "",
    };
  }

  // Handle guest-only pages (login, register, etc.)
  if (isPathAllowed(pathname, GUEST_ONLY_PATHS)) {
    if (user) {
      // Already authenticated, redirect to dashboard
      return redirect("/");
    }
    return next();
  }

  // Handle guest paths that can be accessed regardless of auth state
  if (isPathAllowed(pathname, GUEST_PATHS)) {
    return next();
  }

  // All other paths require authentication
  if (!user) {
    // Not authenticated, redirect to login
    return redirect("/login");
  }

  return next();
});
