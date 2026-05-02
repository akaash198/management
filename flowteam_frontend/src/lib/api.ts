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

api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        try {
          const response = await axios.post(
            `${getApiBaseUrl()}/auth/refresh/`,
            { refresh: refreshToken }
          );

          if (response.data.success) {
            const { access } = response.data.data;
            setTokens(access, refreshToken);
            originalRequest.headers.Authorization = `Bearer ${access}`;
            return api(originalRequest);
          }
        } catch (refreshError) {
          clearTokens();
          if (typeof window !== "undefined") {
            window.location.href = "/login";
          }
        }
      } else {
        clearTokens();
        if (typeof window !== "undefined") {
          window.location.href = "/login";
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;
