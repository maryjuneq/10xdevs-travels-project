/// <reference types="astro/client" />

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./db/database.types.ts";

declare global {
  namespace App {
    interface Locals {
      supabase: SupabaseClient<Database>;
      user?: {
        id: string;
        email: string;
      };
    }
  }
}

interface ImportMetaEnv {
  // Server-side only (not exposed to browser)
  readonly SUPABASE_URL: string;
  readonly SUPABASE_KEY: string;
  readonly SUPABASE_SERVICE_ROLE_KEY?: string;
  readonly OPENROUTER_API_KEY: string;
  
  // Client-side (exposed to browser with PUBLIC_ prefix)
  readonly PUBLIC_SUPABASE_URL: string;
  readonly PUBLIC_SUPABASE_ANON_KEY: string;
  
  // Other environment variables
  readonly PROD: boolean;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
