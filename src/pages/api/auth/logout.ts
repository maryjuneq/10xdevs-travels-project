import type { APIRoute } from "astro";
import { AuthService } from "@/lib/services/auth.service";

export const prerender = false;

/**
 * POST /api/auth/logout
 * Sign out the current user
 */
export const POST: APIRoute = async () => {
  try {
    // Sign out user
    await AuthService.logout();

    // Create response
    const response = new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );

    // Clear session cookies
    response.headers.append(
      "Set-Cookie",
      "sb-access-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
    );
    response.headers.append(
      "Set-Cookie",
      "sb-refresh-token=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT; HttpOnly; SameSite=Lax"
    );

    return response;
  } catch (error) {
    console.error("Logout error:", error);

    // Return user-friendly error message
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
