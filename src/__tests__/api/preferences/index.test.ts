import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { GET, POST } from "../../../pages/api/preferences/index";
import { PreferencesService } from "../../../lib/services/preferences.service";
import type { UserPreferenceDTO } from "../../../types";

// Mock the PreferencesService
vi.mock("../../../lib/services/preferences.service", () => ({
  PreferencesService: {
    create: vi.fn<() => Promise<UserPreferenceDTO>>() as Mock,
    listByUser: vi.fn<() => Promise<UserPreferenceDTO[]>>() as Mock,
  },
}));

describe("GET /api/preferences", () => {
  let mockSupabase: { from: Mock };
  let mockUser: { id: string; email: string } | null;

  const mockRequest = {
    json: vi.fn(),
  };

  const buildContext = (
    localsOverride?: Partial<{ supabase: { from: Mock }; user: { id: string; email: string } | null }>
  ) =>
    ({
      request: mockRequest as unknown as Request,
      locals: { supabase: mockSupabase, user: mockUser, ...localsOverride },
    }) as unknown as Parameters<typeof GET>[0];

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn() as Mock,
    };

    mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    };
  });

  describe("successful retrieval", () => {
    it("should return user preferences when authenticated", async () => {
      const mockPreferences = [
        {
          id: 1,
          category: "food",
          preferenceText: "I love spicy food",
          createdAt: "2024-01-23T12:00:00Z",
          updatedAt: "2024-01-23T12:00:00Z",
        },
        {
          id: 2,
          category: "culture",
          preferenceText: "I enjoy museums",
          createdAt: "2024-01-23T12:05:00Z",
          updatedAt: "2024-01-23T12:05:00Z",
        },
      ];

      (PreferencesService.listByUser as Mock).mockResolvedValue(mockPreferences);

      const response = await GET(buildContext());

      expect(PreferencesService.listByUser).toHaveBeenCalledWith("test-user-id", mockSupabase);

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result).toEqual(mockPreferences);
    });

    it("should return empty array when user has no preferences", async () => {
      (PreferencesService.listByUser as Mock).mockResolvedValue([]);

      const response = await GET(buildContext());

      expect(PreferencesService.listByUser).toHaveBeenCalledWith("test-user-id", mockSupabase);

      const result = await response.json();
      expect(response.status).toBe(200);
      expect(result).toEqual([]);
    });
  });

  describe("unauthorized access", () => {
    it("should return 401 when user is not authenticated", async () => {
      const response = await GET(buildContext({ user: null }));

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.message).toBe("Unauthorized");
    });
  });

  describe("service errors", () => {
    it("should return 500 on service failure", async () => {
      (PreferencesService.listByUser as Mock).mockRejectedValue(new Error("Database error"));

      const response = await GET(buildContext());

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.message).toBe("An error occurred while processing the request");
    });
  });
});

describe("POST /api/preferences", () => {
  let mockSupabase: { from: Mock };
  let mockUser: { id: string; email: string } | null;

  const buildContext = (
    request: Request,
    localsOverride?: Partial<{ supabase: { from: Mock }; user: { id: string; email: string } | null }>
  ) =>
    ({
      request,
      locals: { supabase: mockSupabase, user: mockUser, ...localsOverride },
    }) as unknown as Parameters<typeof POST>[0];

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn() as Mock,
    };

    mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    };
  });

  describe("successful creation", () => {
    it("should create a preference and return 201 with DTO", async () => {
      const mockPreference: UserPreferenceDTO = {
        id: 1,
        category: "food",
        preferenceText: "I love spicy food",
        createdAt: "2024-01-23T12:00:00Z",
        updatedAt: "2024-01-23T12:00:00Z",
      };

      (PreferencesService.create as Mock).mockResolvedValue(mockPreference);

      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "food",
          preferenceText: "I love spicy food",
        }),
      });

      const response = await POST(buildContext(request));

      expect(PreferencesService.create).toHaveBeenCalledWith(
        { category: "food", preferenceText: "I love spicy food" },
        "test-user-id",
        mockSupabase
      );

      const result = await response.json();
      expect(response.status).toBe(201);
      expect(result).toEqual(mockPreference);
    });

    it("should default category to 'other' when not provided", async () => {
      const mockPreference: UserPreferenceDTO = {
        id: 2,
        category: "other",
        preferenceText: "I prefer quiet places",
        createdAt: "2024-01-23T12:00:00Z",
        updatedAt: "2024-01-23T12:00:00Z",
      };

      (PreferencesService.create as Mock).mockResolvedValue(mockPreference);

      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceText: "I prefer quiet places",
        }),
      });

      const response = await POST(buildContext(request));

      expect(PreferencesService.create).toHaveBeenCalledWith(
        { category: "other", preferenceText: "I prefer quiet places" },
        "test-user-id",
        mockSupabase
      );

      const result = await response.json();
      expect(response.status).toBe(201);
      expect(result).toEqual(mockPreference);
    });
  });

  describe("validation failures", () => {
    it("should return 400 for empty preference text", async () => {
      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceText: "",
        }),
      });

      const response = await POST(buildContext(request));

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe("Validation failed");
      expect(result.details.preferenceText).toBeDefined();
    });

    it("should return 400 for preference text too long", async () => {
      const longText = "a".repeat(256); // 256 characters, exceeds limit

      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceText: longText,
        }),
      });

      const response = await POST(buildContext(request));

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe("Validation failed");
      expect(result.details.preferenceText).toBeDefined();
    });

    it("should return 400 for invalid category", async () => {
      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          category: "invalid-category",
          preferenceText: "I love museums",
        }),
      });

      const response = await POST(buildContext(request));

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe("Validation failed");
      expect(result.details.category).toBeDefined();
    });

    it("should return 400 for malformed JSON", async () => {
      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "invalid json",
      });

      const response = await POST(buildContext(request));

      expect(response.status).toBe(400);
      const result = await response.json();
      expect(result.message).toBe("Malformed JSON");
    });
  });

  describe("unauthorized access", () => {
    it("should return 401 when user is not authenticated", async () => {
      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceText: "I love hiking",
        }),
      });

      const response = await POST(buildContext(request, { user: null }));

      expect(response.status).toBe(401);
      const result = await response.json();
      expect(result.message).toBe("Unauthorized");
    });
  });

  describe("service errors", () => {
    it("should return 500 on service failure", async () => {
      (PreferencesService.create as Mock).mockRejectedValue(new Error("Database error"));

      const request = new Request("http://localhost/api/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          preferenceText: "I love beaches",
        }),
      });

      const response = await POST(buildContext(request));

      expect(response.status).toBe(500);
      const result = await response.json();
      expect(result.message).toBe("An error occurred while processing the request");
    });
  });
});
