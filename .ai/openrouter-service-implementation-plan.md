# OpenRouter Service – Implementation Plan

## 1. Service description
The **OpenRouterService** is a thin, strongly-typed wrapper around the OpenRouter Chat Completion HTTP API. It standardises request/response handling, adds first-class support for structured `response_format` replies, and exposes a clear, testable interface that can be injected anywhere in the codebase.

Target stack:
* **TypeScript 5** – strict mode enabled.
* **Astro 5 / React 19** front-end – service will live under `src/lib/openrouter/` and can be imported on both client and server.
* **Fetch API** – polyfilled for Node via `undici` (already a transitive dep of Astro).

```
📁 src
 └─ lib
    └─ openrouter
       ├─ index.ts          ← public barrel
       ├─ OpenRouterService.ts  ← implementation (this plan)
       └─ errors.ts         ← typed error classes
```

---

## 2. Constructor description
```ts
constructor(options: {
  apiKey: string;            // required – `OPENROUTER_API_KEY`
  baseUrl?: string;          // defaults to `https://openrouter.ai/api/v1`
  defaultModel?: string;     // e.g. "openrouter/google/gemini-pro"
  defaultTemperature?: number; // fallback model params
  fetchFn?: typeof fetch;    // DI – allows mocking in unit tests
})
```
* Stores options in private readonly fields.
* Throws **ConfigurationError** if `apiKey` is missing.

---

## 3. Public methods and fields
| Method | Signature | Purpose |
|--------|-----------|---------|
| `chat` | `async chat(params: ChatParams): Promise<ChatSuccess>` | Main entry point – returns full parsed response. |
| `stream` | `async stream(params: ChatParams): Promise<ReadableStream>` | Returns a stream of incremental tokens (uses `accept: text/event-stream`). |
| `validateJson` | `static validateJson<T>(schema: ZodSchema, raw: string): T` | Helper to parse/validate structured outputs. |

### 3.1 Types
```ts
export interface ChatParams {
  system?: string;                 // system message
  messages: Array<{ role: 'user'|'assistant'|'system'; content: string }>;
  model?: string;                  // override defaultModel
  responseSchema?: z.ZodSchema;    // optional – turns on structured mode
  temperature?: number;            // model params
  top_p?: number;
  max_tokens?: number;
  stream?: boolean;                // forces `stream()` internally
  extraHeaders?: Record<string,string>; // e.g. organisation routing
}

export interface ChatSuccess {
  id: string;
  created: number;
  model: string;
  usage: { prompt_tokens: number; completion_tokens: number; total_tokens: number };
  content: string;                 // assistant answer
  json?: unknown;                  // validated object when responseSchema supplied
}
```

---

## 4. Private methods and fields
| Field | Type | Description |
|-------|------|-------------|
| `#apiKey` | `string` | secret header. |
| `#baseUrl` | `string` | endpoint root. |
| `#fetch` | `typeof fetch` | injected fetch impl. |

| Method | Purpose |
|--------|---------|
| `#buildPayload(params)` | Composes JSON body according to OpenRouter spec (system+user messages, model, params, `response_format`). |
| `#handleHttpErrors(res)` | Converts non-2xx fetch responses to typed errors. |
| `#decodeSse(stream)` | Parses `text/event-stream` for streaming mode. |
| `#extractStructured(response, schema)` | Uses Zod to validate JSON chunk inside assistant message. |

---

## 5. Error handling
Custom error hierarchy (`errors.ts`):
1. **ConfigurationError** – missing/invalid constructor options.
2. **RequestValidationError** – invalid user parameters (e.g. empty messages array).
3. **OpenRouterHttpError** – non-2xx status returned.  Includes `status`, `body`.
4. **OpenRouterApiError** – `error` property in JSON payload.
5. **StreamingError** – aborted/ill-formed event stream.
6. **JsonValidationError** – `responseSchema` fails validation.

All errors extend a common `BaseError` with `code`, `message`, `meta`.

---

## 6. Security considerations
* Never log the raw `apiKey`.
* Obfuscate sensitive request bodies when logging (strip system/user content in production logs).
* Enforce HTTPS in `baseUrl`.
* Set `timeout` & `AbortController` to avoid hanging connections.
* Prefer environment variable injection (`import.meta.env.OPENROUTER_API_KEY`) in Astro.

---

## 7. Step-by-step implementation plan

1. **Scaffold files** under `src/lib/openrouter/` as illustrated.
2. **Define error classes** in `errors.ts` extending `Error`.
3. **Implement constructor** – store options, default values, throw `ConfigurationError` when `apiKey` missing.
4. **Create `#buildPayload`**:
   1. Merge `system` + `messages` into array required by OpenRouter.
   2. When `responseSchema` present create
      ```ts
      {
        response_format: {
          type: 'json_schema',
          json_schema: {
            name: schemaName,   // derive from Zod input or param
            strict: true,
            schema: zodToJsonSchema(schema)
          }
        }
      }
      ```
   3. Add model & model params (temperature, top_p, etc.).
5. **Implement `chat`**:
   1. Validate `params.messages.length > 0` else throw `RequestValidationError`.
   2. Build payload, send `POST` to `${baseUrl}/chat/completions` with headers:
      * `Authorization: Bearer ${apiKey}`
      * `Content-Type: application/json`
      * `HTTP-Referer` / `X-Title` per OpenRouter guidelines (optional)
   3. Pass through `extraHeaders`.
   4. Await response; handle HTTP errors via `#handleHttpErrors`.
   5. Parse JSON; if payload contains `error`, throw `OpenRouterApiError`.
   6. Extract `content` (`choices[0].message.content`).
   7. If `responseSchema` given, call `#extractStructured` → attaches `json`.
6. **Implement `stream`**:
   1. Identical payload but `stream: true` and `accept: text/event-stream` header.
   2. Return parsed `ReadableStream` yielding individual tokens or JSON objects.
7. **Write unit tests** using `vitest` with mocked `fetch` and sample fixtures for both success and error cases.
8. **Add Zod helpers** (optional) – `schemaName` helper converts camelCase → kebab-case.
9. **Document usage** in `README.md` snippet:

   ```ts
   const service = new OpenRouterService({ apiKey: import.meta.env.OPENROUTER_API_KEY });
   const weatherSchema = z.object({ city: z.string(), temp: z.number() });

   const res = await service.chat({
     system: 'You are a helpful weather bot',
     messages: [{ role: 'user', content: 'Paris' }],
     responseSchema: weatherSchema
   });

   console.log(res.json); // { city: 'Paris', temp: 17 }
   ```
10. **Integrate** – export singleton via `src/lib/openrouter/index.ts` for easy imports.

---

## 8. Examples for core elements

1. **System message** – passed via `system` parameter or as first element in `messages`.
2. **User message** – included in `messages` array with `role: 'user'`.
3. **Structured response**:
   ```ts
   const todoSchema = z.object({ id: z.string(), title: z.string(), completed: z.boolean() });

   service.chat({
     system: 'Return JSON complying with given schema',
     messages: [{ role: 'user', content: 'Create todo "buy milk"' }],
     responseSchema: todoSchema
   });
   ```
4. **Model name override** – `model: 'openrouter/mistralai/mistral-7b-instruct'`.
5. **Model parameters** – `temperature: 0.2, top_p: 0.9, max_tokens: 256`.

All examples compile directly against the public `chat` signature.
