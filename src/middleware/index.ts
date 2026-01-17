import { defineMiddleware } from "astro:middleware";

import { supabaseClient } from "../db/supabase.client.ts";
import { AIService } from "../lib/services/ai.service.ts";

// Initialize AI Service with OpenRouter API key
const openRouterApiKey = import.meta.env.OPENROUTER_API_KEY || import.meta.env.API_KEY;
if (openRouterApiKey) {
  AIService.initialize(openRouterApiKey);
} else {
  console.warn('Warning: OPENROUTER_API_KEY not found. AI Service will use mock implementation.');
}

export const onRequest = defineMiddleware((context, next) => {
  context.locals.supabase = supabaseClient;
  return next();
});
