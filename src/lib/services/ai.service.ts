/**
 * AI Service
 * Handles AI-powered itinerary generation using OpenRouter API
 * Currently using MOCK implementation for development
 */

import type { TripNoteDTO, UserPreferenceDTO } from '../../types';

/**
 * Result returned from AI generation
 */
export type AIGenerationResult = {
  itinerary: string;
  durationMs: number;
  suggestedTripLength?: number | null;
};

/**
 * AI Service
 * Provides methods for AI-powered itinerary generation
 */
export class AIService {
  /**
   * Generates a travel itinerary based on trip note and user preferences
   * 
   * MOCK IMPLEMENTATION: Returns simulated itinerary for development
   * TODO: Replace with actual OpenRouter API integration
   * 
   * @param tripNote - The trip note data (destination, dates, budget, etc.)
   * @param preferences - User's saved travel preferences
   * @returns Promise<AIGenerationResult> - Generated itinerary with metadata
   * @throws Error if generation fails
   */
  static async generateItinerary(
    tripNote: TripNoteDTO,
    preferences: UserPreferenceDTO[]
  ): Promise<AIGenerationResult> {
    const startTime = performance.now();

    try {
      // MOCK: Simulate API latency (2-4 seconds)
      const mockLatency = Math.random() * 2000 + 2000;
      await new Promise(resolve => setTimeout(resolve, mockLatency));

      // Build mock itinerary based on trip note data
      const itinerary = this.generateMockItinerary(tripNote, preferences);
      
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);

      return {
        itinerary,
        durationMs,
        suggestedTripLength: tripNote.approximateTripLength,
      };
    } catch (error) {
      const endTime = performance.now();
      const durationMs = Math.round(endTime - startTime);
      
      console.error('AI generation error:', error);
      throw new Error(`AI generation failed after ${durationMs}ms: ${error}`);
    }
  }

  /**
   * Generates a mock itinerary for development and testing
   * 
   * @param tripNote - Trip note data
   * @param preferences - User preferences
   * @returns string - Formatted mock itinerary
   */
  private static generateMockItinerary(
    tripNote: TripNoteDTO,
    preferences: UserPreferenceDTO[]
  ): string {
    const { destination, groupSize, approximateTripLength, budgetAmount, currency, details } = tripNote;
    
    // Build preference summary
    const prefSummary = preferences.length > 0
      ? `\n\nYour preferences:\n${preferences.map(p => `- ${p.category}: ${p.preferenceText}`).join('\n')}`
      : '';

    // Generate mock itinerary text
    return `# ${approximateTripLength}-Day Itinerary for ${destination}

## Trip Overview
- **Group Size:** ${groupSize} ${groupSize === 1 ? 'person' : 'people'}
- **Duration:** ${approximateTripLength} days
${budgetAmount ? `- **Budget:** ${budgetAmount} ${currency || 'USD'} per person` : ''}
${details ? `- **Special Notes:** ${details}` : ''}
${prefSummary}

## Daily Itinerary

${this.generateMockDays(approximateTripLength, destination)}

## Travel Tips
- Book accommodations in advance for the best rates
- Consider purchasing travel insurance
- Check visa requirements for ${destination}
- Download offline maps before your trip

## Budget Breakdown
${budgetAmount 
  ? `- Accommodation: ${Math.round(budgetAmount * 0.35)} ${currency || 'USD'}
- Food & Dining: ${Math.round(budgetAmount * 0.25)} ${currency || 'USD'}
- Activities: ${Math.round(budgetAmount * 0.20)} ${currency || 'USD'}
- Transportation: ${Math.round(budgetAmount * 0.15)} ${currency || 'USD'}
- Miscellaneous: ${Math.round(budgetAmount * 0.05)} ${currency || 'USD'}`
  : 'Budget breakdown not available (no budget specified)'}

---
*This is a MOCK itinerary generated for development purposes.*`;
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
      'Explore local markets and try authentic cuisine',
      'Visit historical landmarks and museums',
      'Take a guided city tour',
      'Relax at a local café and people-watch',
      'Discover hidden gems off the beaten path',
      'Experience local culture and traditions',
      'Enjoy outdoor activities and nature',
      'Sample street food and local specialties',
    ];

    const dayParts = ['Morning', 'Afternoon', 'Evening'];
    
    return Array.from({ length: days }, (_, i) => {
      const dayNum = i + 1;
      const activity = activities[i % activities.length];
      
      return `### Day ${dayNum}
${dayParts.map(part => `**${part}:** ${activity}`).join('\n')}
`;
    }).join('\n');
  }

  /**
   * Builds a prompt for the AI model (for future implementation)
   * 
   * @param tripNote - Trip note data
   * @param preferences - User preferences
   * @returns string - Formatted prompt
   */
  private static buildPrompt(
    tripNote: TripNoteDTO,
    preferences: UserPreferenceDTO[]
  ): string {
    const prefText = preferences.length > 0
      ? `\n\nUser Preferences:\n${preferences.map(p => `- ${p.category}: ${p.preferenceText}`).join('\n')}`
      : '';

    return `Generate a detailed travel itinerary for the following trip:

Destination: ${tripNote.destination}
Travel Dates: Between ${tripNote.earliestStartDate} and ${tripNote.latestStartDate}
Duration: ${tripNote.approximateTripLength} days
Group Size: ${tripNote.groupSize} ${tripNote.groupSize === 1 ? 'person' : 'people'}
${tripNote.budgetAmount ? `Budget: ${tripNote.budgetAmount} ${tripNote.currency || 'USD'} per person` : ''}
${tripNote.details ? `Additional Details: ${tripNote.details}` : ''}
${prefText}

Please provide a comprehensive day-by-day itinerary including:
- Daily activities and attractions
- Recommended accommodations
- Dining suggestions
- Transportation options
- Budget breakdown
- Travel tips

Format the response in Markdown.`;
  }
}

