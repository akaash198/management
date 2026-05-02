export const getAccessToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("accessToken");
  }
  return null;
};

export const getRefreshToken = () => {
  if (typeof window !== "undefined") {
    return localStorage.getItem("refreshToken");
  }
  return null;
};

const setAccessTokenCookie = (access: string) => {
  if (typeof window === "undefined") return;
  document.cookie = `accessToken=${access}; path=/; max-age=3600; SameSite=Lax`;
};

export const ensureAccessTokenCookie = () => {
  if (typeof window === "undefined") return;
  if (document.cookie.includes("accessToken=")) return;
  const access = getAccessToken();
  if (access) setAccessTokenCookie(access);
};

export const setTokens = (access: string, refresh: string) => {
  if (typeof window !== "undefined") {
    localStorage.setItem("accessToken", access);
    localStorage.setItem("refreshToken", refresh);
    // Also set cookie for Next proxy routing.
    setAccessTokenCookie(access);
  }
};

export const clearTokens = () => {
  if (typeof window !== "undefined") {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    document.cookie = "accessToken=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
  }
};
