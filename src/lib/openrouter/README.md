# OpenRouter Service

A strongly-typed TypeScript wrapper around the OpenRouter Chat Completion HTTP API with first-class support for structured JSON responses using Zod schemas.

## Features

- ✅ **Type-safe** - Full TypeScript support with strict typing
- ✅ **Structured Outputs** - Native support for Zod schema validation
- ✅ **Error Handling** - Comprehensive custom error hierarchy
- ✅ **Retry Logic** - Exponential backoff for transient failures
- ✅ **Timeout Support** - Configurable request timeouts with AbortController
- ✅ **Streaming** - Support for Server-Sent Events streaming
- ✅ **Testable** - Dependency injection for easy mocking

## Installation

The service is already included in the project. The required dependency `zod-to-json-schema` is already installed.

## Configuration

### Environment Variables

Add your OpenRouter API key to `.env`:

```bash
OPENROUTER_API_KEY=your_api_key_here
```

Get your API key from [https://openrouter.ai](https://openrouter.ai)

### Initialization

The service is automatically initialized in `src/middleware/index.ts` on application startup:

```typescript
import { AIService } from '../lib/services/ai.service';

AIService.initialize(import.meta.env.OPENROUTER_API_KEY);
```

## Usage

### Basic Chat Completion

```typescript
import { OpenRouterService } from '@/lib/openrouter';

const service = new OpenRouterService({ 
  apiKey: import.meta.env.OPENROUTER_API_KEY,
  defaultModel: 'openai/gpt-4o-mini',
  timeout: 60000, // 60 seconds
});

const response = await service.chat({
  system: 'You are a helpful assistant',
  messages: [
    { role: 'user', content: 'What is the capital of France?' }
  ]
});

console.log(response.content); // "The capital of France is Paris."
```

### Structured JSON Responses

```typescript
import { z } from 'zod';

// Define your schema
const weatherSchema = z.object({ 
  city: z.string(), 
  temperature: z.number(),
  conditions: z.string(),
  humidity: z.number()
});

// Request structured output
const response = await service.chat({
  system: 'You are a weather information bot. Always respond with valid JSON.',
  messages: [
    { role: 'user', content: 'What is the weather in Paris?' }
  ],
  responseSchema: weatherSchema
});

// Validated and typed result
console.log(response.json); // { city: 'Paris', temperature: 17, ... }
```

### Advanced Options

```typescript
const response = await service.chat({
  system: 'You are a travel planner',
  messages: [
    { role: 'user', content: 'Plan a 3-day trip to Rome' }
  ],
  model: 'openai/gpt-4o',           // Override default model
  temperature: 0.7,                  // Control randomness
  max_tokens: 2000,                  // Limit response length
  top_p: 0.9,                        // Nucleus sampling
  extraHeaders: {                    // Custom headers
    'X-Organization': 'my-org'
  }
});
```

### Streaming Responses

```typescript
const stream = await service.stream({
  messages: [
    { role: 'user', content: 'Write a short story' }
  ]
});

// Process the stream
const reader = stream.getReader();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  // Process chunk
  console.log(value);
}
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `apiKey` | `string` | **required** | OpenRouter API key |
| `baseUrl` | `string` | `https://openrouter.ai/api/v1` | API endpoint URL (must be HTTPS) |
| `defaultModel` | `string` | `openai/gpt-3.5-turbo` | Default model to use |
| `defaultTemperature` | `number` | `undefined` | Default temperature (0-2) |
| `timeout` | `number` | `60000` | Request timeout in milliseconds |
| `maxRetries` | `number` | `3` | Maximum retry attempts for transient errors |
| `fetchFn` | `typeof fetch` | `fetch` | Custom fetch implementation (for testing) |

## Error Handling

The service provides a comprehensive error hierarchy:

### Error Types

- **ConfigurationError** - Invalid configuration (missing API key, non-HTTPS URL)
- **RequestValidationError** - Invalid request parameters (empty messages)
- **OpenRouterHttpError** - HTTP-level errors (status codes)
- **OpenRouterApiError** - API-level errors (error in response payload)
- **JsonValidationError** - Zod schema validation failures
- **TimeoutError** - Request exceeded timeout duration
- **StreamingError** - Streaming response errors

### Error Handling Example

```typescript
import {
  OpenRouterHttpError,
  TimeoutError,
  JsonValidationError
} from '@/lib/openrouter';

try {
  const response = await service.chat({
    messages: [{ role: 'user', content: 'Hello!' }]
  });
} catch (error) {
  if (error instanceof TimeoutError) {
    console.error('Request timed out:', error.meta?.timeout);
  } else if (error instanceof OpenRouterHttpError) {
    console.error('HTTP Error:', error.status, error.body);
  } else if (error instanceof JsonValidationError) {
    console.error('Validation failed:', error.meta?.errors);
  } else {
    console.error('Unexpected error:', error);
  }
}
```

## Retry Logic

The service automatically retries transient errors with exponential backoff:

- **Retryable errors**: Network errors, 5xx server errors, 429 rate limits
- **Non-retryable errors**: Validation errors, 4xx client errors (except 429), timeouts
- **Backoff strategy**: 1s, 2s, 4s, 8s (max 10s)
- **Max retries**: 3 (configurable)

## Integration with AIService

The OpenRouterService is integrated with the AIService for itinerary generation:

```typescript
// In src/lib/services/ai.service.ts
import { OpenRouterService } from '../openrouter';

export class AIService {
  static async generateItinerary(
    tripNote: TripNoteDTO, 
    preferences: UserPreferenceDTO[],
    useMock = false
  ): Promise<AIGenerationResult> {
    if (useMock) {
      return await this.generateMockItinerary(tripNote, preferences);
    }

    const response = await this.openRouterService.chat({
      system: 'You are a professional travel planner...',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7,
      max_tokens: 4000,
    });

    return {
      itinerary: response.content,
      durationMs: /* ... */,
      suggestedTripLength: tripNote.approximateTripLength,
    };
  }
}
```

## Testing

The service supports dependency injection for easy testing:

```typescript
// Mock fetch for unit tests
const mockFetch = vi.fn();

const service = new OpenRouterService({
  apiKey: 'test-key',
  fetchFn: mockFetch
});

// Configure mock response
mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({
    id: 'test-id',
    created: Date.now(),
    model: 'test-model',
    usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    choices: [{
      message: { role: 'assistant', content: 'Test response' },
      finish_reason: 'stop'
    }]
  })
});

// Test your code
const response = await service.chat({
  messages: [{ role: 'user', content: 'Test' }]
});
```

## Available Models

The service supports all OpenRouter models. Popular choices:

- `openai/gpt-4o` - Latest GPT-4 Omni
- `openai/gpt-4o-mini` - Cost-effective GPT-4 variant
- `anthropic/claude-3.5-sonnet` - Claude 3.5 Sonnet
- `google/gemini-pro` - Google Gemini Pro
- `meta-llama/llama-3.1-70b-instruct` - Llama 3.1

See [OpenRouter Models](https://openrouter.ai/models) for the full list.

## API Reference

### `OpenRouterService.chat(params: ChatParams): Promise<ChatSuccess>`

Sends a chat completion request.

**Parameters:**
- `params.system` - System message (instructions)
- `params.messages` - Array of conversation messages
- `params.model` - Model identifier (optional)
- `params.responseSchema` - Zod schema for structured output (optional)
- `params.temperature` - Response randomness 0-2 (optional)
- `params.top_p` - Nucleus sampling (optional)
- `params.max_tokens` - Maximum response length (optional)
- `params.extraHeaders` - Additional HTTP headers (optional)

**Returns:** `ChatSuccess` object with:
- `id` - Completion ID
- `created` - Unix timestamp
- `model` - Model used
- `usage` - Token usage statistics
- `content` - Assistant response text
- `json` - Validated JSON (if responseSchema provided)

### `OpenRouterService.stream(params: ChatParams): Promise<ReadableStream>`

Sends a streaming chat completion request.

### `OpenRouterService.validateJson<T>(schema: ZodSchema<T>, raw: string): T`

Static helper to validate JSON against a Zod schema.

## Support

For issues with:
- **This wrapper**: Check error messages and retry logic
- **OpenRouter API**: See [OpenRouter Docs](https://openrouter.ai/docs)
- **Model behavior**: Check model documentation on OpenRouter

## License

Part of the 10xDevs Travels project.
