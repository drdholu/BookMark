import { NextRequest } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const targetUrl = searchParams.get("url");
  if (!targetUrl) {
    return new Response("Missing url", { status: 400 });
  }

  // Forward range and conditional headers to enable streaming
  const forwardHeaders = new Headers();
  const range = req.headers.get("range");
  if (range) forwardHeaders.set("range", range);
  const ifNoneMatch = req.headers.get("if-none-match");
  if (ifNoneMatch) forwardHeaders.set("if-none-match", ifNoneMatch);
  const ifModifiedSince = req.headers.get("if-modified-since");
  if (ifModifiedSince) forwardHeaders.set("if-modified-since", ifModifiedSince);

  const upstream = await fetch(targetUrl, {
    method: "GET",
    headers: forwardHeaders,
    redirect: "follow",
    // credentials are not required for public buckets
  });

  // Pass through relevant headers for range support and caching
  const resHeaders = new Headers();
  const hopByHop = new Set([
    "connection",
    "keep-alive",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
    "transfer-encoding",
    "upgrade",
  ]);

  upstream.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (hopByHop.has(lower)) return;
    // Only include safe headers likely needed by the browser/PDF.js
    if ([
      "content-type",
      "content-length",
      "accept-ranges",
      "content-range",
      "etag",
      "last-modified",
      "cache-control",
    ].includes(lower)) {
      resHeaders.set(lower, value);
    }
  });

  // Encourage caching if the upstream provides validators
  if (!resHeaders.has("cache-control")) {
    resHeaders.set("cache-control", "public, max-age=3600");
  }

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: resHeaders,
  });
}


