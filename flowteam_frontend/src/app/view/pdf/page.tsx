"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useState } from "react";

type PDFDoc = {
  setTitle: (title: string) => void;
  save: () => Promise<Uint8Array>;
};

type PDFLibGlobal = {
  PDFDocument: {
    load: (data: ArrayBuffer) => Promise<PDFDoc>;
  };
};

function PDFViewerContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const name = searchParams.get("name") || "Document";
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (name) {
      document.title = name;
    }
  }, [name]);

  useEffect(() => {
    if (!url) return;
    
    setLoading(true);
    setError(null);
    setBlobUrl(null);

    const loadAndFixPDF = async () => {
      let createdUrl: string | null = null;
      try {
        const proxyUrl = `/view/pdf/proxy?url=${encodeURIComponent(url)}`;
        // 1. Fetch the raw PDF
        const response = await fetch(proxyUrl, { cache: "no-store", credentials: "include" });
        if (!response.ok) throw new Error(`Failed to load PDF: ${response.statusText}`);
        const data = await response.arrayBuffer();

        // 2. Load pdf-lib dynamically to modify metadata
        // We use a CDN here to avoid requiring a new npm install for this specific viewer fix
        const globalAny = window as unknown as { PDFLib?: PDFLibGlobal };
        if (!globalAny.PDFLib) {
          await new Promise((resolve, reject) => {
            const script = document.createElement("script");
            script.src = "https://unpkg.com/pdf-lib@1.17.1/dist/pdf-lib.min.js";
            script.onload = resolve;
            script.onerror = reject;
            document.body.appendChild(script);
          });
        }

        const pdfLib = (window as unknown as { PDFLib?: PDFLibGlobal }).PDFLib;
        if (!pdfLib) throw new Error("Failed to load PDF renderer library");
        const { PDFDocument } = pdfLib;
        
        // 3. Re-write the metadata in memory
        const pdfDoc = await PDFDocument.load(data);
        pdfDoc.setTitle(name); // This replaces "(anonymous)" in the viewer UI
        
        const pdfBytes = await pdfDoc.save();
        createdUrl = URL.createObjectURL(new Blob([pdfBytes], { type: "application/pdf" }));
        setBlobUrl(createdUrl);
      } catch (err: unknown) {
        console.error("PDF Load Error:", err);
        const msg = err instanceof Error ? err.message : "Unknown error";
        setError(msg);
        if (createdUrl) URL.revokeObjectURL(createdUrl);
      } finally {
        setLoading(false);
      }
    };

    loadAndFixPDF();

    return () => {
      setBlobUrl((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return null;
      });
    };
  }, [url, name]);

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
          {blobUrl && (
            <a 
              href={blobUrl} 
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
        {loading && (
          <div className="absolute inset-0 flex items-center justify-center z-20 bg-[#0a0a0f]/50">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
        {error ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
            <div className="mb-4 rounded-full bg-destructive/10 p-3 text-destructive">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            </div>
            <h2 className="text-lg font-semibold text-white">Failed to load document</h2>
            <p className="mt-2 text-sm text-muted-foreground max-w-xs">{error}</p>
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 rounded-lg bg-primary px-4 py-2 text-sm font-bold text-primary-foreground hover:opacity-90"
            >
              Retry
            </button>
          </div>
        ) : blobUrl ? (
          <embed
            src={`${blobUrl}#toolbar=0&navpanes=0&statusbar=0`}
            type="application/pdf"
            className="h-full w-full border-0"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center p-6 text-center text-muted-foreground">
            Could not render this document.
          </div>
        )}
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
