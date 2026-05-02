type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function axiosNetworkHint(input: UnknownRecord): string | null {
  const message = typeof input.message === "string" ? input.message : "";
  const code = typeof input.code === "string" ? input.code : "";
  const isAxiosError = typeof input.isAxiosError === "boolean" ? input.isAxiosError : false;
  const hasResponse = "response" in input && input.response != null;

  const looksLikeNetworkError =
    message.toLowerCase() === "network error" ||
    code === "ERR_NETWORK" ||
    (isAxiosError && !hasResponse && ("request" in input || "config" in input));

  if (!looksLikeNetworkError) return null;

  const config = isRecord(input.config) ? input.config : null;
  const baseURL = config && typeof config.baseURL === "string" ? config.baseURL : "";
  const url = config && typeof config.url === "string" ? config.url : "";
  const target = (baseURL || url) ? ` (${baseURL}${url})` : "";

  return `Cannot reach the API${target}. Is the backend running and is NEXT_PUBLIC_API_URL correct?`;
}

export function toErrorMessage(input: unknown, fallback: string): string {
  if (input == null) return fallback;
  if (typeof input === "string") return input;
  if (typeof input === "number" || typeof input === "boolean") return String(input);
  if (input instanceof Error) return input.message || fallback;

  if (Array.isArray(input)) {
    const parts = input
      .map((v) => toErrorMessage(v, ""))
      .map((s) => s.trim())
      .filter(Boolean);
    return parts.length ? parts.join("\n") : fallback;
  }

  if (isRecord(input)) {
    const networkHint = axiosNetworkHint(input);
    if (networkHint) return networkHint;

    // DRF-style error shape: { detail: "..." }
    if (typeof input.detail === "string") return input.detail;
    if (typeof input.message === "string") return input.message;

    // Our backend sometimes nests errors: { error: {...} }
    if ("error" in input) return toErrorMessage(input.error, fallback);

    // Field errors: { email: ["..."], password: ["..."] }
    const values = Object.values(input);
    const flattened = values
      .map((v) => toErrorMessage(v, ""))
      .map((s) => s.trim())
      .filter(Boolean);
    if (flattened.length) return flattened.join("\n");

    try {
      return JSON.stringify(input);
    } catch {
      return fallback;
    }
  }

  try {
    return String(input);
  } catch {
    return fallback;
  }
}
