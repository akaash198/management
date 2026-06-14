import { formatDistanceToNow } from "date-fns";

export function safeLower(value?: string | null) {
  return (value || "").toLowerCase();
}

export function getInitials(value?: string | null) {
  const source = (value || "").trim();
  if (!source) return "?";
  return source
    .split(/\s+/)
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function firstWord(value?: string | null, fallback = "Unknown") {
  const source = (value || "").trim();
  if (!source) return fallback;
  return source.split(/\s+/)[0] || fallback;
}

export function safeDateLabel(
  value?: string | null,
  fallback = "—",
  locale?: Intl.LocalesArgument,
  options?: Intl.DateTimeFormatOptions
) {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString(locale, options);
}

export function safeDistanceToNow(value?: string | null, fallback = "Recently") {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return formatDistanceToNow(date, { addSuffix: true });
}
