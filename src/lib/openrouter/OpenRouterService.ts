import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";
import type {
  ChatParams,
  ChatSuccess,
  OpenRouterServiceOptions,
  OpenRouterRequestPayload,
  OpenRouterResponse,
  ChatMessage,
} from "./types";
import {
  ConfigurationError,
  RequestValidationError,
  OpenRouterHttpError,
  OpenRouterApiError,
  JsonValidationError,
  TimeoutError,
} from "./errors";

/**
 * OpenRouterService
 *
 * A strongly-typed wrapper around the OpenRouter Chat Completion HTTP API.
 * Provides standardized request/response handling with first-class support
 * for structured JSON responses using Zod schemas.
 *
 * @example
 * ```ts
 * const service = new OpenRouterService({
 *   apiKey: import.meta.env.OPENROUTER_API_KEY
 * });
 *
 * const response = await service.chat({
 *   system: 'You are a helpful assistant',
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 *
 * console.log(response.content);
 * ```
 */
export class OpenRouterService {
  readonly #apiKey: string;
  readonly #baseUrl: string;
  readonly #defaultModel?: string;
  readonly #defaultTemperature?: number;
  readonly #timeout: number;
  readonly #maxRetries: number;
  readonly #fetch: typeof fetch;

  /**
   * Creates a new OpenRouterService instance
   *
   * @param options - Configuration options
   * @throws {ConfigurationError} When apiKey is missing or baseUrl is not HTTPS
   */
  constructor(options: OpenRouterServiceOptions) {
    // Validate required API key
    if (!options.apiKey || options.apiKey.trim() === "") {
      throw new ConfigurationError("API key is required", {
        field: "apiKey",
      });
    }

    // Set base URL with default
    const baseUrl = options.baseUrl ?? "https://openrouter.ai/api/v1";

    // Enforce HTTPS for security
    if (!baseUrl.startsWith("https://")) {
      throw new ConfigurationError("Base URL must use HTTPS protocol", {
        field: "baseUrl",
        provided: baseUrl,
      });
    }

    this.#apiKey = options.apiKey;
    this.#baseUrl = baseUrl;
    this.#defaultModel = options.defaultModel;
    this.#defaultTemperature = options.defaultTemperature;
    this.#timeout = options.timeout ?? 60000; // Default 60 seconds
    this.#maxRetries = options.maxRetries ?? 3; // Default 3 retries
    this.#fetch = options.fetchFn ?? fetch;
  }

  /**
   * Sends a chat completion request and returns the full parsed response
   *
   * @param params - Chat parameters including messages and optional schema
   * @returns Promise resolving to ChatSuccess with content and optional validated JSON
   * @throws {RequestValidationError} When parameters are invalid
   * @throws {OpenRouterHttpError} When API returns non-2xx status
   * @throws {OpenRouterApiError} When API returns error in response payload
   * @throws {JsonValidationError} When responseSchema validation fails
   * @throws {TimeoutError} When request exceeds timeout duration
   */
  async chat(params: ChatParams): Promise<ChatSuccess> {
    // Validate messages array is not empty (guard clause)
    if (!params.messages || params.messages.length === 0) {
      throw new RequestValidationError("Messages array cannot be empty", {
        field: "messages",
      });
    }

    // Use retry wrapper for transient errors
    return this.#withRetry(async () => {
      // Build request payload
      const payload = this.#buildPayload(params);

      // Prepare headers
      const headers: Record<string, string> = {
        Authorization: `Bearer ${this.#apiKey}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://10xdevs-travels.app", // Optional OpenRouter guidelines
        "X-Title": "10xDevs Travels", // Optional OpenRouter guidelines
        ...params.extraHeaders,
      };

      // Create AbortController for timeout
      const abortController = new AbortController();
      const timeoutId = setTimeout(() => abortController.abort(), this.#timeout);

      try {
        // Send request
        const url = `${this.#baseUrl}/chat/completions`;
        const response = await this.#fetch(url, {
          method: "POST",
          headers,
          body: JSON.stringify(payload),
          signal: abortController.signal,
        });

        // Handle HTTP errors
        await this.#handleHttpErrors(response);

        // Parse JSON response
        const data = (await response.json()) as OpenRouterResponse;

        // Check for API-level errors
        if (data.error) {
          throw new OpenRouterApiError(data.error.message || "Unknown API error", {
            code: data.error.code,
            type: data.error.type,
          });
        }

        // Extract content from first choice
        const content = data.choices?.[0]?.message?.content ?? "";

        // Build success response
        const result: ChatSuccess = {
          id: data.id,
          created: data.created,
          model: data.model,
          usage: data.usage,
          content,
        };

        // If responseSchema provided, validate and attach JSON
        if (params.responseSchema) {
          result.json = this.#extractStructured(content, params.responseSchema);
        }

        return result;
      } catch (error) {
        // Handle abort/timeout
        if (error instanceof Error && error.name === "AbortError") {
          throw new TimeoutError(`Request timed out after ${this.#timeout}ms`, {
            timeout: this.#timeout,
          });
        }
        throw error;
      } finally {
        clearTimeout(timeoutId);
      }
    });
  }

  /**
   * Sends a streaming chat completion request
   *
   * @param params - Chat parameters
   * @returns Promise resolving to ReadableStream of incremental tokens
   * @throws {RequestValidationError} When parameters are invalid
   * @throws {OpenRouterHttpError} When API returns non-2xx status
   * @throws {TimeoutError} When request exceeds timeout duration
   */
  async stream(params: ChatParams): Promise<ReadableStream> {
    // Validate messages array is not empty
    if (!params.messages || params.messages.length === 0) {
      throw new RequestValidationError("Messages array cannot be empty", {
        field: "messages",
      });
    }

    // Build payload with stream enabled
    const payload = this.#buildPayload({ ...params, stream: true });

    // Prepare headers for streaming
    const headers: Record<string, string> = {
      Authorization: `Bearer ${this.#apiKey}`,
      "Content-Type": "application/json",
      Accept: "text/event-stream",
      "HTTP-Referer": "https://10xdevs-travels.app",
      "X-Title": "10xDevs Travels",
      ...params.extraHeaders,
    };

    // Create AbortController for timeout
    const abortController = new AbortController();
    const timeoutId = setTimeout(() => abortController.abort(), this.#timeout);

    try {
      // Send request
      const url = `${this.#baseUrl}/chat/completions`;
      const response = await this.#fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify(payload),
        signal: abortController.signal,
      });

      // Handle HTTP errors
      await this.#handleHttpErrors(response);

      // Return the response body stream
      if (!response.body) {
        throw new OpenRouterHttpError("No response body received", response.status);
      }

      return response.body;
    } catch (error) {
      // Handle abort/timeout
      if (error instanceof Error && error.name === "AbortError") {
        throw new TimeoutError(`Request timed out after ${this.#timeout}ms`, {
          timeout: this.#timeout,
        });
      }
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  /**
   * Static helper to validate JSON string against Zod schema
   *
   * @param schema - Zod schema to validate against
   * @param raw - Raw JSON string
   * @returns Validated and typed object
   * @throws {JsonValidationError} When parsing or validation fails
   */
  static validateJson<T>(schema: z.ZodSchema<T>, raw: string): T {
    try {
      const parsed = JSON.parse(raw);
      return schema.parse(parsed);
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new JsonValidationError("Schema validation failed", {
          errors: error.errors,
          raw,
        });
      }
      throw new JsonValidationError("Failed to parse JSON", {
        error: error instanceof Error ? error.message : String(error),
        raw,
      });
    }
  }

  /**
   * Builds the OpenRouter API request payload
   * Merges system message with messages array and applies model parameters
   *
   * @param params - Chat parameters
   * @returns OpenRouter-compliant request payload
   */
  #buildPayload(params: ChatParams): OpenRouterRequestPayload {
    // Start with messages array
    const messages: ChatMessage[] = [...params.messages];

    // Prepend system message if provided
    if (params.system) {
      messages.unshift({
        role: "system",
        content: params.system,
      });
    }

    // Build base payload
    const payload: OpenRouterRequestPayload = {
      model: params.model ?? this.#defaultModel ?? "openai/gpt-3.5-turbo",
      messages,
    };

    // Add optional parameters
    if (params.temperature !== undefined) {
      payload.temperature = params.temperature;
    } else if (this.#defaultTemperature !== undefined) {
      payload.temperature = this.#defaultTemperature;
    }

    if (params.top_p !== undefined) {
      payload.top_p = params.top_p;
    }

    if (params.max_tokens !== undefined) {
      payload.max_tokens = params.max_tokens;
    }

    if (params.stream !== undefined) {
      payload.stream = params.stream;
    }

    // Add response_format for structured outputs
    if (params.responseSchema) {
      // Convert Zod schema to JSON Schema
      // Note: You'll need to install zod-to-json-schema package
      // For now, we'll use a simplified approach
      const schemaName = this.#generateSchemaName(params.responseSchema);

      payload.response_format = {
        type: "json_schema",
        json_schema: {
          name: schemaName,
          strict: true,
          schema: this.#zodToJsonSchema(params.responseSchema),
        },
      };
    }

    return payload;
  }

  /**
   * Handles HTTP-level errors from fetch responses
   *
   * @param response - Fetch response object
   * @throws {OpenRouterHttpError} When status is not 2xx
   */
  async #handleHttpErrors(response: Response): Promise<void> {
    if (!response.ok) {
      let body = "";
      try {
        body = await response.text();
      } catch {
        // Ignore body parsing errors
      }

      throw new OpenRouterHttpError(`HTTP ${response.status}: ${response.statusText}`, response.status, body);
    }
  }

  /**
   * Extracts and validates structured JSON from response content
   *
   * @param content - Assistant response content
   * @param schema - Zod schema for validation
   * @returns Validated JSON object
   * @throws {JsonValidationError} When validation fails
   */
  #extractStructured(content: string, schema: z.ZodSchema): unknown {
    return OpenRouterService.validateJson(schema, content);
  }

  /**
   * Generates a schema name from Zod schema
   * Converts camelCase to kebab-case
   *
   * @param schema - Zod schema
   * @returns Schema name in kebab-case
   */
  #generateSchemaName(schema: z.ZodSchema): string {
    // Try to get description or use default
    const description = (schema as { description?: string }).description;
    if (description) {
      return description.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase();
    }
    return "response-schema";
  }

  /**
   * Converts Zod schema to JSON Schema format
   * Uses zod-to-json-schema library for proper conversion
   *
   * @param schema - Zod schema
   * @returns JSON Schema object
   */
  #zodToJsonSchema(schema: z.ZodSchema): unknown {
    return zodToJsonSchema(schema, {
      target: "openApi3",
      $refStrategy: "none",
    });
  }

  /**
   * Wraps an async operation with retry logic for transient errors
   * Uses exponential backoff strategy
   *
   * @param operation - Async operation to retry
   * @returns Result of the operation
   * @throws Last error if all retries are exhausted
   */
  async #withRetry<T>(operation: () => Promise<T>): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt <= this.#maxRetries; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Don't retry on non-transient errors
        if (
          error instanceof RequestValidationError ||
          error instanceof ConfigurationError ||
          error instanceof JsonValidationError ||
          error instanceof TimeoutError
        ) {
          throw error;
        }

        // Don't retry on client errors (4xx except 429 rate limit)
        if (error instanceof OpenRouterHttpError) {
          if (error.status >= 400 && error.status < 500 && error.status !== 429) {
            throw error;
          }
        }

        // If this was the last attempt, throw the error
        if (attempt === this.#maxRetries) {
          throw error;
        }

        // Calculate exponential backoff: 1s, 2s, 4s, 8s, etc.
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 10000);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }

    // This should never be reached, but TypeScript needs it
    throw lastError || new Error("Operation failed after retries");
  }
}
