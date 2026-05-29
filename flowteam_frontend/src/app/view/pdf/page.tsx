"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, Suspense, useMemo } from "react";

function PDFViewerContent() {
  const searchParams = useSearchParams();
  const url = searchParams.get("url");
  const name = searchParams.get("name") || "Document";

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
        {proxyUrl ? (
          <iframe
            key={proxyUrl}
            title={name}
            src={`${proxyUrl}#toolbar=0&navpanes=0&statusbar=0`}
            className="h-full w-full border-0"
          />
        ) : null}
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
