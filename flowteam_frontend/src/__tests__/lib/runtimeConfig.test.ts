import { describe, it, expect, vi, beforeEach } from "vitest";
import { getApiBaseUrl, getWsBaseUrl } from "@/lib/runtimeConfig";

beforeEach(() => {
  vi.stubGlobal("window", undefined);
  vi.stubGlobal("process", { env: {} });
});

describe("getApiBaseUrl", () => {
  it("returns env value when NEXT_PUBLIC_API_URL is set", () => {
    vi.stubGlobal("process", { env: { NEXT_PUBLIC_API_URL: "https://api.example.com/api" } });
    expect(getApiBaseUrl()).toBe("https://api.example.com/api");
  });
});

describe("getWsBaseUrl", () => {
  it("returns env value when NEXT_PUBLIC_WS_URL is set", () => {
    vi.stubGlobal("process", { env: { NEXT_PUBLIC_WS_URL: "wss://example.com/ws" } });
    expect(getWsBaseUrl()).toBe("wss://example.com/ws");
  });
});
