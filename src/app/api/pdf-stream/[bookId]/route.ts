import { NextRequest } from "next/server";

interface CacheEntry {
  data: ArrayBuffer;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
}

interface RangeRequest {
  start: number;
  end: number;
  total?: number;
}

class PDFChunkCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize = 50 * 1024 * 1024; // 50MB
  private readonly ttl = 5 * 60 * 1000; // 5 minutes
  private currentSize = 0;

  private key(bookId: string, url: string, range?: RangeRequest): string {
    if (range) return `${bookId}:${url}:${range.start}-${range.end}`;
    return `${bookId}:${url}:full`;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let smallestAccess = Infinity;
    for (const [k, v] of this.cache.entries()) {
      if (v.accessCount < smallestAccess || (v.accessCount === smallestAccess && v.lastAccessed < oldestTime)) {
        oldestKey = k;
        oldestTime = v.lastAccessed;
        smallestAccess = v.accessCount;
      }
    }
    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.currentSize -= entry.size;
      this.cache.delete(oldestKey);
    }
  }

  get(bookId: string, url: string, range?: RangeRequest): ArrayBuffer | null {
    const k = this.key(bookId, url, range);
    const entry = this.cache.get(k);
    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.currentSize -= entry.size;
        this.cache.delete(k);
      }
      return null;
    }
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    return entry.data;
  }

  set(bookId: string, url: string, data: ArrayBuffer, range?: RangeRequest): void {
    const k = this.key(bookId, url, range);
    const size = data.byteLength;
    const existing = this.cache.get(k);
    if (existing) this.currentSize -= existing.size;
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) this.evictLRU();
    this.cache.set(k, {
      data: data.slice(0),
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    });
    this.currentSize += size;
  }
}

const chunkCache = new PDFChunkCache();

function validateSupabasePdfUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== 'https:') return false;
    // Restrict to Supabase storage domains if desired; allow generic https if needed
    // Basic PDF check
    if (!u.pathname.toLowerCase().endsWith('.pdf')) return false;
    return true;
  } catch {
    return false;
  }
}

function parseRange(rangeHeader: string, contentLength: number): RangeRequest | null {
  if (!rangeHeader?.startsWith('bytes=')) return null;
  const raw = rangeHeader.slice(6);
  const parts = raw.split(',');
  if (parts.length !== 1) return null;
  const [startStr, endStr] = parts[0].trim().split('-');
  let start: number;
  let end: number;
  if (startStr === '') {
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix)) return null;
    start = Math.max(0, contentLength - suffix);
    end = contentLength - 1;
  } else if (endStr === '') {
    start = parseInt(startStr, 10);
    if (isNaN(start)) return null;
    end = contentLength - 1;
  } else {
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return null;
  }
  if (start < 0 || end >= contentLength || start > end) return null;
  return { start, end, total: contentLength };
}

export async function GET(req: NextRequest, { params }: { params: { bookId: string } }) {
  const startTime = Date.now();
  const bookId = params.bookId;
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) return new Response('Missing url parameter', { status: 400 });
    if (!validateSupabasePdfUrl(fileUrl)) return new Response('Invalid URL', { status: 400 });

    // Discover content length via HEAD for proper range parsing
    const head = await fetch(fileUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    if (!head.ok) return new Response('Upstream metadata error', { status: 502 });
    const contentLength = parseInt(head.headers.get('content-length') || '0', 10);
    if (!contentLength) return new Response('Invalid content length', { status: 502 });

    const rangeHeader = req.headers.get('range');
    const range = rangeHeader ? parseRange(rangeHeader, contentLength) : null;

    // If no range, allow full file but beware of memory
    const cached = chunkCache.get(bookId, fileUrl, range || undefined);
    if (cached) {
      const headers = new Headers();
      headers.set('Content-Type', 'application/pdf');
      headers.set('Accept-Ranges', 'bytes');
      headers.set('Cache-Control', 'public, max-age=300');
      if (range) {
        headers.set('Content-Range', `bytes ${range.start}-${range.end}/${range.total}`);
        headers.set('Content-Length', String(range.end - range.start + 1));
        return new Response(cached, { status: 206, statusText: 'Partial Content', headers });
      }
      headers.set('Content-Length', String(cached.byteLength));
      return new Response(cached, { status: 200, headers });
    }

    const forwardHeaders = new Headers();
    if (range) forwardHeaders.set('Range', `bytes=${range.start}-${range.end}`);
    const upstream = await fetch(fileUrl, {
      method: 'GET',
      headers: forwardHeaders,
      redirect: 'follow',
      signal: AbortSignal.timeout(30000)
    });
    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { status: upstream.status });
    }

    const buf = await upstream.arrayBuffer();
    if (buf.byteLength === 0) return new Response('Empty response', { status: 502 });

    // Basic PDF header validation only on full responses
    if (!range) {
      const header = new Uint8Array(buf.slice(0, 4));
      const headerStr = String.fromCharCode(...header);
      if (headerStr !== '%PDF') {
        if (buf.byteLength < 1000) {
          const txt = new TextDecoder().decode(buf);
          return new Response(`Invalid PDF: ${txt}`, { status: 422 });
        }
      }
    }

    chunkCache.set(bookId, fileUrl, buf, range || undefined);

    const headers = new Headers();
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('Accept-Ranges', 'bytes');
    headers.set('X-Response-Time', `${Date.now() - startTime}ms`);
    // copy relevant headers
    const copy = new Set(['content-type', 'content-length', 'content-range', 'etag', 'last-modified']);
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (copy.has(lower)) headers.set(lower, value);
    });

    if (range && upstream.status === 206) {
      return new Response(buf, { status: 206, statusText: 'Partial Content', headers });
    }
    return new Response(buf, { status: upstream.status, statusText: upstream.statusText, headers });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') return new Response('Timeout', { status: 504 });
    return new Response('Internal server error', { status: 500 });
  }
}

export async function HEAD(req: NextRequest, { params }: { params: { bookId: string } }) {
  try {
    const { searchParams } = new URL(req.url);
    const fileUrl = searchParams.get('url');
    if (!fileUrl) return new Response(null, { status: 400 });
    if (!validateSupabasePdfUrl(fileUrl)) return new Response(null, { status: 400 });
    const upstream = await fetch(fileUrl, { method: 'HEAD', signal: AbortSignal.timeout(10000) });
    return new Response(null, { status: upstream.ok ? 200 : upstream.status });
  } catch {
    return new Response(null, { status: 500 });
  }
}


