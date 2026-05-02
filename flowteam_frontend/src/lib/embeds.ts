export type EmbedItem =
  | { type: "figma"; url: string; embedUrl: string; title: string }
  | { type: "miro"; url: string; embedUrl: string; title: string }
  | { type: "gdrive"; url: string; embedUrl: string; title: string };

const URL_RE = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;

function normalizeUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  if (trimmed.startsWith("www.")) return `https://${trimmed}`;
  return trimmed;
}

function stripTrailingPunctuation(url: string): string {
  let out = url;
  while (out.length && /[).,!?:;]$/.test(out)) out = out.slice(0, -1);
  return out;
}

function toFigmaEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(\.|^)figma\.com$/i.test(u.hostname)) return null;
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

function toMiroEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(\.|^)miro\.com$/i.test(u.hostname)) return null;
    // Miro supports embedding regular board links. Keep it simple.
    return `https://miro.com/app/live-embed/${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

function toGoogleDriveEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    if (!host.endsWith("drive.google.com") && !host.endsWith("docs.google.com")) return null;

    const path = u.pathname;
    // Common formats:
    // - drive.google.com/file/d/<id>/view
    // - docs.google.com/document/d/<id>/edit
    // - docs.google.com/spreadsheets/d/<id>/edit
    // - docs.google.com/presentation/d/<id>/edit
    const m = path.match(/\/d\/([a-zA-Z0-9_-]{10,})/);
    if (!m) return null;
    const id = m[1];

    if (host.endsWith("drive.google.com")) return `https://drive.google.com/file/d/${id}/preview`;

    if (path.startsWith("/document/")) return `https://docs.google.com/document/d/${id}/preview`;
    if (path.startsWith("/spreadsheets/")) return `https://docs.google.com/spreadsheets/d/${id}/preview`;
    if (path.startsWith("/presentation/")) return `https://docs.google.com/presentation/d/${id}/preview`;
    return `https://drive.google.com/file/d/${id}/preview`;
  } catch {
    return null;
  }
}

export function extractEmbedsFromText(text: string, limit = 3): EmbedItem[] {
  if (!text) return [];
  const urls = Array.from(text.matchAll(URL_RE)).map((m) => stripTrailingPunctuation(normalizeUrl(m[0] ?? ""))).filter(Boolean);

  const seen = new Set<string>();
  const out: EmbedItem[] = [];

  for (const url of urls) {
    if (seen.has(url)) continue;
    seen.add(url);

    const figma = toFigmaEmbedUrl(url);
    if (figma) {
      out.push({ type: "figma", url, embedUrl: figma, title: "Figma" });
      if (out.length >= limit) break;
      continue;
    }

    const drive = toGoogleDriveEmbedUrl(url);
    if (drive) {
      out.push({ type: "gdrive", url, embedUrl: drive, title: "Google Drive" });
      if (out.length >= limit) break;
      continue;
    }

    const miro = toMiroEmbedUrl(url);
    if (miro) {
      out.push({ type: "miro", url, embedUrl: miro, title: "Miro" });
      if (out.length >= limit) break;
      continue;
    }
  }

  return out;
}

