"use client";

import { extractEmbedsFromText, type EmbedItem } from "@/lib/embeds";
import { ExternalLink, GitBranch, Play, FileText, Globe } from "lucide-react";

export function RichEmbeds({ text, limit = 2 }: { text: string; limit?: number }) {
  const embeds = extractEmbedsFromText(text, limit);
  if (!embeds.length) return null;

  return (
    <div className="mt-3 space-y-2">
      {embeds.map((e) => (
        <EmbedCard key={`${e.type}:${e.url}`} item={e} />
      ))}
    </div>
  );
}

function EmbedCard({ item }: { item: EmbedItem }) {
  // Iframe-based embeds (YouTube, Loom, Figma, Miro, GDrive)
  if (item.type === "youtube" || item.type === "loom") {
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex h-5 w-5 items-center justify-center rounded bg-red-500/10 text-red-500">
              <Play size={10} />
            </div>
            <p className="truncate text-[11px] font-semibold text-foreground">{item.title}</p>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 shrink-0 text-[10px] font-medium text-primary hover:underline"
          >
            <ExternalLink size={10} />
            Open
          </a>
        </div>
        <div className="relative aspect-video w-full">
          <iframe
            src={item.embedUrl}
            title={`${item.type} embed`}
            className="h-full w-full border-0"
            allow="fullscreen; clipboard-read; clipboard-write; accelerometer; autoplay; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      </div>
    );
  }

  if (item.type === "figma" || item.type === "miro" || item.type === "gdrive") {
    const iconColor = item.type === "figma" ? "text-purple-500 bg-purple-500/10" : item.type === "gdrive" ? "text-blue-500 bg-blue-500/10" : "text-yellow-500 bg-yellow-500/10";
    const Icon = item.type === "gdrive" ? FileText : Globe;
    return (
      <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/60 px-3 py-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className={`flex h-5 w-5 items-center justify-center rounded ${iconColor}`}>
              <Icon size={10} />
            </div>
            <p className="truncate text-[11px] font-semibold text-foreground">{item.title}</p>
          </div>
          <a
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1 shrink-0 text-[10px] font-medium text-primary hover:underline"
          >
            <ExternalLink size={10} />
            Open
          </a>
        </div>
        <iframe
          src={item.embedUrl}
          title={`${item.type} embed`}
          className="h-56 w-full border-0"
          allow="fullscreen; clipboard-read; clipboard-write"
        />
      </div>
    );
  }

  // GitHub-style card (no iframe)
  if (item.type === "github") {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="group flex items-start gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:bg-muted/30 shadow-sm"
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#24292f]/10 dark:bg-white/10 text-foreground mt-0.5">
          <GitBranch size={16} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {item.title}
          </p>
          {item.description && (
            <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{item.description}</p>
          )}
          <p className="mt-1 text-[10px] text-muted-foreground/60 truncate">{item.url}</p>
        </div>
        <ExternalLink size={12} className="mt-1 shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
      </a>
    );
  }

  // Generic link preview card
  return (
    <a
      href={item.url}
      target="_blank"
      rel="noreferrer"
      className="group flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 transition-all hover:border-primary/30 hover:bg-muted/30 shadow-sm"
    >
      {"favicon" in item && item.favicon ? (
        <img
          src={item.favicon}
          alt=""
          className="h-8 w-8 shrink-0 rounded-lg object-contain bg-muted/30 p-1"
          onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
        />
      ) : (
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Globe size={14} />
        </div>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-foreground group-hover:text-primary transition-colors truncate">
          {item.title}
        </p>
        {item.description && (
          <p className="mt-0.5 text-[11px] text-muted-foreground truncate">{item.description}</p>
        )}
      </div>
      <ExternalLink size={12} className="shrink-0 text-muted-foreground/40 group-hover:text-primary transition-colors" />
    </a>
  );
}
