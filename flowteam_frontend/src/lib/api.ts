import axios from "axios";
import { getAccessToken, getRefreshToken, setTokens, clearTokens } from "./auth";
import { getApiBaseUrl } from "./runtimeConfig";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Let Axios set multipart boundaries automatically for FormData.
    if (typeof FormData !== "undefined" && config.data instanceof FormData) {
      if (config.headers) {
        delete (config.headers as any)["Content-Type"];
        delete (config.headers as any)["content-type"];
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Serialise all concurrent token refreshes so only one hits /auth/refresh/
// at a time. Subsequent 401s wait for the in-flight refresh and reuse the
// result instead of each sending their own (and invalidating each other's
// refresh token under ROTATE_REFRESH_TOKENS=True).
let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken) return null;
    try {
      const response = await axios.post(`${getApiBaseUrl()}/auth/refresh/`, {
        refresh: refreshToken,
      });
      const body = response.data;
      const access: string | undefined = body?.data?.access ?? body?.access;
      const newRefresh: string | undefined =
        body?.data?.refresh ?? body?.refresh ?? refreshToken;
      if (access) {
        setTokens(access, newRefresh ?? refreshToken);
        return access;
      }
      return null;
    } catch {
      return null;
    } finally {
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const newToken = await refreshAccessToken();
      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      clearTokens();
      if (typeof window !== "undefined") {
        window.location.href = "/login";
      }
    }

    return Promise.reject(error);
  }
);

export default api;
