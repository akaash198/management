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
      // If it's an absolute URL and pointing to the same host, ensure the protocol matches.
      // This prevents issues where a build-time HTTPS URL breaks an HTTP deployment.
      try {
        const apiUrl = new URL(envValue, window.location.origin);
        if (apiUrl.hostname === window.location.hostname || apiUrl.hostname === "localhost" || apiUrl.hostname === "127.0.0.1") {
          return `${window.location.protocol}//${apiUrl.host}${apiUrl.pathname.replace(/\/$/, "")}`;
        }
      } catch (e) {
        // Fall back to envValue if URL parsing fails
      }

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
    // 1. Explicit WS URL from env (absolute and not localhost)
    if (
      envValue &&
      (envValue.startsWith("ws://") || envValue.startsWith("wss://")) &&
      !isLocalhostUrl(envValue)
    ) {
      return envValue;
    }

    // 2. Derive from API env var if it's absolute
    const apiEnv = process.env.NEXT_PUBLIC_API_URL;
    if (apiEnv && (apiEnv.startsWith("http://") || apiEnv.startsWith("https://"))) {
      try {
        const apiUrl = new URL(apiEnv, window.location.origin);
        // If the API host matches the current page host, use current origin's protocol/host
        if (apiUrl.hostname === window.location.hostname || isLocalhostUrl(apiUrl.href)) {
          const proto = window.location.protocol === "https:" ? "wss" : "ws";
          // If we are on a real host (not localhost), don't force a port unless the API URL explicitly has one
          const host = apiUrl.hostname === window.location.hostname ? window.location.host : apiUrl.host;
          return `${proto}://${host}`;
        }
      } catch (e) { /* ignore */ }
    }

    // 3. Fallback: use current window location
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    const host = window.location.host;
    
    // On localhost dev, we often need port 8000
    if (isLocalhostUrl(window.location.origin) && !host.includes(":")) {
      return `${proto}://${host}:8000`;
    }
    
    return `${proto}://${host}`;
  }

  // Server-side / Build-time
  if (envValue) return envValue;
  return "ws://localhost:8000";
}
