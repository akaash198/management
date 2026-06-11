import axios from "axios";
import { refreshAccessToken as authRefresh, getAccessToken } from "./auth";
import { getApiBaseUrl } from "./runtimeConfig";

const api = axios.create({
  baseURL: getApiBaseUrl(),
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true,
});

api.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token && config.headers) {
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

let refreshPromise: Promise<string | null> | null = null;

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = authRefresh();
      }
      const newToken = await refreshPromise;
      refreshPromise = null;

      if (newToken) {
        originalRequest.headers.Authorization = `Bearer ${newToken}`;
        return api(originalRequest);
      }

      // Session is fully expired — notify the user before redirecting so they
      // know why they are being sent to the login page. Lazy import keeps this
      // module safe in SSR contexts where sonner is not available.
      if (typeof window !== "undefined") {
        const { toast } = await import("sonner");
        toast.error("Your session has expired. Please log in again.", { duration: 3000 });
        setTimeout(() => {
          window.location.href = "/login?reason=session_expired";
        }, 2000);
      }
    }

    return Promise.reject(error);
  }
);

export default api;
