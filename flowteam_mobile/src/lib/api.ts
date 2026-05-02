import axios from "axios";
import { clearTokens, getAccessToken, getRefreshToken, setTokens } from "./tokenStorage";
import { getApiBaseUrl } from "./runtime";
import type { ApiResponse } from "./types";

export const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use(async (config) => {
  const token = await getAccessToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  if (config.data instanceof FormData) {
    delete config.headers["Content-Type"];
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const request = error.config;
    if (error.response?.status === 401 && request && !request._retry) {
      request._retry = true;
      const refresh = await getRefreshToken();
      if (!refresh) {
        await clearTokens();
        return Promise.reject(error);
      }
      try {
        const response = await axios.post(`${getApiBaseUrl()}/auth/refresh/`, { refresh });
        const access = response.data?.data?.access ?? response.data?.access;
        if (!access) throw new Error("Missing refreshed access token");
        await setTokens(access, refresh);
        request.headers.Authorization = `Bearer ${access}`;
        return api(request);
      } catch (refreshError) {
        await clearTokens();
        return Promise.reject(refreshError);
      }
    }
    return Promise.reject(error);
  }
);

export function unwrapData<T>(payload: ApiResponse<T> | T): T {
  if (payload && typeof payload === "object" && "data" in payload) {
    return (payload as ApiResponse<T>).data as T;
  }
  return payload as T;
}

export function unwrapList<T>(payload: ApiResponse<T[]> | T[] | null | undefined): T[] {
  if (!payload) return [];
  const data = unwrapData<T[] | { results?: T[] }>(payload as ApiResponse<T[]> | T[] | { results?: T[] });
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object" && Array.isArray(data.results)) return data.results;
  return [];
}
