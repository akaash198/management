import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

import { getApiBaseUrl } from "./runtimeConfig"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function normalizeUrl(url: string | null | undefined): string | undefined {
  if (!url) return undefined;
  if (url.startsWith("http://") || url.startsWith("https://") || url.startsWith("data:")) {
    return url;
  }
  const apiBase = getApiBaseUrl();
  const apiOrigin = apiBase.replace(/\/api\/?$/, "");
  return url.startsWith("/") ? `${apiOrigin}${url}` : `${apiOrigin}/${url}`;
}
