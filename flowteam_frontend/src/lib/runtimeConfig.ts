export function getApiBaseUrl(): string {
  const envValue = process.env.NEXT_PUBLIC_API_URL;
  if (envValue) return envValue;
  if (typeof window !== "undefined") return `${window.location.origin}/api`;
  return "http://localhost:8000/api";
}

export function getWsBaseUrl(): string {
  const envValue = process.env.NEXT_PUBLIC_WS_URL;
  if (envValue) {
    // If it's already an absolute ws/wss URL, use it directly.
    if (envValue.startsWith("ws://") || envValue.startsWith("wss://")) return envValue;
    // If it's a relative path or just a path prefix, derive the WS origin from
    // the current page and ignore the env value (the path is already in useMessaging).
    // Fall through to the window.location derivation below.
  }

  // If the API base URL is configured (common in local dev), derive WS base from it.
  const apiEnv = process.env.NEXT_PUBLIC_API_URL;
  if (apiEnv && (apiEnv.startsWith("http://") || apiEnv.startsWith("https://"))) {
    try {
      const apiUrl = new URL(apiEnv);
      const proto = apiUrl.protocol === "https:" ? "wss" : "ws";
      return `${proto}://${apiUrl.host}`;
    } catch {
      // fall through
    }
  }

  if (typeof window !== "undefined") {
    const proto = window.location.protocol === "https:" ? "wss" : "ws";
    return `${proto}://${window.location.host}`;
  }
  return "ws://127.0.0.1:8000";
}
