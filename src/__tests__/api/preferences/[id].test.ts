import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "../../../pages/api/preferences/[id]";
import { PreferencesService } from "../../../lib/services/preferences.service";
import { createErrorResponse, createJsonResponse, createNoContentResponse } from "../../../lib/httpHelpers";
import type { UserPreferenceDTO } from "../../../types";

// Mock the PreferencesService
vi.mock("../../../lib/services/preferences.service", () => ({
  PreferencesService: {
    update: vi.fn<() => Promise<UserPreferenceDTO | null>>(),
    remove: vi.fn<() => Promise<boolean>>(),
  },
}));

describe("DELETE /api/preferences/[id]", () => {
  let mockSupabase: any;
  let mockUser: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabase = {
      from: vi.fn(),
    };

    mockUser = {
      id: "test-user-id",
      email: "test@example.com",
    };
  });

  describe("successful deletion", () => {
    it("should return 204 when preference is successfully deleted", async () => {
      // Mock service to return true (deletion successful)
      (PreferencesService.remove as any).mockResolvedValue(true);

      const request = new Request("http://localhost/api/preferences/1", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: { id: "1" },
        request,
        locals: { supabase: mockSupabase, user: mockUser },
      } as any);

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(PreferencesService.remove).toHaveBeenCalledWith(
        { id: 1, userId: "test-user-id" },
        mockSupabase
      );
    });
  });

  describe("not found", () => {
    it("should return 404 when preference doesn't exist or doesn't belong to user", async () => {
      // Mock service to return false (not found)
      (PreferencesService.remove as any).mockResolvedValue(false);

      const request = new Request("http://localhost/api/preferences/999", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: { id: "999" },
        request,
        locals: { supabase: mockSupabase, user: mockUser },
      } as any);

      expect(response.status).toBe(404);
      expect(PreferencesService.remove).toHaveBeenCalledWith(
        { id: 999, userId: "test-user-id" },
        mockSupabase
      );
    });
  });

  describe("unauthorized", () => {
    it("should return 401 when user is not authenticated", async () => {
      const request = new Request("http://localhost/api/preferences/1", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: { id: "1" },
        request,
        locals: { supabase: mockSupabase, user: null },
      } as any);

      expect(response.status).toBe(401);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });
  });

  describe("invalid id", () => {
    it("should return 400 when id parameter is missing", async () => {
      const request = new Request("http://localhost/api/preferences/", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: {},
        request,
        locals: { supabase: mockSupabase, user: mockUser },
      } as any);

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });

    it("should return 400 when id parameter is not a number", async () => {
      const request = new Request("http://localhost/api/preferences/abc", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: { id: "abc" },
        request,
        locals: { supabase: mockSupabase, user: mockUser },
      } as any);

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });

    it("should return 400 when id parameter is zero", async () => {
      const request = new Request("http://localhost/api/preferences/0", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: { id: "0" },
        request,
        locals: { supabase: mockSupabase, user: mockUser },
      } as any);

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });

    it("should return 400 when id parameter is negative", async () => {
      const request = new Request("http://localhost/api/preferences/-1", {
        method: "DELETE",
      });

      const response = await DELETE({
        params: { id: "-1" },
        request,
        locals: { supabase: mockSupabase, user: mockUser },
      } as any);

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });
  });
});