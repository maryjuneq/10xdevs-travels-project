import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { POST } from "../../../pages/api/trip-notes/generateItenerary";
import { TripNotesService } from "../../../lib/services/tripNotes.service";
import { PreferencesService } from "../../../lib/services/preferences.service";
import { AIService } from "../../../lib/services/ai.service";
import { ItinerariesService } from "../../../lib/services/itineraries.service";
import { JobsService } from "../../../lib/services/jobs.service";
import { NotFoundError, ValidationError } from "../../../lib/errors";
import type {
  TripNoteDTO,
  TripNoteEntity,
  ItineraryEntity,
  ItineraryDTO,
  UserPreferenceDTO,
  GenerationJobDTO,
  TripNoteWithItineraryDTO,
} from "../../../types";
import type { AIGenerationResult } from "../../../lib/services/ai.service";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "../../../db/database.types";

// Mock factory functions placed at top level
vi.mock("../../../lib/services/tripNotes.service", () => ({
  TripNotesService: {
    findById: vi.fn<() => Promise<TripNoteEntity | null>>(),
    assertBelongsToUser: vi.fn<() => void>(),
    updateIfChanged: vi.fn<() => Promise<TripNoteEntity>>(),
    toPromptDTO: vi.fn<() => TripNoteDTO>(),
  },
}));

vi.mock("../../../lib/services/preferences.service", () => ({
  PreferencesService: {
    listByUser: vi.fn<() => Promise<UserPreferenceDTO[]>>(),
  },
}));

vi.mock("../../../lib/services/ai.service", () => ({
  AIService: {
    generateItinerary: vi.fn<() => Promise<AIGenerationResult>>(),
  },
}));

vi.mock("../../../lib/services/itineraries.service", () => ({
  ItinerariesService: {
    findByTripNoteId: vi.fn<() => Promise<ItineraryEntity | null>>(),
    create: vi.fn<() => Promise<ItineraryDTO>>(),
    update: vi.fn<() => Promise<ItineraryDTO>>(),
  },
}));

vi.mock("../../../lib/services/jobs.service", () => ({
  JobsService: {
    logSucceeded: vi.fn<() => Promise<GenerationJobDTO>>(),
    logFailed: vi.fn<() => Promise<GenerationJobDTO>>(),
  },
}));

// Mock httpHelpers with typed factory functions
vi.mock("../../../lib/httpHelpers", () => ({
  createErrorResponse: vi.fn<(...args: [number, string, unknown?]) => Response>(),
  createJsonResponse: vi.fn<(...args: [unknown, number?]) => Response>(),
}));

// Mock performance.now
const mockPerformanceNow = vi.fn<() => number>();
Object.defineProperty(global.performance, "now", {
  writable: true,
  value: mockPerformanceNow,
});

describe("/api/trip-notes/generateItenerary", () => {
  const mockSupabase = {} as SupabaseClient<Database>;
  const mockUser = { id: "user-123", email: "test@example.com" };
  const mockLocals = { supabase: mockSupabase, user: mockUser };

  const validRequestBody = {
    id: 1,
    destination: "Tokyo, Japan",
    earliestStartDate: "2024-03-01",
    latestStartDate: "2024-03-15",
    groupSize: 2,
    approximateTripLength: 7,
    budgetAmount: 5000,
    currency: "USD",
    details: "Family trip to Tokyo",
  };

  const mockTripNoteEntity: TripNoteEntity = {
    id: 1,
    user_id: "user-123",
    destination: "Tokyo, Japan",
    earliest_start_date: "2024-03-01",
    latest_start_date: "2024-03-15",
    group_size: 2,
    approximate_trip_length: 7,
    budget_amount: 5000,
    currency: "USD",
    details: "Family trip to Tokyo",
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  } as TripNoteEntity;

  const mockTripNoteDTO: TripNoteDTO = {
    id: 1,
    destination: "Tokyo, Japan",
    earliestStartDate: "2024-03-01",
    latestStartDate: "2024-03-15",
    groupSize: 2,
    approximateTripLength: 7,
    budgetAmount: 5000,
    currency: "USD",
    details: "Family trip to Tokyo",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockPreferences: UserPreferenceDTO[] = [
    {
      id: 1,
      category: "culture",
      preferenceText: "cultural",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      category: "adventure",
      preferenceText: "moderate",
      createdAt: "2024-01-01T00:00:00Z",
      updatedAt: "2024-01-01T00:00:00Z",
    },
  ];

  const mockAIResult: AIGenerationResult = {
    itinerary: "Day 1: Visit Senso-ji Temple...",
    suggestedTripLength: 7,
    suggestedBudget: "5000",
    durationMs: 2500,
  };

  const mockGenerationJobDTO: GenerationJobDTO = {
    id: 1,
    tripNoteId: 1,
    status: "succeeded",
    durationMs: mockAIResult.durationMs,
    errorText: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockFailedJobDTO: GenerationJobDTO = {
    ...mockGenerationJobDTO,
    status: "failed",
    errorText: "Something went wrong",
  };

  const mockItinerary: ItineraryDTO = {
    id: 1,
    tripNoteId: 1,
    itinerary: mockAIResult.itinerary,
    suggestedTripLength: mockAIResult.suggestedTripLength ?? null,
    suggestedBudget: mockAIResult.suggestedBudget ?? null,
    manuallyEdited: false,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };

  const mockItineraryEntity: ItineraryEntity = {
    id: 1,
    trip_note_id: 1,
    itinerary: mockAIResult.itinerary,
    suggested_trip_length: mockAIResult.suggestedTripLength ?? null,
    suggested_budget: mockAIResult.suggestedBudget ?? null,
    manually_edited: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
    user_id: "user-123",
  };

  const mockRequest = {
    json: vi.fn(),
  };

  const buildContext = (localsOverride?: Partial<typeof mockLocals>) =>
    ({
      request: mockRequest as unknown as Request,
      locals: { ...mockLocals, ...localsOverride },
    }) as Parameters<typeof POST>[0];

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset performance mock for each test
    let callCount = 0;
    mockPerformanceNow.mockImplementation(() => {
      callCount++;
      return callCount * 1000; // Return 1000, 2000, 3000, etc.
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Authentication", () => {
    it("should return 401 when user is not authenticated", async () => {
      // Arrange
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      // Act
      await POST(buildContext({ user: undefined }));

      // Assert
      expect(createErrorResponse).toHaveBeenCalledWith(401, "Unauthorized");
    });

    it("should proceed when user is authenticated", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(createErrorResponse).not.toHaveBeenCalledWith(401, "Unauthorized");
    });
  });

  describe("Request Parsing", () => {
    it("should return 400 for invalid JSON", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockRejectedValue(new Error("Invalid JSON"));

      await POST(buildContext());

      expect(createErrorResponse).toHaveBeenCalledWith(400, "Invalid JSON in request body");
    });

    it("should parse valid JSON successfully", async () => {
      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(mockRequest.json).toHaveBeenCalled();
    });
  });

  describe("Request Validation", () => {
    it("should return 400 for invalid request body", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      const invalidBody = { id: "not-a-number" };
      mockRequest.json.mockResolvedValue(invalidBody);

      await POST(buildContext());

      expect(createErrorResponse).toHaveBeenCalledWith(400, "Validation failed", expect.any(Object));
    });

    it("should validate required fields", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      const invalidBody = {
        // Missing required fields
        destination: "",
        earliestStartDate: "invalid-date",
      };
      mockRequest.json.mockResolvedValue(invalidBody);

      await POST(buildContext());

      expect(createErrorResponse).toHaveBeenCalledWith(400, "Validation failed", expect.any(Object));
    });

    it("should validate date range logic", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      const invalidBody = {
        ...validRequestBody,
        earliestStartDate: "2024-03-15",
        latestStartDate: "2024-03-01", // Earlier than earliest
      };
      mockRequest.json.mockResolvedValue(invalidBody);

      await POST(buildContext());

      expect(createErrorResponse).toHaveBeenCalledWith(400, "Validation failed", expect.any(Object));
    });
  });

  describe("Trip Note Ownership", () => {
    it("should return 404 when trip note does not exist", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockImplementation(() => {
        throw new NotFoundError("Trip note not found");
      });

      await POST(buildContext());

      expect(createErrorResponse).toHaveBeenCalledWith(404, "Trip note not found or access denied");
    });

    it("should proceed when user owns the trip note", async () => {
      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(TripNotesService.assertBelongsToUser).toHaveBeenCalledWith(mockTripNoteEntity, "user-123");
    });
  });

  describe("Trip Note Updates", () => {
    it("should update trip note when fields have changed", async () => {
      const updatedRequestBody = {
        id: 1,
        destination: "Updated Tokyo",
        earliestStartDate: "2024-03-01",
        latestStartDate: "2024-03-15",
        groupSize: 3,
        approximateTripLength: 7,
        budgetAmount: 5000,
        currency: "USD",
        details: "Family trip to Tokyo",
      };

      mockRequest.json.mockResolvedValue(updatedRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue({
        ...mockTripNoteEntity,
        destination: "Updated Tokyo",
        group_size: 3,
      });
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(TripNotesService.updateIfChanged).toHaveBeenCalledWith(
        1,
        {
          destination: "Updated Tokyo",
          earliestStartDate: "2024-03-01",
          latestStartDate: "2024-03-15",
          groupSize: 3,
          approximateTripLength: 7,
          budgetAmount: 5000,
          currency: "USD",
          details: "Family trip to Tokyo",
        },
        "user-123",
        mockSupabase
      );
    });

    it("should return 400 for validation errors during update", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockRejectedValue(new ValidationError("Invalid destination"));

      await POST(buildContext());

      expect(createErrorResponse).toHaveBeenCalledWith(400, "Validation failed", {
        destination: ["Invalid destination"],
      });
    });
  });

  describe("Preferences Fetching", () => {
    it("should fetch user preferences successfully", async () => {
      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(PreferencesService.listByUser).toHaveBeenCalledWith("user-123", mockSupabase);
    });

    it("should handle preferences fetch errors and log failed job", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockRejectedValue(new Error("DB connection failed"));
      vi.mocked(JobsService.logFailed).mockResolvedValue(mockFailedJobDTO);

      await POST(buildContext());

      expect(JobsService.logFailed).toHaveBeenCalledWith(
        1,
        "Failed to fetch user preferences: Error: DB connection failed",
        "user-123",
        mockSupabase,
        1000
      );
      expect(createErrorResponse).toHaveBeenCalledWith(500, "Failed to fetch user preferences");
    });
  });

  describe("AI Generation", () => {
    it("should generate itinerary via AI service", async () => {
      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(AIService.generateItinerary).toHaveBeenCalledWith(mockTripNoteDTO, mockPreferences);
    });

    it("should handle AI generation errors and log failed job", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockRejectedValue(new Error("AI service timeout"));
      vi.mocked(JobsService.logFailed).mockResolvedValue(mockFailedJobDTO);

      await POST(buildContext());

      expect(JobsService.logFailed).toHaveBeenCalledWith(
        1,
        "AI generation failed: AI service timeout.",
        "user-123",
        mockSupabase,
        1000
      );
      expect(createErrorResponse).toHaveBeenCalledWith(500, "Failed to generate itinerary");
    });
  });

  describe("Itinerary Persistence", () => {
    it("should create new itinerary when none exists", async () => {
      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null); // No existing itinerary
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(ItinerariesService.findByTripNoteId).toHaveBeenCalledWith(1, mockSupabase);
      expect(ItinerariesService.create).toHaveBeenCalledWith(
        1,
        mockAIResult.itinerary,
        "user-123",
        mockSupabase,
        mockAIResult.suggestedTripLength,
        mockAIResult.suggestedBudget
      );
    });

    it("should update existing itinerary when regenerating", async () => {
      const existingItineraryEntity = { ...mockItineraryEntity, manually_edited: true };

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(existingItineraryEntity);
      vi.mocked(ItinerariesService.update).mockResolvedValue({ ...mockItinerary, manuallyEdited: false });
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(ItinerariesService.update).toHaveBeenCalledWith(
        existingItineraryEntity.id,
        mockAIResult.itinerary,
        false, // manually_edited = false
        mockSupabase,
        mockAIResult.suggestedTripLength,
        mockAIResult.suggestedBudget
      );
    });

    it("should handle itinerary persistence errors and log failed job", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockRejectedValue(new Error("Database constraint violation"));
      vi.mocked(JobsService.logFailed).mockResolvedValue(mockFailedJobDTO);

      await POST(buildContext());

      expect(JobsService.logFailed).toHaveBeenCalledWith(
        1,
        expect.stringContaining("Failed to persist itinerary"),
        "user-123",
        mockSupabase,
        mockAIResult.durationMs
      );
      expect(createErrorResponse).toHaveBeenCalledWith(500, "Failed to save itinerary");
    });
  });

  describe("Job Logging", () => {
    it("should log successful job completion", async () => {
      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(JobsService.logSucceeded).toHaveBeenCalledWith(1, mockAIResult.durationMs, "user-123", mockSupabase);
    });

    it("should continue despite job logging failure", async () => {
      const { createJsonResponse } = await import("../../../lib/httpHelpers");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockRejectedValue(new Error("Logging failed"));
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(consoleSpy).toHaveBeenCalledWith("Warning: Failed to log successful job:", expect.any(Error));
      expect(createJsonResponse).toHaveBeenCalled(); // Should still succeed

      consoleSpy.mockRestore();
    });
  });

  describe("Response Structure", () => {
    it("should return 201 with combined trip note and itinerary data", async () => {
      const { createJsonResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      expect(createJsonResponse).toHaveBeenCalledWith(
        expect.objectContaining({
          ...mockTripNoteDTO,
          itinerary: {
            id: mockItinerary.id,
            suggestedTripLength: mockItinerary.suggestedTripLength,
            suggestedBudget: mockItinerary.suggestedBudget,
            itinerary: mockItinerary.itinerary,
          },
        }),
        201
      );
    });

    it("should return light itinerary DTO in response", async () => {
      const { createJsonResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      const responseCall = vi.mocked(createJsonResponse).mock.calls[0][0] as TripNoteWithItineraryDTO;
      expect(responseCall.itinerary).toEqual({
        id: mockItinerary.id,
        suggestedTripLength: mockItinerary.suggestedTripLength,
        suggestedBudget: mockItinerary.suggestedBudget,
        itinerary: mockItinerary.itinerary,
      });
    });
  });

  describe("Error Handling - Unexpected Errors", () => {
    it("should handle unexpected errors and log failed job", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockRejectedValue(new Error("Database connection failed"));
      vi.mocked(JobsService.logFailed).mockResolvedValue(mockFailedJobDTO);

      await POST(buildContext());

      expect(JobsService.logFailed).toHaveBeenCalledWith(
        1,
        "Unexpected error: Database connection failed",
        "user-123",
        mockSupabase,
        1000
      );
      expect(createErrorResponse).toHaveBeenCalledWith(500, "An unexpected error occurred", {
        message: "Database connection failed",
      });
    });

    it("should handle errors when tripNoteId is not available", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      // Simulate error before tripNoteId is set
      mockRequest.json.mockRejectedValue(new Error("Invalid JSON"));

      await POST(buildContext());

      expect(JobsService.logFailed).not.toHaveBeenCalled();
      expect(createErrorResponse).toHaveBeenCalledWith(400, "Invalid JSON in request body");

      consoleSpy.mockRestore();
    });

    it("should handle job logging errors gracefully", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockRejectedValue(new Error("Unexpected error"));
      vi.mocked(JobsService.logFailed).mockRejectedValue(new Error("Logging system down"));

      await POST(buildContext());

      expect(consoleSpy).toHaveBeenCalledWith("Failed to log error to jobs table:", expect.any(Error));
      expect(createErrorResponse).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("should handle job logging errors gracefully when logging fails", async () => {
      const { createErrorResponse } = await import("../../../lib/httpHelpers");
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(vi.fn());

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockRejectedValue(new Error("Unexpected error"));
      vi.mocked(JobsService.logFailed).mockRejectedValue(new Error("Logging system down"));

      await POST(buildContext());

      expect(consoleSpy).toHaveBeenCalledWith("Failed to log error to jobs table:", expect.any(Error));
      expect(createErrorResponse).toHaveBeenCalledWith(500, "An unexpected error occurred", {
        message: "Unexpected error",
      });

      consoleSpy.mockRestore();
    });
  });

  describe("Integration Scenarios", () => {
    it("should handle complete first-time itinerary generation flow", async () => {
      const { createJsonResponse } = await import("../../../lib/httpHelpers");

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(null);
      vi.mocked(ItinerariesService.create).mockResolvedValue(mockItinerary);
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      // Verify the complete flow
      expect(TripNotesService.findById).toHaveBeenCalledWith(1, mockSupabase);
      expect(TripNotesService.assertBelongsToUser).toHaveBeenCalled();
      expect(TripNotesService.updateIfChanged).toHaveBeenCalled();
      expect(PreferencesService.listByUser).toHaveBeenCalled();
      expect(AIService.generateItinerary).toHaveBeenCalled();
      expect(ItinerariesService.findByTripNoteId).toHaveBeenCalled();
      expect(ItinerariesService.create).toHaveBeenCalled();
      expect(JobsService.logSucceeded).toHaveBeenCalled();
      expect(createJsonResponse).toHaveBeenCalledWith(expect.any(Object), 201);
    });

    it("should handle complete itinerary regeneration flow", async () => {
      const { createJsonResponse } = await import("../../../lib/httpHelpers");

      const existingItineraryEntity = { ...mockItineraryEntity, manually_edited: true };

      mockRequest.json.mockResolvedValue(validRequestBody);
      vi.mocked(TripNotesService.findById).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(TripNotesService.assertBelongsToUser).mockReturnValue(undefined);
      vi.mocked(TripNotesService.updateIfChanged).mockResolvedValue(mockTripNoteEntity);
      vi.mocked(PreferencesService.listByUser).mockResolvedValue(mockPreferences);
      vi.mocked(AIService.generateItinerary).mockResolvedValue(mockAIResult);
      vi.mocked(ItinerariesService.findByTripNoteId).mockResolvedValue(existingItineraryEntity);
      vi.mocked(ItinerariesService.update).mockResolvedValue({ ...mockItinerary, manuallyEdited: false });
      vi.mocked(JobsService.logSucceeded).mockResolvedValue(mockGenerationJobDTO);
      vi.mocked(TripNotesService.toPromptDTO).mockReturnValue(mockTripNoteDTO);

      await POST(buildContext());

      // Verify regeneration flow
      expect(ItinerariesService.findByTripNoteId).toHaveBeenCalled();
      expect(ItinerariesService.update).toHaveBeenCalledWith(
        existingItineraryEntity.id,
        mockAIResult.itinerary,
        false,
        mockSupabase,
        mockAIResult.suggestedTripLength,
        mockAIResult.suggestedBudget
      );
      expect(ItinerariesService.create).not.toHaveBeenCalled();
      expect(createJsonResponse).toHaveBeenCalledWith(expect.any(Object), 201);
    });
  });
});
