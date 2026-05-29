"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useMemo, useRef, useState } from "react";

type PdfJsModule = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: { data: ArrayBuffer }) => { promise: Promise<PdfDocument> };
};

type PdfDocument = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

type PdfPage = {
  getViewport: (opts: { scale: number }) => { width: number; height: number };
  render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: { width: number; height: number } }) => { promise: Promise<void> };
};

async function importPdfJs(url: string): Promise<PdfJsModule> {
  const importer = new Function("u", "return import(u)") as (u: string) => Promise<unknown>;
  const mod = await importer(url);
  return mod as PdfJsModule;
}

function PDFViewerContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const name = searchParams.get("name") || "Document";
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "ready" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  const proxyUrl = useMemo(() => {
    if (!url) return null;
    return `/view/pdf/proxy?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}`;
  }, [url, name]);

  const downloadUrl = useMemo(() => {
    if (!url) return null;
    return `/view/pdf/proxy?url=${encodeURIComponent(url)}&name=${encodeURIComponent(name)}&download=1`;
  }, [url, name]);

  useEffect(() => {
    if (name) {
      document.title = name;
    }
  }, [name]);

  useEffect(() => {
    if (!proxyUrl) return;
    const el = containerRef.current;
    if (!el) return;

    let cancelled = false;
    el.innerHTML = "";
    setStatus("loading");
    setError(null);

    const run = async () => {
      try {
        const response = await fetch(proxyUrl, { credentials: "include", cache: "no-store" });
        if (!response.ok) {
          const text = await response.text().catch(() => "");
          throw new Error(text || `Failed to load PDF (${response.status})`);
        }
        const data = await response.arrayBuffer();
        if (cancelled) return;

        const pdfjs = await importPdfJs("/vendor/pdfjs/pdf.min.mjs");
        pdfjs.GlobalWorkerOptions.workerSrc = "/vendor/pdfjs/pdf.worker.min.mjs";

        const doc = await pdfjs.getDocument({ data }).promise;
        const scale = 1.25;

        for (let i = 1; i <= doc.numPages; i++) {
          if (cancelled) return;
          const page = await doc.getPage(i);
          const viewport = page.getViewport({ scale });

          const pageWrap = document.createElement("div");
          pageWrap.className = "mx-auto my-4 w-fit rounded-lg bg-[#0a0a0f] shadow-sm border border-white/10";

          const canvas = document.createElement("canvas");
          canvas.width = Math.floor(viewport.width);
          canvas.height = Math.floor(viewport.height);
          canvas.className = "block";

          pageWrap.appendChild(canvas);
          el.appendChild(pageWrap);

          const ctx = canvas.getContext("2d");
          if (!ctx) throw new Error("Canvas not supported");
          await page.render({ canvasContext: ctx, viewport }).promise;
        }

        if (!cancelled) setStatus("ready");
      } catch (e: unknown) {
        if (cancelled) return;
        setStatus("error");
        setError(e instanceof Error ? e.message : "Failed to render PDF");
      }
    };

    void run();
    return () => { cancelled = true; };
  }, [proxyUrl]);

  if (!url) {
    return (
      <div className="flex h-screen items-center justify-center bg-[#0a0a0f] text-muted-foreground">
        No document specified.
      </div>
    );
  }

  return (
    <div className="flex h-screen w-full flex-col bg-[#0a0a0f]">
      <div className="flex h-12 items-center justify-between border-b border-white/10 px-4 bg-card/50 backdrop-blur-md z-10">
        <div className="flex items-center gap-3 min-w-0">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 text-red-500">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>
          </div>
          <h1 className="text-[13px] font-semibold text-white truncate max-w-lg">{name}</h1>
        </div>
        <div className="flex items-center gap-2">
          {downloadUrl && (
            <a 
              href={downloadUrl} 
              download={name}
              className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/10 transition-all"
            >
              Download
            </a>
          )}
          <button 
            onClick={() => window.close()}
            className="rounded-lg bg-white/5 border border-white/10 px-3 py-1.5 text-[11px] font-bold text-white hover:bg-white/10 transition-all"
          >
            Close
          </button>
        </div>
      </div>
      
      <div className="flex-1 relative bg-[#1e1e24]">
        {status === "loading" && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#0a0a0f]/40">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {status === "error" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-3 rounded-full bg-destructive/10 p-3 text-destructive">
              <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <div className="text-white font-semibold">Couldn’t preview this PDF</div>
            {error && <div className="mt-2 text-sm text-muted-foreground max-w-xl whitespace-pre-wrap">{error}</div>}
          </div>
        )}
        <div ref={containerRef} className="h-full overflow-auto px-4" />
      </div>
    </div>
  );
}

export default function PDFViewerPage() {
  return (
    <Suspense fallback={<div className="h-screen bg-[#0a0a0f]" />}>
      <PDFViewerContent />
    </Suspense>
  );
}
