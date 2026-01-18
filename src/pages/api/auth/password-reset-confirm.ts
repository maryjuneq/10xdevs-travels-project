import type { APIRoute } from "astro";
import { passwordResetConfirmSchema } from "@/lib/schemas/auth.schema";
import { AuthService } from "@/lib/services/auth.service";

export const prerender = false;

/**
 * POST /api/auth/password-reset-confirm
 * Confirm password reset with new password
 * Requires user to be authenticated with reset token
 */
export const POST: APIRoute = async ({ request }) => {
  try {
    // Parse request body
    const body = await request.json();

    // Validate input
    const result = passwordResetConfirmSchema.safeParse(body);
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

    const { password } = result.data;

    // Confirm password reset
    await AuthService.confirmPasswordReset(password);

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Your password has been reset successfully.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Password reset confirmation error:", error);

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
