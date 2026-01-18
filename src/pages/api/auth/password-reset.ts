import type { APIRoute } from "astro";
import { passwordResetRequestSchema } from "@/lib/schemas/auth.schema";
import { AuthService } from "@/lib/services/auth.service";

export const prerender = false;

/**
 * POST /api/auth/password-reset
 * Request a password reset email
 * Always returns success to prevent user enumeration
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const result = passwordResetRequestSchema.safeParse(body);
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

    const { email } = result.data;

    // Get the origin from the request headers
    const origin = request.headers.get("origin") || "";
    const redirectTo = origin ? `${origin}/password-reset/confirm` : undefined;

    // Request password reset
    await AuthService.requestPasswordReset(email, redirectTo);

    // Always return success to prevent user enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Password reset request error:", error);

    // Still return success to prevent enumeration
    return new Response(
      JSON.stringify({
        success: true,
        message: "If an account exists with this email, you will receive a password reset link shortly.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
