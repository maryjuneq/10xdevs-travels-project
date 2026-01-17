import type { z } from 'zod';

/**
 * OpenRouter Service Types
 * Type definitions for OpenRouter Chat Completion API integration
 */

/**
 * Chat message with role and content
 */
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Parameters for chat completion requests
 */
export interface ChatParams {
  /** System message - instructions for the model */
  system?: string;
  
  /** Array of conversation messages */
  messages: ChatMessage[];
  
  /** Model identifier - overrides defaultModel */
  model?: string;
  
  /** Optional Zod schema for structured JSON responses */
  responseSchema?: z.ZodSchema;
  
  /** Temperature for response randomness (0-2) */
  temperature?: number;
  
  /** Nucleus sampling parameter */
  top_p?: number;
  
  /** Maximum tokens in response */
  max_tokens?: number;
  
  /** Enable streaming mode */
  stream?: boolean;
  
  /** Additional HTTP headers (e.g., organization routing) */
  extraHeaders?: Record<string, string>;
}

/**
 * Successful chat completion response
 */
export interface ChatSuccess {
  /** Unique completion ID */
  id: string;
  
  /** Unix timestamp of completion */
  created: number;
  
  /** Model used for completion */
  model: string;
  
  /** Token usage statistics */
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  
  /** Assistant's response content */
  content: string;
  
  /** Validated JSON object when responseSchema is provided */
  json?: unknown;
}

/**
 * Constructor options for OpenRouterService
 */
export interface OpenRouterServiceOptions {
  /** OpenRouter API key (required) */
  apiKey: string;
  
  /** Base URL for OpenRouter API - defaults to https://openrouter.ai/api/v1 */
  baseUrl?: string;
  
  /** Default model identifier */
  defaultModel?: string;
  
  /** Default temperature for requests */
  defaultTemperature?: number;
  
  /** Request timeout in milliseconds - defaults to 60000 (60 seconds) */
  timeout?: number;
  
  /** Maximum retry attempts for transient errors - defaults to 3 */
  maxRetries?: number;
  
  /** Custom fetch implementation for dependency injection */
  fetchFn?: typeof fetch;
}

/**
 * OpenRouter API request payload structure
 * @internal
 */
export interface OpenRouterRequestPayload {
  model: string;
  messages: ChatMessage[];
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;
  response_format?: {
    type: 'json_schema';
    json_schema: {
      name: string;
      strict: boolean;
      schema: unknown;
    };
  };
}

/**
 * OpenRouter API response structure
 * @internal
 */
export interface OpenRouterResponse {
  id: string;
  created: number;
  model: string;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  error?: {
    message: string;
    code?: string;
    type?: string;
  };
}
