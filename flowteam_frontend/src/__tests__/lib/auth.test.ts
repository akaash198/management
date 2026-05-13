import { describe, it, expect, vi, beforeEach } from "vitest";
import { refreshAccessToken } from "@/lib/auth";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

beforeEach(() => {
  mockFetch.mockReset();
});

describe("refreshAccessToken", () => {
  it("returns access token on success", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: { access: "new-access-token" } }),
    });
    const token = await refreshAccessToken();
    expect(token).toBe("new-access-token");
  });

  it("returns null on non-ok response", async () => {
    mockFetch.mockResolvedValueOnce({ ok: false });
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });

  it("returns null on network error", async () => {
    mockFetch.mockRejectedValueOnce(new Error("Network error"));
    const token = await refreshAccessToken();
    expect(token).toBeNull();
  });
});
