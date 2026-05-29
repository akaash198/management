import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getHostnameFromHostHeader(host: string): string {
  // Can be: "example.com", "example.com:443", or (forwarded) "a.com, b.com"
  const first = host.split(",")[0]?.trim() ?? host.trim();
  return first.replace(/:\d+$/, "");
}

function getAllowedHostnames(req: NextRequest): Set<string> {
  const allowed = new Set<string>();
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");
  const publicHost = forwardedHost || host;
  if (publicHost) allowed.add(getHostnameFromHostHeader(publicHost));

  // Fallback to what Next thinks the origin is (may be internal behind proxies).
  try { allowed.add(req.nextUrl.hostname); } catch { /* ignore */ }

  const apiEnv = process.env.NEXT_PUBLIC_API_URL;
  if (apiEnv) {
    try {
      const apiUrl = new URL(apiEnv, req.nextUrl.origin);
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
  try {
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

    const allowedHostnames = getAllowedHostnames(req);
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
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
        headers: { "cache-control": "no-store" },
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/pdf";
    const body = await upstream.arrayBuffer();

    // If we didn't actually get a PDF, return a short diagnostic payload instead of a blank viewer.
    const isPdf = /^application\/pdf\b/i.test(contentType);
    if (!isPdf) {
      const bytes = Buffer.from(body);
      const snippet = bytes.subarray(0, Math.min(bytes.length, 800)).toString("utf8");
      const msg =
        `Unexpected content-type from upstream.\n` +
        `content-type: ${contentType}\n` +
        `final-url: ${upstream.url}\n\n` +
        `body (first bytes):\n${snippet}`;
      return new Response(msg, {
        status: 502,
        headers: {
          "content-type": "text/plain; charset=utf-8",
          "cache-control": "no-store",
          "x-proxy-final-url": upstream.url,
          "x-proxy-content-type": contentType,
          "x-proxy-content-length": String(body.byteLength),
        },
      });
    }

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
        "content-disposition": `${download ? "attachment" : "inline"}; filename="${filename.replace(/\"/g, "")}"`,
        "x-proxy-final-url": upstream.url,
        "x-proxy-content-type": contentType,
        "x-proxy-content-length": String(body.byteLength),
      },
    });
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : "Unknown error";
    const stack = e instanceof Error ? e.stack : "";
    const body = `PDF proxy internal error.\n\n${message}\n\n${stack ?? ""}`;
    return new Response(body, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}
