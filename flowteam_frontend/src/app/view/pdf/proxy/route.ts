import { NextRequest } from "next/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  if (!rawUrl) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl, req.nextUrl.origin);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  // Basic SSRF guard: only allow fetching from our own origin.
  if (target.origin !== req.nextUrl.origin) {
    return new Response("Unsupported url origin", { status: 400 });
  }

  const cookie = req.headers.get("cookie") ?? "";
  const userAgent = req.headers.get("user-agent") ?? "";
  const referer = req.headers.get("referer") ?? "";

  const upstream = await fetch(target.toString(), {
    method: "GET",
    headers: {
      accept: "application/pdf,*/*",
      ...(cookie ? { cookie } : {}),
      ...(userAgent ? { "user-agent": userAgent } : {}),
      ...(referer ? { referer } : {}),
    },
    cache: "no-store",
    redirect: "follow",
  });

  if (!upstream.ok) {
    return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
  }

  const contentType = upstream.headers.get("content-type") ?? "application/pdf";
  const body = await upstream.arrayBuffer();

  return new Response(body, {
    status: 200,
    headers: {
      "content-type": contentType,
      "cache-control": "no-store",
    },
  });
}

