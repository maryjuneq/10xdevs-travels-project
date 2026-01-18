import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

// Browser-safe Supabase client using PUBLIC_ prefixed env variables
// These are safe to expose in the browser
const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Missing Supabase environment variables. Make sure PUBLIC_SUPABASE_URL and PUBLIC_SUPABASE_ANON_KEY are set."
  );
}

// Create browser client with cookie persistence
export const supabaseBrowser = createClient<Database>(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Store session in cookies for better security
    storage: typeof window !== "undefined" ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

export type SupabaseBrowserClient = typeof supabaseBrowser;
