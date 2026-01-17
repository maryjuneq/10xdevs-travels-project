/**
 * OpenRouter Service Module
 * 
 * Provides a strongly-typed wrapper around the OpenRouter Chat Completion API
 * with support for structured JSON responses using Zod schemas.
 * 
 * @example
 * ```ts
 * import { OpenRouterService } from './lib/openrouter';
 * import { z } from 'zod';
 * 
 * const service = new OpenRouterService({ 
 *   apiKey: import.meta.env.OPENROUTER_API_KEY 
 * });
 * 
 * // Simple chat
 * const response = await service.chat({
 *   messages: [{ role: 'user', content: 'Hello!' }]
 * });
 * 
 * // Structured response
 * const weatherSchema = z.object({ 
 *   city: z.string(), 
 *   temp: z.number() 
 * });
 * 
 * const weatherResponse = await service.chat({
 *   system: 'You are a weather bot',
 *   messages: [{ role: 'user', content: 'Paris weather' }],
 *   responseSchema: weatherSchema
 * });
 * 
 * console.log(weatherResponse.json); // { city: 'Paris', temp: 17 }
 * ```
 */

export { OpenRouterService } from './OpenRouterService';

export type {
  ChatParams,
  ChatSuccess,
  ChatMessage,
  OpenRouterServiceOptions,
} from './types';

export {
  BaseError,
  ConfigurationError,
  RequestValidationError,
  OpenRouterHttpError,
  OpenRouterApiError,
  StreamingError,
  JsonValidationError,
  TimeoutError,
} from './errors';
