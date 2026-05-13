function isLocalhostUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    const h = parsed.hostname;
    return h === "localhost" || h === "127.0.0.1" || h === "::1";
  } catch {
    return false;
  }
}

export function getApiBaseUrl(): string {
  const envValue = process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== "undefined") {
    if (envValue) {
      const isApiLocal = isLocalhostUrl(envValue);
      // Only use absolute localhost API URL if the page itself is also on localhost (supports cross-port dev)
      if (!isApiLocal || isLocalhostUrl(window.location.origin)) {
        return envValue;
      }
    }
    return `${window.location.origin}/api`;
  }
  if (envValue) return envValue;
  return "http://localhost:8000/api";
}

export function getWsBaseUrl(): string {
  const envValue = process.env.NEXT_PUBLIC_WS_URL;
  if (typeof window !== "undefined") {
    // Explicit absolute WS URL that isn't localhost — use as-is.
    if (
      envValue &&
      (envValue.startsWith("ws://") || envValue.startsWith("wss://")) &&
      !isLocalhostUrl(envValue)
    ) {
      return envValue;
    }

    // Derive from the API env var if it's an absolute non-localhost URL.
    const apiEnv = process.env.NEXT_PUBLIC_API_URL;
    if (
      apiEnv &&
      (apiEnv.startsWith("http://") || apiEnv.startsWith("https://")) &&
      !isLocalhostUrl(apiEnv)
    ) {
      try {
        const apiUrl = new URL(apiEnv);
        const proto = apiUrl.protocol === "https:" ? "wss" : "ws";
        return `${proto}://${apiUrl.host}`;
      } catch {
        // fall through
      }
    }

    // Default: same origin as the page.
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}`;
  }

  // Server-side (SSR/build) — use localhost fallback; WS isn't used server-side.
  if (
    envValue &&
    (envValue.startsWith("ws://") || envValue.startsWith("wss://"))
  ) {
    return envValue;
  }
  return "ws://127.0.0.1:8000";
}
