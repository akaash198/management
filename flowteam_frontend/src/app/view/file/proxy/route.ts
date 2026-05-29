import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getInternalOrigin(req: NextRequest): string | null {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = forwardedHost || req.headers.get("host");
  if (!host) return null;

  const internal = process.env.INTERNAL_APP_ORIGIN;
  if (internal) return internal.replace(/\/$/, "");

  return `http://${host.split(",")[0].trim().replace(/\/$/, "")}`;
}

function getHostnameFromHostHeader(host: string): string {
  const first = host.split(",")[0]?.trim() ?? host.trim();
  return first.replace(/:\d+$/, "");
}

function getAllowedHostnames(req: NextRequest): Set<string> {
  const allowed = new Set<string>();
  const forwardedHost = req.headers.get("x-forwarded-host");
  const host = req.headers.get("host");
  const publicHost = forwardedHost || host;
  if (publicHost) allowed.add(getHostnameFromHostHeader(publicHost));

  try {
    allowed.add(req.nextUrl.hostname);
  } catch {
    // ignore
  }

  const apiEnv = process.env.NEXT_PUBLIC_API_URL;
  if (apiEnv) {
    try {
      const apiUrl = new URL(apiEnv, req.nextUrl.origin);
      allowed.add(apiUrl.hostname);
    } catch {
      // ignore
    }
  }

  allowed.add("localhost");
  allowed.add("127.0.0.1");
  allowed.add("::1");

  return allowed;
}

function safeFilename(name: string): string {
  return name.replace(/[\\/\r\n"]/g, "").trim() || "file";
}

export async function GET(req: NextRequest) {
  try {
    const rawUrl = req.nextUrl.searchParams.get("url");
    const filename = safeFilename(req.nextUrl.searchParams.get("name") ?? "file");
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
    const authorization = req.headers.get("authorization") ?? "";

    const publicHost = getHostnameFromHostHeader(req.headers.get("x-forwarded-host") || req.headers.get("host") || "");
    const samePublicHost = !!publicHost && target.hostname === publicHost;

    const internalOrigin = getInternalOrigin(req);
    const fetchUrl = samePublicHost && internalOrigin
      ? new URL(`${target.pathname}${target.search}`, internalOrigin).toString()
      : target.toString();

    const upstream = await fetch(fetchUrl, {
      method: "GET",
      headers: {
        accept: "*/*",
        ...(cookie ? { cookie } : {}),
        ...(authorization ? { authorization } : {}),
        ...(userAgent ? { "user-agent": userAgent } : {}),
        ...(referer ? { referer } : {}),
      },
      signal: AbortSignal.timeout(30_000),
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, {
        status: upstream.status,
        headers: { "cache-control": "no-store" },
      });
    }

    const contentType = upstream.headers.get("content-type") ?? "application/octet-stream";
    const body = await upstream.arrayBuffer();

    return new Response(body, {
      status: 200,
      headers: {
        "content-type": contentType,
        "cache-control": "no-store",
        "content-disposition": `${download ? "attachment" : "inline"}; filename="${filename}"`,
        "x-proxy-final-url": upstream.url,
        "x-proxy-content-type": contentType,
        "x-proxy-content-length": String(body.byteLength),
      },
    });
  } catch (e: unknown) {
    const err = e instanceof Error ? e : new Error("Unknown error");
    const message = err.message;
    const stack = err.stack ?? "";
    const body = `File proxy internal error.\n\n${message}\n\n${stack}`;
    return new Response(body, {
      status: 502,
      headers: { "content-type": "text/plain; charset=utf-8", "cache-control": "no-store" },
    });
  }
}

