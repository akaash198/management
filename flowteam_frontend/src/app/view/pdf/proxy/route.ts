import { NextRequest } from "next/server";

export const runtime = "nodejs";

function getAllowedHostnames(requestOrigin: string): Set<string> {
  const allowed = new Set<string>();
  try {
    allowed.add(new URL(requestOrigin).hostname);
  } catch {
    // ignore
  }

  const apiEnv = process.env.NEXT_PUBLIC_API_URL;
  if (apiEnv) {
    try {
      const apiUrl = new URL(apiEnv, requestOrigin);
      allowed.add(apiUrl.hostname);
    } catch {
      // ignore
    }
  }

  // Dev convenience (safe in prod because it won't match external hostnames).
  allowed.add("localhost");
  allowed.add("127.0.0.1");
  allowed.add("::1");

  return allowed;
}

export async function GET(req: NextRequest) {
  const rawUrl = req.nextUrl.searchParams.get("url");
  const filename = req.nextUrl.searchParams.get("name") ?? "document.pdf";
  const download = req.nextUrl.searchParams.get("download") === "1";
  if (!rawUrl) {
    return new Response("Missing url", { status: 400 });
  }

  let target: URL;
  try {
    target = new URL(rawUrl, req.nextUrl.origin);
  } catch {
    return new Response("Invalid url", { status: 400 });
  }

  // Basic SSRF guard: only allow fetching from approved hosts (app host + API host).
  if (target.protocol !== "http:" && target.protocol !== "https:") {
    return new Response("Unsupported url protocol", { status: 400 });
  }

  const allowedHostnames = getAllowedHostnames(req.nextUrl.origin);
  if (!allowedHostnames.has(target.hostname)) {
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
      "content-disposition": `${download ? "attachment" : "inline"}; filename="${filename.replace(/\"/g, "")}"`,
    },
  });
}
