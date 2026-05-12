export type EmbedItem =
  | { type: "figma"; url: string; embedUrl: string; title: string }
  | { type: "miro"; url: string; embedUrl: string; title: string }
  | { type: "gdrive"; url: string; embedUrl: string; title: string }
  | { type: "youtube"; url: string; embedUrl: string; title: string }
  | { type: "loom"; url: string; embedUrl: string; title: string }
  | { type: "github"; url: string; embedUrl: string; title: string; description?: string }
  | { type: "link"; url: string; embedUrl: string; title: string; description?: string; favicon?: string; image?: string };

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
    if (!/(\.|\^)figma\.com$/i.test(u.hostname)) return null;
    return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
  } catch {
    return null;
  }
}

function toMiroEmbedUrl(url: string): string | null {
  try {
    const u = new URL(url);
    if (!/(\.|\^)miro\.com$/i.test(u.hostname)) return null;
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

function toYouTubeEmbedUrl(url: string): { embedUrl: string; title: string } | null {
  try {
    const u = new URL(url);
    const host = u.hostname.toLowerCase();
    let videoId: string | null = null;

    if (host === "youtu.be" || host === "www.youtu.be") {
      videoId = u.pathname.slice(1).split("/")[0] || null;
    } else if (host.endsWith("youtube.com")) {
      videoId = u.searchParams.get("v");
      if (!videoId) {
        const embedMatch = u.pathname.match(/\/embed\/([a-zA-Z0-9_-]+)/);
        if (embedMatch) videoId = embedMatch[1];
      }
    }

    if (!videoId || videoId.length < 5) return null;
    return {
      embedUrl: `https://www.youtube.com/embed/${videoId}?rel=0`,
      title: "YouTube",
    };
  } catch {
    return null;
  }
}

function toLoomEmbedUrl(url: string): { embedUrl: string; title: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("loom.com")) return null;
    const m = u.pathname.match(/\/share\/([a-zA-Z0-9]+)/);
    if (!m) return null;
    return {
      embedUrl: `https://www.loom.com/embed/${m[1]}`,
      title: "Loom",
    };
  } catch {
    return null;
  }
}

function toGitHubPreview(url: string): { title: string; description: string } | null {
  try {
    const u = new URL(url);
    if (!u.hostname.endsWith("github.com")) return null;
    const parts = u.pathname.split("/").filter(Boolean);
    if (parts.length < 2) return null;
    const owner = parts[0];
    const repo = parts[1];
    const isPR = parts[2] === "pull";
    const isIssue = parts[2] === "issues";
    if (isPR) return { title: `GitHub PR · ${owner}/${repo}#${parts[3]}`, description: `Pull Request in ${owner}/${repo}` };
    if (isIssue) return { title: `GitHub Issue · ${owner}/${repo}#${parts[3]}`, description: `Issue in ${owner}/${repo}` };
    return { title: `GitHub · ${owner}/${repo}`, description: `Repository on GitHub` };
  } catch {
    return null;
  }
}

/** Generates a generic link preview for URLs that don't match known embeds. */
function toGenericLinkPreview(url: string): EmbedItem | null {
  try {
    const u = new URL(url);
    const hostname = u.hostname.replace(/^www\./, "");
    const favicon = `https://www.google.com/s2/favicons?domain=${hostname}&sz=64`;
    return {
      type: "link",
      url,
      embedUrl: url,
      title: hostname,
      description: u.pathname.length > 1 ? decodeURIComponent(u.pathname).replace(/\//g, " › ").trim().slice(0, 120) : "",
      favicon,
    };
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

    const yt = toYouTubeEmbedUrl(url);
    if (yt) {
      out.push({ type: "youtube", url, embedUrl: yt.embedUrl, title: yt.title });
      if (out.length >= limit) break;
      continue;
    }

    const loom = toLoomEmbedUrl(url);
    if (loom) {
      out.push({ type: "loom", url, embedUrl: loom.embedUrl, title: loom.title });
      if (out.length >= limit) break;
      continue;
    }

    const gh = toGitHubPreview(url);
    if (gh) {
      out.push({ type: "github", url, embedUrl: url, title: gh.title, description: gh.description });
      if (out.length >= limit) break;
      continue;
    }

    // Generic link preview for any other URL
    const generic = toGenericLinkPreview(url);
    if (generic) {
      out.push(generic);
      if (out.length >= limit) break;
    }
  }

  return out;
}
