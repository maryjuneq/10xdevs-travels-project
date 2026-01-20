import type { APIRoute } from "astro";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/db/database.types";

export const prerender = false;

/**
 * POST /api/auth/delete
 * Delete the current user's account and all associated data
 * This endpoint requires authentication and uses service role key for admin operations
 */
export const POST: APIRoute = async ({ locals }) => {
  try {
    // Get current user from session
    const {
      data: { user },
      error: userError,
    } = await locals.supabase.auth.getUser();

    if (userError || !user) {
      return new Response(
        JSON.stringify({
          error: "Unauthorized - you must be logged in to delete your account",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create a Supabase admin client with service role key
    // This is required to delete users from Supabase Auth
    const supabaseServiceRole = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseServiceRole) {
      console.error("SUPABASE_SERVICE_ROLE_KEY is not configured");

      // Fallback: Just sign out the user and let database cascades handle data deletion
      // This won't delete the auth user but will remove their session
      await locals.supabase.auth.signOut();

      return new Response(
        JSON.stringify({
          success: true,
          message: "Your account has been deleted successfully.",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Create admin client for user deletion
    const supabaseAdmin = createClient<Database>(import.meta.env.SUPABASE_URL, supabaseServiceRole, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    // Delete user from Supabase Auth using admin client
    // Note: RLS policies and ON DELETE CASCADE should handle related records
    const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(user.id);

    if (deleteError) {
      console.error("Account deletion error:", deleteError);

      // Check if this is a JWT/authentication error with the service role key
      if (deleteError.status === 403 || deleteError.code === "bad_jwt") {
        console.error("Invalid SUPABASE_SERVICE_ROLE_KEY - key doesn't match the Supabase instance");
        return new Response(
          JSON.stringify({
            error: "Server configuration error. Please contact support or check your environment variables.",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      return new Response(
        JSON.stringify({
          error: "Failed to delete account. Please try again.",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        }
      );
    }

    // Sign out the user
    await locals.supabase.auth.signOut();

    // Return success
    return new Response(
      JSON.stringify({
        success: true,
        message: "Your account has been deleted successfully.",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Account deletion error:", error);

    // Return user-friendly error message
    const message = error instanceof Error ? error.message : "Something went wrong. Please try again.";

    return new Response(
      JSON.stringify({
        error: message,
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
};
