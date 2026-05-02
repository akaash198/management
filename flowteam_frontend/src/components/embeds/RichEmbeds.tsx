"use client";

import { extractEmbedsFromText, type EmbedItem } from "@/lib/embeds";

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
  return (
    <div className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between border-b border-border px-3 py-2">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-foreground">{item.title}</p>
          <p className="truncate text-[11px] text-muted-foreground">{item.url}</p>
        </div>
        <a
          href={item.url}
          target="_blank"
          rel="noreferrer"
          className="shrink-0 text-[11px] font-medium text-primary hover:underline"
        >
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

