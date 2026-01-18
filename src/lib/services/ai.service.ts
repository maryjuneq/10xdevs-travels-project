/**
 * AI Service
 * Handles AI-powered itinerary generation using OpenRouter API
 */

import { z } from 'zod';
import { OpenRouterService } from '../openrouter';
import type { TripNoteDTO, UserPreferenceDTO } from "../../types";

/**
 * Zod schema for AI-generated itinerary response
 * Validates the structured JSON response from the AI model
 * Note: suggestedTripLength and suggestedBudget are optional - AI may not always provide them
 */
const AIItineraryResponseSchema = z.object({
  itinerary: z.string().min(10, "Itinerary must be at least 10 characters"),
  suggestedTripLength: z.number().int().positive("Trip length must be a positive integer").optional(),
  suggestedBudget: z.string().min(1).optional(),
});

/**
 * Type inference from the AI response schema
 */
type AIItineraryResponse = z.infer<typeof AIItineraryResponseSchema>;

/**
 * Result returned from AI generation
 */
export interface AIGenerationResult {
  itinerary: string;
  durationMs: number;
  suggestedTripLength?: number;
  suggestedBudget?: string;
}

/**
 * AI Service
 * Provides methods for AI-powered itinerary generation
 */
export class AIService {
  private static openRouterService: OpenRouterService | null = null;

  /**
   * Initializes the OpenRouter service with API key
   * Call this once at application startup
   * 
   * @param apiKey - OpenRouter API key
   */
  static initialize(apiKey: string): void {
    this.openRouterService = new OpenRouterService({
      apiKey,
      defaultModel: 'openai/gpt-oss-120b:free',
      defaultTemperature: 0.7,
      timeout: 120000, // 120 seconds (increased for longer responses)
      maxRetries: 3,
    });
  }

  /**
   * Gets the OpenRouter service instance
   * 
   * @returns OpenRouterService instance
   * @throws Error if service is not initialized
   */
  private static getService(): OpenRouterService {
    if (!this.openRouterService) {
      throw new Error('AIService not initialized. Call AIService.initialize() first.');
    }
    return this.openRouterService;
  }

  /**
   * Generates a travel itinerary based on trip note and user preferences
   *
   * @param tripNote - The trip note data (destination, dates, budget, etc.)
   * @param preferences - User's saved travel preferences
   * @param useMock - If true, returns mock data; if false, uses real OpenRouter API
   * @returns Promise<AIGenerationResult> - Generated itinerary with metadata
   * @throws Error if generation fails
   */
  static async generateItinerary(
    tripNote: TripNoteDTO, 
    preferences: UserPreferenceDTO[],
    useMock = false
  ): Promise<AIGenerationResult> {
    const startTime = performance.now();

    try {
      // Use mock implementation if requested or service not initialized
      if (useMock || !this.openRouterService) {
        return await this.generateMockItinerary(tripNote, preferences, startTime);
      }

      // Build prompt for AI
      const prompt = this.buildPrompt(tripNote, preferences);

      // Call OpenRouter API with structured response schema
      const service = this.getService();
      const response = await service.chat({
        system: 'You are a professional travel planner. Generate detailed, practical, and personalized travel itineraries. Always respond with valid JSON matching the requested schema. Keep responses concise but informative.',
        messages: [
          { role: 'user', content: prompt }
        ],
        responseSchema: AIItineraryResponseSchema,
        temperature: 0.7,
        max_tokens: 8000, // Increased to handle longer itineraries
      });

      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      // Extract validated JSON response
      const aiResponse = response.json as AIItineraryResponse;

      return {
        itinerary: aiResponse.itinerary,
        durationMs,
        suggestedTripLength: aiResponse.suggestedTripLength,
        suggestedBudget: aiResponse.suggestedBudget,
      };
    } catch (error) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      console.error("AI generation error:", error);
      throw new Error(`AI generation failed after ${durationMs}ms: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generates a mock itinerary for development and testing
   *
   * @param tripNote - Trip note data
   * @param preferences - User preferences
   * @param startTime - Start time for duration calculation
   * @returns Promise<AIGenerationResult> - Mock result with itinerary
   */
  private static async generateMockItinerary(
    tripNote: TripNoteDTO, 
    preferences: UserPreferenceDTO[],
    startTime: number
  ): Promise<AIGenerationResult> {
    // MOCK: Simulate API latency (2-4 seconds)
    const mockLatency = Math.random() * 2000 + 2000;
    await new Promise((resolve) => setTimeout(resolve, mockLatency));

    const { destination, groupSize, approximateTripLength, budgetAmount, currency, details } = tripNote;

    // Build preference summary
    const prefSummary =
      preferences.length > 0
        ? `\n\nYour preferences:\n${preferences.map((p) => `- ${p.category}: ${p.preferenceText}`).join("\n")}`
        : "";

    // Calculate suggested budget (mock logic)
    const budgetValue = budgetAmount || (approximateTripLength * 150); // Default $150/day if not provided
    const suggestedBudget = `${budgetValue} ${currency || "USD"}`;

    // Generate mock itinerary text
    const itinerary = `# ${approximateTripLength}-Day Itinerary for ${destination}

## Trip Overview
- **Group Size:** ${groupSize} ${groupSize === 1 ? "person" : "people"}
- **Duration:** ${approximateTripLength} days
${budgetAmount ? `- **Budget:** ${budgetAmount} ${currency || "USD"} per person` : ""}
${details ? `- **Special Notes:** ${details}` : ""}
${prefSummary}

## Daily Itinerary

${this.generateMockDays(approximateTripLength, destination)}

## Travel Tips
- Book accommodations in advance for the best rates
- Consider purchasing travel insurance
- Check visa requirements for ${destination}
- Download offline maps before your trip

## Budget Breakdown
${
  budgetAmount
    ? `- Accommodation: ${Math.round(budgetAmount * 0.35)} ${currency || "USD"}
- Food & Dining: ${Math.round(budgetAmount * 0.25)} ${currency || "USD"}
- Activities: ${Math.round(budgetAmount * 0.2)} ${currency || "USD"}
- Transportation: ${Math.round(budgetAmount * 0.15)} ${currency || "USD"}
- Miscellaneous: ${Math.round(budgetAmount * 0.05)} ${currency || "USD"}`
    : "Budget breakdown not available (no budget specified)"
}

---
*This is a MOCK itinerary generated for development purposes.*`;

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    return {
      itinerary,
      durationMs,
      suggestedTripLength: approximateTripLength,
      suggestedBudget,
    };
  }

  /**
   * Generates mock daily activities
   *
   * @param days - Number of days
   * @param destination - Trip destination
   * @returns string - Formatted daily activities
   */
  private static generateMockDays(days: number, destination: string): string {
    const activities = [
      "Explore local markets and try authentic cuisine",
      "Visit historical landmarks and museums",
      "Take a guided city tour",
      "Relax at a local café and people-watch",
      "Discover hidden gems off the beaten path",
      "Experience local culture and traditions",
      "Enjoy outdoor activities and nature",
      "Sample street food and local specialties",
    ];

    const dayParts = ["Morning", "Afternoon", "Evening"];

    return Array.from({ length: days }, (_, i) => {
      const dayNum = i + 1;
      const activity = activities[i % activities.length];

      return `### Day ${dayNum}
${dayParts.map((part) => `**${part}:** ${activity}`).join("\n")}
`;
    }).join("\n");
  }

  /**
   * Builds a prompt for the AI model
   *
   * @param tripNote - Trip note data
   * @param preferences - User preferences
   * @returns string - Formatted prompt
   */
  private static buildPrompt(tripNote: TripNoteDTO, preferences: UserPreferenceDTO[]): string {
    const prefText =
      preferences.length > 0
        ? `\n\nUser Preferences:\n${preferences.map((p) => `- ${p.category}: ${p.preferenceText}`).join("\n")}`
        : "";

    return `Generate a detailed travel itinerary for the following trip:

Destination: ${tripNote.destination}
Travel Dates: Between ${tripNote.earliestStartDate} and ${tripNote.latestStartDate}
Duration suggested by the user: ${tripNote.approximateTripLength} days
Group Size: ${tripNote.groupSize} ${tripNote.groupSize === 1 ? "person" : "people"}
${tripNote.budgetAmount ? `Budget suggested by the user: ${tripNote.budgetAmount} ${tripNote.currency || "USD"} for group` : "Budget: Not provided by the user"}
${tripNote.currency ? `Preferred currency: ${tripNote.currency}` : "Currency: Not provided by the user"}
Details from the user: ${tripNote.details}. Those are additional details that user provided to help you plan the trip. Might be some atractions that user or their companions are interested in or other important notes. Use this as primary guideline and then propose additional destination, activities, etc to fill in the itinerary.
Please consider the following user preferences:
${prefText}
If they are about activities or attractions, please try to find something matching and include it in the itinerary.
If they are about food, please try to find something matching and include it in the itinerary.
If they are about transportation options, please include it in planning the itinerary.
If they are about accommodation preferences, please include it in planning the itinerary.
If they are about costs, please include it in planning budget.
They are important part of the planning, as those are general guideliness for all the trips that user is planning.

Please provide a comprehensive day-by-day itinerary including:
- Daily activities and attractions
- Recommended accommodations
- Dining suggestions
- Transportation options

IMPORTANT: Keep the itinerary concise and well-structured. For each day, provide 2-3 key activities with brief descriptions. Focus on quality over quantity.

Assess if the trip length suggested by the user is realistic based on destination and preferences provided in details and user preferences. Suggest a more realistic trip length if it is not.
Assess if the budget suggested by the user is realistic based on destination and preferences provided in details and user preferences. Suggest a more realistic budget if it is not. In case budget was not provided by the user, suggest a budget based on destination and preferences provided in details and user preferences.

Format the response in JSON, providing the following fields:
- itinerary: string (well-structured day-by-day itinerary in Markdown format with daily breakdown, accommodations, dining, transportation, etc. Keep it concise but informative - aim for 100-200 words per day)
- suggestedTripLength: number (realistic trip length in days based on your assessment)
- suggestedBudget: string (Realistic budget per whole group in the currency provided or USD if not specified. This should be a short string, just a number and currency, keep the details in itinerary field)`;
  }
}
