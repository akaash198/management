import { getApiBaseUrl } from "./runtimeConfig";

// Access token is kept in module memory only — never written to localStorage or
// sessionStorage, which are readable by any script (XSS vector).
// The httpOnly refresh-token cookie is handled entirely server-side.
let _accessToken: string | null = null;

export const setAccessToken = (token: string | null) => {
  _accessToken = token;
};

export const getAccessToken = (): string | null => {
  return _accessToken;
};

export const setTokens = (access: string, _refresh: string) => {
  _accessToken = access;
  // Refresh token is stored as httpOnly cookie by the server — no client action needed.
};

export const ensureAccessTokenCookie = () => {
  // Access token is set as httpOnly cookie by the server. No client action needed.
};

export const clearTokens = () => {
  _accessToken = null;
};

export const refreshAccessToken = async (): Promise<string | null> => {
  try {
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
    }
    return access;
  } catch {
    return null;
  }
};
