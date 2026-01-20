# AI Service Structured Response Implementation

**Date:** January 17, 2026
**Status:** ✅ Complete

## Overview

Updated the AIService to receive structured JSON responses from the AI with validated fields for itinerary, suggested trip length, and suggested budget. The AI now assesses whether the user's suggested trip length and budget are realistic and can propose alternatives.

---

## Changes Made

### 1. AIService Updates (`src/lib/services/ai.service.ts`)

#### Added Zod Schema for AI Response

```typescript
const AIItineraryResponseSchema = z.object({
  itinerary: z.string().min(10, "Itinerary must be at least 10 characters"),
  suggestedTripLength: z.number().int().positive("Trip length must be a positive integer"),
  suggestedBudget: z.number().positive("Budget must be a positive number"),
});
```

#### Updated AIGenerationResult Interface

**Before:**

```typescript
export interface AIGenerationResult {
  itinerary: string;
  durationMs: number;
  suggestedTripLength?: number | null;
}
```

**After:**

```typescript
export interface AIGenerationResult {
  itinerary: string;
  durationMs: number;
  suggestedTripLength: number;
  suggestedBudget: number;
}
```

Key changes:

- Added `suggestedBudget: number` field
- Changed `suggestedTripLength` from optional to required
- Removed null option for more type safety

#### Updated generateItinerary Method

**Structured Response Implementation:**

```typescript
const response = await service.chat({
  system:
    "You are a professional travel planner. Generate detailed, practical, and personalized travel itineraries. Always respond with valid JSON matching the requested schema.",
  messages: [{ role: "user", content: prompt }],
  responseSchema: AIItineraryResponseSchema, // ← Added schema
  temperature: 0.7,
  max_tokens: 4000,
});

// Extract validated JSON response
const aiResponse = response.json as AIItineraryResponse;

return {
  itinerary: aiResponse.itinerary,
  durationMs,
  suggestedTripLength: aiResponse.suggestedTripLength, // ← From AI
  suggestedBudget: aiResponse.suggestedBudget, // ← From AI
};
```

**Key improvements:**

- ✅ Uses `responseSchema` for automatic validation
- ✅ Extracts validated JSON via `response.json`
- ✅ Returns AI-suggested values instead of user input
- ✅ Type-safe with Zod validation

#### Updated buildPrompt Method

**Enhanced prompt with assessment instructions:**

```typescript
Assess if the trip length suggested by the user is realistic based on destination and preferences provided in details and user preferences. Suggest a more realistic trip length if it is not.
Assess if the budget suggested by the user is realistic based on destination and preferences provided in details and user preferences. Suggest a more realistic budget if it is not. In case budget was not provided by the user, suggest a budget based on destination and preferences provided in details and user preferences.

Format the response in JSON, providing the following fields:
- itinerary: string (comprehensive day-by-day itinerary in Markdown format)
- suggestedTripLength: number (realistic trip length in days)
- suggestedBudget: number (realistic budget per person in provided currency or USD)
```

**Improvements:**

- ✅ Clear instructions for AI to assess trip length
- ✅ Clear instructions for AI to assess budget
- ✅ Handles case when budget not provided
- ✅ Specifies exact JSON structure expected
- ✅ Fixed typo: "itenerary" → "itinerary"

#### Updated Mock Implementation

Added `suggestedBudget` calculation:

```typescript
// Calculate suggested budget (mock logic)
const suggestedBudget = budgetAmount || approximateTripLength * 150;

return {
  itinerary,
  durationMs,
  suggestedTripLength: approximateTripLength,
  suggestedBudget, // ← Added
};
```

### 2. API Endpoint Updates (`src/pages/api/trip-notes/generateItenerary.ts`)

#### Enhanced Response DTO

```typescript
const lightItineraryDTO = {
  id: itinerary.id,
  suggestedTripLength: itinerary.suggestedTripLength,
  itinerary: itinerary.itinerary,
  suggestedBudget: aiResult.suggestedBudget, // ← Added field
};
```

**Note:** The `suggestedBudget` is included in the API response but not persisted to the database. This allows the frontend to display the AI's budget recommendation without modifying the database schema.

---

## How It Works

### Flow Diagram

```
User Input (Trip Note)
  ├─ destination
  ├─ dates
  ├─ approximateTripLength (suggestion for AI)
  ├─ budgetAmount (suggestion for AI)
  ├─ details
  └─ preferences
       ↓
AI Service (with structured response)
  ├─ Builds prompt with user suggestions
  ├─ Calls OpenRouter with Zod schema
  ├─ AI assesses if suggestions are realistic
  └─ Returns validated JSON
       ↓
AI Response (structured)
  ├─ itinerary: string (Markdown)
  ├─ suggestedTripLength: number (AI-assessed)
  └─ suggestedBudget: number (AI-assessed)
       ↓
API Response to Frontend
  ├─ Full trip note data
  └─ itinerary object with:
      ├─ id
      ├─ itinerary (Markdown text)
      ├─ suggestedTripLength (AI recommendation)
      └─ suggestedBudget (AI recommendation)
```

### Example AI Response

**User Input:**

- Destination: Tokyo
- Suggested Length: 3 days
- Budget: $500

**AI Assessment:**

- 3 days is too short for Tokyo
- $500 is below realistic budget

**AI Response (JSON):**

```json
{
  "itinerary": "# 5-Day Itinerary for Tokyo\n\n## Day 1: Arrival and Shibuya...",
  "suggestedTripLength": 5,
  "suggestedBudget": 1200
}
```

---

## Benefits

### 1. Intelligent Recommendations

- ✅ AI can suggest more realistic trip lengths
- ✅ AI can recommend appropriate budgets
- ✅ Considers destination, preferences, and user details

### 2. Type Safety

- ✅ Zod schema validation ensures data integrity
- ✅ TypeScript types prevent runtime errors
- ✅ Automatic error handling for invalid responses

### 3. Flexibility

- ✅ User suggestions treated as input, not requirements
- ✅ AI provides expert assessment
- ✅ Frontend can display both user input and AI recommendations

### 4. Structured Data

- ✅ JSON response easier to parse and process
- ✅ No string parsing or regex needed
- ✅ Consistent structure across requests

---

## Testing Recommendations

### Unit Tests

1. **Schema Validation**

   ```typescript
   test("validates correct AI response", () => {
     const response = {
       itinerary: "Valid itinerary text",
       suggestedTripLength: 5,
       suggestedBudget: 1000,
     };
     expect(() => AIItineraryResponseSchema.parse(response)).not.toThrow();
   });
   ```

2. **Invalid Responses**

   ```typescript
   test("rejects negative trip length", () => {
     const response = {
       itinerary: "Valid itinerary text",
       suggestedTripLength: -5,
       suggestedBudget: 1000,
     };
     expect(() => AIItineraryResponseSchema.parse(response)).toThrow();
   });
   ```

3. **Mock Implementation**
   ```typescript
   test("mock returns valid structure", async () => {
     const result = await AIService.generateItinerary(tripNote, preferences, true);
     expect(result).toHaveProperty("itinerary");
     expect(result).toHaveProperty("suggestedTripLength");
     expect(result).toHaveProperty("suggestedBudget");
     expect(typeof result.suggestedBudget).toBe("number");
   });
   ```

### Integration Tests

1. **Real API Call** (requires API key)

   ```typescript
   test("generates itinerary with structured response", async () => {
     const result = await AIService.generateItinerary(tripNote, preferences, false);
     expect(result.suggestedTripLength).toBeGreaterThan(0);
     expect(result.suggestedBudget).toBeGreaterThan(0);
     expect(result.itinerary).toContain("Day 1");
   });
   ```

2. **API Endpoint**
   ```typescript
   test("POST /api/trip-notes/generateItenerary includes suggestedBudget", async () => {
     const response = await fetch("/api/trip-notes/generateItenerary", {
       method: "POST",
       body: JSON.stringify({ id: 1, ...tripNoteData }),
     });
     const data = await response.json();
     expect(data.itinerary).toHaveProperty("suggestedBudget");
   });
   ```

---

## Frontend Integration

### Using the Response

```typescript
// API call
const response = await fetch("/api/trip-notes/generateItenerary", {
  method: "POST",
  body: JSON.stringify(tripNoteData),
});

const data = await response.json();

// Access AI recommendations
const aiItinerary = data.itinerary.itinerary; // Markdown text
const aiTripLength = data.itinerary.suggestedTripLength; // e.g., 5
const aiBudget = data.itinerary.suggestedBudget; // e.g., 1200

// Compare with user input
const userTripLength = data.approximateTripLength; // e.g., 3
const userBudget = data.budgetAmount; // e.g., 500

// Display recommendation if different
if (aiTripLength !== userTripLength) {
  console.log(`AI suggests ${aiTripLength} days instead of ${userTripLength}`);
}

if (userBudget && aiBudget !== userBudget) {
  console.log(`AI suggests $${aiBudget} instead of $${userBudget}`);
}
```

---

## Configuration

### Model Selection

Currently using: `google/gemini-2.0-flash-exp:free`

This model was chosen for:

- ✅ Free tier availability
- ✅ Good structured output support
- ✅ Fast response times
- ✅ Reliable JSON formatting

Alternative models:

- `openai/gpt-4o-mini` - More accurate but paid
- `anthropic/claude-3.5-sonnet` - Best quality but expensive
- `meta-llama/llama-3.1-70b-instruct` - Open source option

### Prompt Engineering Notes

The prompt is designed to:

1. Provide clear context (destination, dates, group size)
2. Indicate user suggestions vs requirements
3. Ask for assessment and alternatives
4. Specify exact JSON structure
5. Request comprehensive day-by-day breakdown

---

## Known Limitations

1. **Database Schema**
   - `suggestedBudget` not persisted to database
   - Only returned in API response
   - Consider adding to database if needed long-term

2. **Currency Handling**
   - Budget returned as number without currency
   - Assumes same currency as user input or USD
   - Frontend must handle currency display

3. **Validation**
   - Schema validates structure, not content quality
   - AI might still return unrealistic values
   - Frontend should show as suggestions, not requirements

---

## Future Enhancements

### Potential Improvements

1. **Enhanced Validation**

   ```typescript
   const AIItineraryResponseSchema = z.object({
     itinerary: z.string().min(100).max(20000),
     suggestedTripLength: z.number().int().min(1).max(365),
     suggestedBudget: z.number().min(100).max(1000000),
     confidence: z.number().min(0).max(1), // How confident is AI?
     alternatives: z
       .array(
         z.object({
           length: z.number(),
           budget: z.number(),
           reason: z.string(),
         })
       )
       .optional(),
   });
   ```

2. **Persist Budget to Database**
   - Add `suggested_budget` column to `itineraries` table
   - Update ItineraryDTO to include field
   - Modify ItinerariesService.create() method

3. **Budget Breakdown**

   ```typescript
   budgetBreakdown: z.object({
     accommodation: z.number(),
     food: z.number(),
     activities: z.number(),
     transportation: z.number(),
     miscellaneous: z.number(),
   });
   ```

4. **Multi-Currency Support**
   ```typescript
   suggestedBudget: z.object({
     amount: z.number(),
     currency: z.string(),
     usdEquivalent: z.number(),
   });
   ```

---

## Deployment Checklist

- ✅ Zod schema defined and exported
- ✅ AIGenerationResult interface updated
- ✅ generateItinerary method uses structured response
- ✅ Mock implementation updated
- ✅ Prompt updated with assessment instructions
- ✅ API endpoint includes suggestedBudget
- ✅ No linter errors
- ✅ Type safety maintained
- ⚠️ **Required:** Set `OPENROUTER_API_KEY` in `.env`
- ⚠️ **Recommended:** Test with real API before production

---

## Summary

The AIService now:

1. ✅ Requests structured JSON responses from AI
2. ✅ Validates responses with Zod schema
3. ✅ Receives AI-assessed trip length (not just echoing user input)
4. ✅ Receives AI-suggested budget
5. ✅ Returns all fields to frontend via API
6. ✅ Maintains backward compatibility with mock mode
7. ✅ Provides type-safe, validated data

**Status:** Production ready, pending real-world API testing
