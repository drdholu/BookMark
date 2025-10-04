import { NextRequest } from "next/server";

// In-memory cache with LRU strategy and TTL
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

class PDFCache {
  private cache = new Map<string, CacheEntry>();
  private readonly maxSize = 50 * 1024 * 1024; // 50MB max cache size
  private readonly ttl = 5 * 60 * 1000; // 5 minutes TTL
  private currentSize = 0;

  private generateKey(url: string, range?: RangeRequest): string {
    if (range) {
      // Use the optimized range for cache key to ensure consistency
      return `${url}:${range.start}-${range.end}`;
    }
    return url;
  }

  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > this.ttl;
  }

  private evictLRU(): void {
    let oldestKey = '';
    let oldestTime = Date.now();
    let smallestAccessCount = Infinity;

    // Find least recently used and least accessed entry
    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < smallestAccessCount || 
          (entry.accessCount === smallestAccessCount && entry.lastAccessed < oldestTime)) {
        oldestKey = key;
        oldestTime = entry.lastAccessed;
        smallestAccessCount = entry.accessCount;
      }
    }

    if (oldestKey) {
      const entry = this.cache.get(oldestKey)!;
      this.currentSize -= entry.size;
      this.cache.delete(oldestKey);
    }
  }

  private cleanup(): void {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
    }
  }

  get(url: string, range?: RangeRequest): ArrayBuffer | null {
    this.cleanup();
    const key = this.generateKey(url, range);
    const entry = this.cache.get(key);
    
    if (!entry || this.isExpired(entry)) {
      if (entry) {
        this.currentSize -= entry.size;
        this.cache.delete(key);
      }
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    
    return entry.data;
  }

  set(url: string, data: ArrayBuffer, range?: RangeRequest): void {
    this.cleanup();
    
    const key = this.generateKey(url, range);
    const size = data.byteLength;
    
    // Remove existing entry if it exists
    const existing = this.cache.get(key);
    if (existing) {
      this.currentSize -= existing.size;
    }

    // Evict entries if we exceed max size
    while (this.currentSize + size > this.maxSize && this.cache.size > 0) {
      this.evictLRU();
    }

    // Add new entry
    const entry: CacheEntry = {
      data: data.slice(), // Create a copy to avoid memory leaks
      timestamp: Date.now(),
      accessCount: 1,
      lastAccessed: Date.now(),
      size
    };

    this.cache.set(key, entry);
    this.currentSize += size;
  }

  getStats() {
    return {
      size: this.cache.size,
      memoryUsage: this.currentSize,
      maxSize: this.maxSize
    };
  }
}

// Global cache instance
const pdfCache = new PDFCache();

// Parse range header (RFC 7233)
function parseRangeHeader(rangeHeader: string, contentLength: number): RangeRequest | null {
  if (!rangeHeader.startsWith('bytes=')) {
    return null;
  }

  const ranges = rangeHeader.slice(6).split(',');
  if (ranges.length !== 1) {
    // Multiple ranges not supported for simplicity
    return null;
  }

  const range = ranges[0].trim();
  const [startStr, endStr] = range.split('-');

  let start: number;
  let end: number;

  if (startStr === '') {
    // Suffix range: -500 (last 500 bytes)
    const suffix = parseInt(endStr, 10);
    if (isNaN(suffix)) return null;
    start = Math.max(0, contentLength - suffix);
    end = contentLength - 1;
  } else if (endStr === '') {
    // Prefix range: 500- (from byte 500 to end)
    start = parseInt(startStr, 10);
    if (isNaN(start)) return null;
    end = contentLength - 1;
  } else {
    // Full range: 500-999
    start = parseInt(startStr, 10);
    end = parseInt(endStr, 10);
    if (isNaN(start) || isNaN(end)) return null;
  }

  // Validate range
  if (start < 0 || end >= contentLength || start > end) {
    return null;
  }

  return { start, end, total: contentLength };
}

// Security validation
function validateUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url);
    
    // Only allow HTTPS URLs
    if (parsedUrl.protocol !== 'https:') {
      return false;
    }

    // Block localhost and private IPs
    const hostname = parsedUrl.hostname;
    if (hostname === 'localhost' || 
        hostname.startsWith('127.') || 
        hostname.startsWith('192.168.') ||
        hostname.startsWith('10.') ||
        hostname.startsWith('172.')) {
      return false;
    }

    // Only allow PDF files
    const pathname = parsedUrl.pathname.toLowerCase();
    if (!pathname.endsWith('.pdf')) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

// For PDFs, we should avoid aggressive range optimization to prevent breaking PDF structure
// Instead, we'll use the exact range requested to ensure PDF integrity
function optimizeRange(range: RangeRequest, contentLength: number): RangeRequest {
  // For now, return the exact range to avoid PDF structure issues
  // TODO: Implement safe PDF-aware optimization later
  return {
    start: range.start,
    end: range.end,
    total: contentLength
  };
}

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  let targetUrl: string | null = null;
  let range: RangeRequest | null = null;
  
  try {
    const { searchParams } = new URL(req.url);
    targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return new Response("Missing url parameter", { status: 400 });
    }

    // Security validation
    if (!validateUrl(targetUrl)) {
      return new Response("Invalid or unsafe URL", { status: 400 });
    }

    // Parse range header
    const rangeHeader = req.headers.get("range");
    
    if (rangeHeader) {
      // First, get content length to parse range properly
      const headResponse = await fetch(targetUrl, {
        method: "HEAD",
        signal: AbortSignal.timeout(10000) // 10 second timeout
      });

      if (!headResponse.ok) {
        return new Response("Failed to fetch PDF metadata", { status: 502 });
      }

      const contentLength = parseInt(headResponse.headers.get("content-length") || "0", 10);
      if (contentLength === 0) {
        return new Response("Invalid content length", { status: 502 });
      }

      range = parseRangeHeader(rangeHeader, contentLength);
      if (!range) {
        return new Response("Invalid range request", { status: 416 });
      }

      // Optimize range for better caching
      range = optimizeRange(range, contentLength);
    }

    // Check cache first (but skip cache for range requests to avoid corruption)
    let cachedData: ArrayBuffer | null = null;
    if (!range) {
      cachedData = pdfCache.get(targetUrl, range || undefined);
    }
    
    if (cachedData) {
      const responseHeaders = new Headers();
      responseHeaders.set("Content-Type", "application/pdf");
      responseHeaders.set("Cache-Control", "public, max-age=300"); // 5 minutes
      responseHeaders.set("X-Cache", "HIT");
      responseHeaders.set("X-Cache-Stats", JSON.stringify(pdfCache.getStats()));

      if (range) {
        // For range requests, return the exact cached data
        const actualLength = range.end - range.start + 1;
        
        responseHeaders.set("Content-Range", `bytes ${range.start}-${range.end}/${range.total}`);
        responseHeaders.set("Content-Length", actualLength.toString());
        responseHeaders.set("Accept-Ranges", "bytes");
        
        return new Response(cachedData, {
          status: 206,
          statusText: "Partial Content",
          headers: responseHeaders
        });
      } else {
        responseHeaders.set("Content-Length", cachedData.byteLength.toString());
        return new Response(cachedData, {
          status: 200,
          headers: responseHeaders
        });
      }
    }

    // Prepare request headers
    const forwardHeaders = new Headers();
    if (range) {
      forwardHeaders.set("Range", `bytes=${range.start}-${range.end}`);
    }

    // Forward conditional headers for caching
    const ifNoneMatch = req.headers.get("if-none-match");
    if (ifNoneMatch) forwardHeaders.set("if-none-match", ifNoneMatch);
    
    const ifModifiedSince = req.headers.get("if-modified-since");
    if (ifModifiedSince) forwardHeaders.set("if-modified-since", ifModifiedSince);

    // Fetch from upstream with timeout
    const upstream = await fetch(targetUrl, {
      method: "GET",
      headers: forwardHeaders,
      redirect: "follow",
      signal: AbortSignal.timeout(30000) // 30 second timeout
    });

    if (!upstream.ok) {
      return new Response(`Upstream error: ${upstream.status}`, { 
        status: upstream.status 
      });
    }

    // Get response data
    const responseData = await upstream.arrayBuffer();

    // Validate response data for PDFs
    if (responseData.byteLength === 0) {
      return new Response("Empty response from upstream", { status: 502 });
    }

    // Check for common error responses
    if (responseData.byteLength < 100) { // Suspiciously small response
      const responseText = new TextDecoder().decode(responseData);
      if (responseText === 'undefined' || responseText.includes('error') || responseText.includes('not found')) {
        console.error('Upstream returned error response:', responseText);
        return new Response(`File not found or error: ${responseText}`, { status: 404 });
      }
    }

    // Basic PDF validation - check for PDF header
    if (!range) { // Only validate full files, not ranges
      const pdfHeader = new Uint8Array(responseData.slice(0, 4));
      const headerString = String.fromCharCode(...pdfHeader);
      if (headerString !== '%PDF') {
        console.warn('Response does not appear to be a valid PDF:', headerString);
        // If it's a small response, it might be an error message
        if (responseData.byteLength < 1000) {
          const responseText = new TextDecoder().decode(responseData);
          return new Response(`Invalid PDF file: ${responseText}`, { status: 422 });
        }
      }
    }

    // Cache the response
    pdfCache.set(targetUrl, responseData, range || undefined);

    // Prepare response headers
    const resHeaders = new Headers();
    const hopByHop = new Set([
      "connection", "keep-alive", "proxy-authenticate", "proxy-authorization",
      "te", "trailer", "transfer-encoding", "upgrade"
    ]);

    // Copy relevant headers from upstream
    upstream.headers.forEach((value, key) => {
      const lower = key.toLowerCase();
      if (hopByHop.has(lower)) return;
      
      if ([
        "content-type", "content-length", "accept-ranges", "content-range",
        "etag", "last-modified", "cache-control"
      ].includes(lower)) {
        resHeaders.set(lower, value);
      }
    });

    // Add cache headers
    resHeaders.set("Cache-Control", "public, max-age=300"); // 5 minutes
    resHeaders.set("X-Cache", "MISS");
    resHeaders.set("X-Cache-Stats", JSON.stringify(pdfCache.getStats()));
    resHeaders.set("X-Response-Time", `${Date.now() - startTime}ms`);

    // Handle range response
    if (range && upstream.status === 206) {
      return new Response(responseData, {
        status: 206,
        statusText: "Partial Content",
        headers: resHeaders
      });
    }

    return new Response(responseData, {
      status: upstream.status,
      statusText: upstream.statusText,
      headers: resHeaders
    });

  } catch (error) {
    console.error("PDF Proxy Error:", error);
    console.error("Request URL:", targetUrl);
    console.error("Range:", range);
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        return new Response("Request timeout", { status: 504 });
      }
      if (error.message.includes('fetch')) {
        return new Response("Network error", { status: 502 });
      }
      if (error.message.includes('Invalid PDF')) {
        return new Response("Invalid PDF structure", { status: 422 });
      }
    }
    
    return new Response("Internal server error", { status: 500 });
  }
}

// Health check endpoint
export async function HEAD(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const targetUrl = searchParams.get("url");

    if (!targetUrl) {
      return new Response(null, { status: 400 });
    }

    // Security validation
    if (!validateUrl(targetUrl)) {
      return new Response(null, { status: 400 });
    }

    // Check if the file exists by making a HEAD request to the upstream
    const upstream = await fetch(targetUrl, {
      method: "HEAD",
      signal: AbortSignal.timeout(10000) // 10 second timeout
    });

    if (!upstream.ok) {
      return new Response(null, { status: upstream.status });
    }

    // Return success with cache stats
    return new Response(null, {
      status: 200,
      headers: {
        "X-Cache-Stats": JSON.stringify(pdfCache.getStats()),
        "X-Service": "PDF-Proxy",
        "Content-Type": "application/pdf"
      }
    });

  } catch (error) {
    console.error("PDF Proxy HEAD Error:", error);
    return new Response(null, { status: 500 });
  }
}