import { describe, it, expect, vi, beforeEach, type Mock } from "vitest";
import { DELETE } from "../../../pages/api/preferences/[id]";
import { PreferencesService } from "../../../lib/services/preferences.service";
import type { SupabaseClient } from "../../../db/supabase.client";

// Mock the PreferencesService
vi.mock("../../../lib/services/preferences.service", () => ({
  PreferencesService: {
    remove: vi.fn<() => Promise<boolean>>() as Mock,
  },
}));

describe("DELETE /api/preferences/[id]", () => {
  const mockSupabase = {} as SupabaseClient;
  const mockUser = { id: "test-user-id", email: "test@example.com" };
  const mockLocals = { supabase: mockSupabase, user: mockUser as typeof mockUser | null };

  const mockRequest = {
    json: vi.fn(),
  };

  const buildContext = (params: { id?: string } = { id: "1" }, localsOverride?: Partial<typeof mockLocals>) =>
    ({
      request: mockRequest as unknown as Request,
      params,
      locals: { ...mockLocals, ...localsOverride },
    }) as Parameters<typeof DELETE>[0];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("successful deletion", () => {
    it("should return 204 when preference is successfully deleted", async () => {
      // Mock service to return true (deletion successful)
      (PreferencesService.remove as Mock).mockResolvedValue(true);

      const response = await DELETE(buildContext({ id: "1" }));

      expect(response.status).toBe(204);
      expect(response.body).toBeNull();
      expect(PreferencesService.remove).toHaveBeenCalledWith({ id: 1, userId: "test-user-id" }, mockSupabase);
    });
  });

  describe("not found", () => {
    it("should return 404 when preference doesn't exist or doesn't belong to user", async () => {
      // Mock service to return false (not found)
      (PreferencesService.remove as Mock).mockResolvedValue(false);

      const response = await DELETE(buildContext({ id: "999" }));

      expect(response.status).toBe(404);
      expect(PreferencesService.remove).toHaveBeenCalledWith({ id: 999, userId: "test-user-id" }, mockSupabase);
    });
  });

  describe("unauthorized", () => {
    it("should return 401 when user is not authenticated", async () => {
      const response = await DELETE(buildContext({ id: "1" }, { user: null }));

      expect(response.status).toBe(401);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });
  });

  describe("invalid id", () => {
    it("should return 400 when id parameter is missing", async () => {
      const response = await DELETE(buildContext({}));

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });

    it("should return 400 when id parameter is not a number", async () => {
      const response = await DELETE(buildContext({ id: "abc" }));

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });

    it("should return 400 when id parameter is zero", async () => {
      const response = await DELETE(buildContext({ id: "0" }));

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });

    it("should return 400 when id parameter is negative", async () => {
      const response = await DELETE(buildContext({ id: "-1" }));

      expect(response.status).toBe(400);
      expect(PreferencesService.remove).not.toHaveBeenCalled();
    });
  });
});
