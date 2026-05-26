import type { NextConfig } from "next";

function getApiOrigin(): string {
  const raw = process.env.NEXT_PUBLIC_API_URL ?? "";
  // Relative URLs (e.g. "/api") have no origin — skip CSP source for those
  // because the frontend and API are on the same origin anyway.
  if (!raw || raw.startsWith("/")) return "";
  try {
    return new URL(raw).origin;
  } catch {
    return "";
  }
}

const API_ORIGIN = getApiOrigin();
const WS_ORIGIN = API_ORIGIN ? API_ORIGIN.replace(/^http/, "ws") : "";

// Content Security Policy
// - Tightened for production; relaxed only where Next.js/WebRTC genuinely needs it.
const csp = [
  "default-src 'self'",
  // Scripts: self + inline (Next.js needs inline for __NEXT_DATA__ hydration)
  "script-src 'self' 'unsafe-inline'",
  // Styles: self + inline (Tailwind CSS-in-JS / shadcn uses inline styles)
  "style-src 'self' 'unsafe-inline'",
  // Images: self + data URIs + API origin (avatars, media)
  `img-src 'self' data: blob:${API_ORIGIN ? ` ${API_ORIGIN}` : ""}`,
  // Media: self + API origin (audio/video uploads)
  `media-src 'self' blob:${API_ORIGIN ? ` ${API_ORIGIN}` : ""}`,
  // WebSockets + API calls
  `connect-src 'self'${API_ORIGIN ? ` ${API_ORIGIN}` : ""}${WS_ORIGIN ? ` ${WS_ORIGIN}` : ""}`,
  // Fonts: self only
  "font-src 'self'",
  // Frames: self only (deny embedding from other origins)
  "frame-ancestors 'self'",
  // Camera/Mic for WebRTC — no explicit CSP directive needed (controlled by Permissions-Policy)
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(self), microphone=(self), display-capture=(self), geolocation=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      { protocol: "http", hostname: "localhost" },
      { protocol: "https", hostname: "localhost" },
      { protocol: "http", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "127.0.0.1" },
      { protocol: "https", hostname: "**.example.com" },
      { protocol: "https", hostname: "**.flowteam.app" },
      { protocol: "https", hostname: "**.fly.dev" },
      { protocol: "https", hostname: "railway.app" },
      { protocol: "https", hostname: "*.vercel.app" },
    ],
  },
};

export default nextConfig;
