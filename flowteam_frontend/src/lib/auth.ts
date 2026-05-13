import { getApiBaseUrl } from "./runtimeConfig";

let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => {
  if (!_accessToken && typeof window !== "undefined") {
    _accessToken = localStorage.getItem("accessToken");
  }
  return _accessToken;
};

export const setTokens = (access: string, _refresh: string) => {
  _accessToken = access;
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", access);
  }
  // Refresh token is stored as httpOnly cookie by the server.
  // The `_refresh` value is ignored here; the server sets the cookie.
};

export const ensureAccessTokenCookie = () => {
  // Access token is set as httpOnly cookie by the server. No client action needed.
};

export const clearTokens = () => {
  _accessToken = null;
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
  }
};

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
    // Refresh token is sent as httpOnly cookie — no need to read from localStorage.
    const response = await fetch(`${getApiBaseUrl()}/auth/refresh/`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
    });
    if (!response.ok) return null;
    const body = await response.json();
    const access = body?.data?.access ?? body?.access ?? null;
    if (access) {
      _accessToken = access;
      if (typeof window !== "undefined") {
        localStorage.setItem("accessToken", access);
      }
    }
    return access;
  } catch {
    return null;
  }
};
