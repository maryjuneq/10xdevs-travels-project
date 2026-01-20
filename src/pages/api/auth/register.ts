import type { APIRoute } from "astro";
import { registerSchema } from "@/lib/schemas/auth.schema";
import { AuthService } from "@/lib/services/auth.service";

export const prerender = false;

/**
 * POST /api/auth/register
 * Register a new user account
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const result = registerSchema.safeParse(body);
    if (!result.success) {
      return new Response(
        JSON.stringify({
          error: "Validation error",
          details: result.error.errors.map((e) => ({
            field: e.path[0],
            message: e.message,
          })),
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    const { email, password } = result.data;

    // Register user
    const { user, session } = await AuthService.register(email, password);

    // Set session cookies
    const response = new Response(
      JSON.stringify({
        success: true,
        user: {
          id: user.id,
          email: user.email,
        },
      }),
      {
        status: 201,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Set secure HTTP-only cookies for session management
    // These cookies cannot be accessed by JavaScript, providing XSS protection
    const isProduction = import.meta.env.PROD;
    const cookieOptions = `HttpOnly; Path=/; SameSite=Lax; Max-Age=${60 * 60 * 24 * 7}${isProduction ? "; Secure" : ""}`;

    response.headers.append("Set-Cookie", `sb-access-token=${session.access_token}; ${cookieOptions}`);
    response.headers.append("Set-Cookie", `sb-refresh-token=${session.refresh_token}; ${cookieOptions}`);

    return response;
  } catch (error) {
    console.error("Registration error:", error);

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
