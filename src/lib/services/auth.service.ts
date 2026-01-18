import { supabaseClient } from "@/db/supabase.client";
import type { AuthError, Session, User } from "@supabase/supabase-js";

/**
 * Authentication Service
 * Handles all authentication operations using Supabase Auth
 */
export class AuthService {
  /**
   * Register a new user with email and password
   */
  static async register(email: string, password: string): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabaseClient.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw AuthService.normalizeError(error);
    }

    if (!data.user || !data.session) {
      throw new Error("Registration failed - no user or session returned");
    }

    return { user: data.user, session: data.session };
  }

  /**
   * Sign in an existing user with email and password
   */
  static async login(email: string, password: string): Promise<{ user: User; session: Session }> {
    const { data, error } = await supabaseClient.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw AuthService.normalizeError(error);
    }

    if (!data.user || !data.session) {
      throw new Error("Login failed - no user or session returned");
    }

    return { user: data.user, session: data.session };
  }

  /**
   * Sign out the current user
   */
  static async logout(): Promise<void> {
    const { error } = await supabaseClient.auth.signOut();

    if (error) {
      throw AuthService.normalizeError(error);
    }
  }

  /**
   * Request a password reset email
   * Note: Always returns success to prevent user enumeration
   */
  static async requestPasswordReset(email: string, redirectTo?: string): Promise<void> {
    const options = redirectTo ? { redirectTo } : undefined;
    
    const { error } = await supabaseClient.auth.resetPasswordForEmail(email, options);

    // Log error for debugging but don't expose to user (prevents enumeration)
    if (error) {
      console.error('Password reset error:', error);
    }

    // Always succeed to prevent user enumeration
    return;
  }

  /**
   * Confirm password reset with new password
   */
  static async confirmPasswordReset(newPassword: string): Promise<void> {
    const { error } = await supabaseClient.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      throw AuthService.normalizeError(error);
    }
  }

  /**
   * Delete the current user's account and all associated data
   * Note: This is handled by the API endpoint /api/auth/delete
   * This method is not used directly but kept for completeness
   */
  static async deleteAccount(): Promise<void> {
    throw new Error("Use /api/auth/delete endpoint for account deletion");
  }

  /**
   * Get the current authenticated user
   */
  static async getCurrentUser(): Promise<User | null> {
    const { data: { user }, error } = await supabaseClient.auth.getUser();

    if (error) {
      console.error('Error getting current user:', error);
      return null;
    }

    return user;
  }

  /**
   * Get the current session
   */
  static async getSession(): Promise<Session | null> {
    const { data: { session }, error } = await supabaseClient.auth.getSession();

    if (error) {
      console.error('Error getting session:', error);
      return null;
    }

    return session;
  }

  /**
   * Normalize Supabase auth errors into user-friendly messages
   */
  private static normalizeError(error: AuthError): Error {
    // Map common Supabase error messages to user-friendly ones
    switch (error.message) {
      case 'Invalid login credentials':
        return new Error('Invalid email or password');
      case 'User already registered':
        return new Error('An account with this email already exists');
      case 'Email not confirmed':
        return new Error('Please confirm your email address');
      case 'Password should be at least 6 characters':
        return new Error('Password must be at least 8 characters');
      default:
        // Log original error for debugging
        console.error('Auth error:', error);
        return new Error('Something went wrong. Please try again.');
    }
  }
}
