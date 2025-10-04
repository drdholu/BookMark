"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { useRouter } from "next/navigation";

type PdfReaderProps = {
  fileUrl: string;
  bookId: string;
};

type PDFJSLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: unknown) => { promise: Promise<PDFDocumentProxy> };
  version?: string;
};

type PDFDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
};

type PDFPageProxy = {
  getViewport: (params: { scale: number }) => PDFViewport;
  render: (params: { canvasContext: CanvasRenderingContext2D; viewport: PDFViewport }) => { promise: Promise<void> };
};

type PDFViewport = {
  width: number;
  height: number;
  scale: number;
};

let pdfjsLib: PDFJSLib | null = null;

export default function PdfReader({ fileUrl, bookId }: PdfReaderProps) {
  const router = useRouter();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderingRef = useRef(false);

  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [prefetchedPages, setPrefetchedPages] = useState<Set<number>>(new Set());
  const [readingSpeed, setReadingSpeed] = useState<number>(0);
  const [lastPageTime, setLastPageTime] = useState<number>(0);
  const [readingDirection, setReadingDirection] = useState<'forward' | 'backward' | 'unknown'>('unknown');
  const prefetchCanvasRef = useRef<HTMLCanvasElement[]>([]);

  // Load PDF document with retry mechanism
  useEffect(() => {
    let mounted = true;
    const maxRetries = 3;

    const loadPdf = async (attemptNumber = 1) => {
      try {
        setLoading(true);
        setError(null);

        if (!pdfjsLib) {
          if (typeof window !== 'undefined') {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
            script.type = 'module';
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });
            pdfjsLib = (window as unknown as { pdfjsLib?: PDFJSLib }).pdfjsLib ?? null;
            if (pdfjsLib) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
            }
          }
        }

        if (!pdfjsLib) {
          throw new Error('Failed to load PDF.js library');
        }

        // Try proxy first, fallback to direct URL if proxy fails
        const proxiedUrl = `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}&t=${Date.now()}`;
        console.log('Loading PDF from:', proxiedUrl);
        console.log('Original file URL:', fileUrl);
        
        // Test if proxy is working first
        let useProxy = true;
        try {
          const testResponse = await fetch(proxiedUrl, { method: 'HEAD' });
          if (!testResponse.ok) {
            console.warn('PDF proxy not available, falling back to direct URL');
            useProxy = false;
          }
        } catch (error) {
          console.warn('PDF proxy test failed, falling back to direct URL:', error);
          useProxy = false;
        }
        
        const finalUrl = useProxy ? proxiedUrl : fileUrl;
        console.log('Using URL:', finalUrl);
        
        const loadingTask = pdfjsLib.getDocument({
          url: finalUrl,
          disableRange: true, // Disable range requests to avoid corruption issues
          disableStream: false,
          withCredentials: false,
          // Optimize for reliability over performance
          disableAutoFetch: true, // Disable auto-fetch to prevent corruption
          disableFontFace: false, // Enable font loading
          disableCreateObjectURL: true, // Use streaming instead of blob URLs
          // Memory management
          maxImageSize: 1024 * 1024, // 1MB max image size
          isEvalSupported: false, // Disable eval for security
          // Caching
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/cmaps/',
          cMapPacked: true,
          // Performance
          verbosity: 1, // Increase verbosity for debugging
          // PDF structure handling - be more strict to catch corruption early
          stopAtErrors: true, // Stop on errors to prevent bad data
          maxLength: 0, // No length limit
          // Additional reliability options
          useSystemFonts: false, // Use embedded fonts
          standardFontDataUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/standard_fonts/',
        });
        const pdf = await loadingTask.promise;
        
        if (!mounted) return;
        
        pdfDocRef.current = pdf;
        setNumPages(pdf.numPages);
        setLoading(false);

        // Load saved progress from localStorage
        try {
          const key = `reading_progress:${bookId}`;
          const raw = localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw) as { page?: number };
            const savedPage = parsed.page;
            if (savedPage && savedPage >= 1 && savedPage <= pdf.numPages) {
              setPageNum(savedPage);
            }
          }
        } catch {
          // ignore malformed localStorage entries
        }
      } catch (err) {
        console.error("Error loading PDF (attempt", attemptNumber, "):", err);
        console.error("Error details:", {
          name: err instanceof Error ? err.name : 'Unknown',
          message: err instanceof Error ? err.message : String(err),
          stack: err instanceof Error ? err.stack : undefined,
          fileUrl,
          proxiedUrl: `/api/pdf-proxy?url=${encodeURIComponent(fileUrl)}`,
          attempt: attemptNumber
        });
        
        if (mounted) {
          // Check if this is a retryable error and we haven't exceeded max retries
          const isRetryableError = err instanceof Error && (
            err.message.includes('Bad end offset') ||
            err.message.includes('Invalid PDF structure') ||
            err.message.includes('fetch') ||
            err.message.includes('timeout') ||
            err.message.includes('NetworkError')
          );
          
          if (isRetryableError && attemptNumber < maxRetries) {
            console.log(`Retrying PDF load (attempt ${attemptNumber + 1}/${maxRetries})...`);
            
            // Wait before retrying (exponential backoff)
            const delay = Math.pow(2, attemptNumber) * 1000; // 2s, 4s, 8s
            await new Promise(resolve => setTimeout(resolve, delay));
            
            // Clear any cached data that might be corrupted
            if ('caches' in window) {
              try {
                const cacheNames = await caches.keys();
                for (const cacheName of cacheNames) {
                  if (cacheName.includes('pdf')) {
                    await caches.delete(cacheName);
                  }
                }
              } catch (cacheError) {
                console.warn('Failed to clear cache:', cacheError);
              }
            }
            
            // Retry with a fresh URL (cache busting)
            return loadPdf(attemptNumber + 1);
          }
          
          let errorMessage = "Failed to load PDF document. Please try again.";
          
          if (err instanceof Error) {
            if (err.message.includes('Bad end offset')) {
              errorMessage = "The PDF file appears to be corrupted or incomplete. This may be due to a network issue or server problem. Please try refreshing the page or contact support if the problem persists.";
            } else if (err.message.includes('Invalid PDF structure')) {
              errorMessage = "The PDF file appears to be corrupted, invalid, or the file may not exist. Please check if the file was uploaded correctly.";
            } else if (err.message.includes('fetch')) {
              errorMessage = "Network error while loading PDF. Please check your connection and try again.";
            } else if (err.message.includes('timeout')) {
              errorMessage = "PDF loading timed out. The file might be too large or the server is slow.";
            } else if (err.message.includes('File not found') || err.message.includes('undefined') || err.message.includes('Missing PDF')) {
              errorMessage = "The PDF file could not be found. It may have been deleted, not uploaded properly, or the link is invalid.";
            }
          }
          
          setError(errorMessage);
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
    };
  }, [fileUrl, bookId]);

  // Cleanup prefetch canvases to prevent memory leaks
  useEffect(() => {
    return () => {
      // Clean up prefetch canvases when component unmounts
      prefetchCanvasRef.current.forEach(canvas => {
        if (canvas.parentNode) {
          canvas.parentNode.removeChild(canvas);
        }
      });
      prefetchCanvasRef.current = [];
    };
  }, []);

  // Intelligent prefetching based on reading patterns
  const prefetchAdjacentPages = useCallback(async (currentPage: number) => {
    if (!pdfDocRef.current) return;

    const totalPages = pdfDocRef.current.numPages;
    
    // Adaptive prefetching based on reading speed and direction
    let prefetchCount = 1; // Default to 1 page
    if (readingSpeed > 0) {
      // If user is reading fast, prefetch more pages
      if (readingSpeed > 1) prefetchCount = 3;
      else if (readingSpeed > 0.5) prefetchCount = 2;
    }
    
    // Get current prefetched pages to avoid race conditions
    const currentPrefetched = new Set(prefetchedPages);
    
    // Prefetch based on reading direction
    if (readingDirection === 'forward' || readingDirection === 'unknown') {
      // Prefetch next pages (more important for forward reading)
      for (let i = 1; i <= prefetchCount; i++) {
        const nextPage = currentPage + i;
        if (nextPage <= totalPages && !currentPrefetched.has(nextPage)) {
          try {
            // Actually render the page to cache it properly
            const page = await pdfDocRef.current.getPage(nextPage);
            const viewport = page.getViewport({ scale });
            
            // Create a hidden canvas for prefetching
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'none'; // Hide the canvas
            
            // Store canvas reference for cleanup
            prefetchCanvasRef.current.push(canvas);
            
            // Render the page to cache it
            await page.render({
              canvasContext: context,
              viewport,
            }).promise;
            
            setPrefetchedPages(prev => {
              const newSet = new Set(prev);
              newSet.add(nextPage);
              return newSet;
            });
            currentPrefetched.add(nextPage);
            console.log(`Prefetched page ${nextPage} (forward)`);
          } catch (error) {
            console.warn(`Failed to prefetch page ${nextPage}:`, error);
          }
        }
      }
    }
    
    if (readingDirection === 'backward' || readingDirection === 'unknown') {
      // Prefetch previous pages (for backward reading)
      for (let i = 1; i <= Math.min(prefetchCount, 2); i++) {
        const prevPage = currentPage - i;
        if (prevPage >= 1 && !currentPrefetched.has(prevPage)) {
          try {
            const page = await pdfDocRef.current.getPage(prevPage);
            const viewport = page.getViewport({ scale });
            
            // Create a hidden canvas for prefetching
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            if (!context) continue;
            
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            canvas.style.display = 'none'; // Hide the canvas
            
            // Store canvas reference for cleanup
            prefetchCanvasRef.current.push(canvas);
            
            // Render the page to cache it
            await page.render({
              canvasContext: context,
              viewport,
            }).promise;
            
            setPrefetchedPages(prev => {
              const newSet = new Set(prev);
              newSet.add(prevPage);
              return newSet;
            });
            console.log(`Prefetched page ${prevPage} (backward)`);
          } catch (error) {
            console.warn(`Failed to prefetch page ${prevPage}:`, error);
          }
        }
      }
    }
  }, [readingSpeed, prefetchedPages, scale, readingDirection]);

  // Render current page
  const renderPage = useCallback(async (pageNumber: number) => {
    if (!pdfDocRef.current || !canvasRef.current || renderingRef.current) return;

    try {
      renderingRef.current = true;
      setRendering(true);
      const page = await pdfDocRef.current.getPage(pageNumber);
      const viewport = page.getViewport({ scale });

      const canvas = canvasRef.current;
      const context = canvas.getContext("2d");
      if (!context) {
        renderingRef.current = false;
        setRendering(false);
        return;
      }

      // Set canvas dimensions
      canvas.width = viewport.width;
      canvas.height = viewport.height;

      // Render PDF page
      await page.render({
        canvasContext: context,
        viewport,
      }).promise;

      // Intelligent prefetching based on reading patterns
      try {
        await prefetchAdjacentPages(pageNumber);
      } catch {
        // best-effort prefetch; ignore errors
      }
    } catch (err) {
      console.error("Error rendering page:", err);
      setError("Failed to render page. Please try again.");
    } finally {
      renderingRef.current = false;
      setRendering(false);
    }
  }, [scale, prefetchAdjacentPages]);

  // Calculate reading speed based on page transitions
  const updateReadingSpeed = useCallback((newPage: number) => {
    const now = Date.now();
    
    
    // Determine reading direction
    if (pageNum > 0) {
      if (newPage > pageNum) {
        setReadingDirection('forward');
      } else if (newPage < pageNum) {
        setReadingDirection('backward');
      }
    }
    
    if (lastPageTime > 0) {
      const timeSpent = now - lastPageTime;
      const pagesRead = Math.abs(newPage - pageNum);
      
      if (pagesRead > 0 && timeSpent > 0) {
        // Only count reasonable reading speeds (not too fast or too slow)
        const speed = (pagesRead * 1000) / timeSpent; // pages per second
        if (speed > 0.1 && speed < 5) { // Between 6 seconds and 10 seconds per page
          setReadingSpeed(prev => {
            // Use exponential moving average for smoother updates
            const alpha = 0.3; // Smoothing factor
            return prev === 0 ? speed : (alpha * speed) + ((1 - alpha) * prev);
          });
        }
      }
    }
    setLastPageTime(now);
  }, [pageNum, lastPageTime]);

  // Save reading progress to localStorage (debounced via useEffect below)
  const saveProgress = useCallback((pageNumber: number) => {
    try {
      const key = `reading_progress:${bookId}`;
      localStorage.setItem(key, JSON.stringify({ page: pageNumber }));
    } catch {
      // ignore quota or serialization errors
    }
  }, [bookId]);

  // Render page when pageNum or scale changes
  useEffect(() => {
    if (pdfDocRef.current && pageNum > 0) {
      renderPage(pageNum);
      // Save progress after a short delay to avoid too many writes
      const timeoutId = setTimeout(() => {
        saveProgress(pageNum);
      }, 300);

      return () => clearTimeout(timeoutId);
    }
  }, [pageNum, scale, renderPage, saveProgress, prefetchAdjacentPages]);

  // Navigation handlers
  const goToPreviousPage = useCallback(() => {
    if (pageNum > 1) {
      const newPage = pageNum - 1;
      updateReadingSpeed(newPage);
      setPageNum(newPage);
    }
  }, [pageNum, updateReadingSpeed]);

  const goToNextPage = useCallback(() => {
    if (pageNum < numPages) {
      const newPage = pageNum + 1;
      updateReadingSpeed(newPage);
      setPageNum(newPage);
    }
  }, [pageNum, numPages, updateReadingSpeed]);

  const zoomIn = useCallback(() => {
    setScale((prev) => Math.min(prev + 0.25, 3));
  }, []);

  const zoomOut = useCallback(() => {
    setScale((prev) => Math.max(prev - 0.25, 0.5));
  }, []);

  const toggleFullscreen = useCallback(() => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  }, []);

  const goBackToLibrary = useCallback(() => {
    router.push('/library');
  }, [router]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPreviousPage();
      if (e.key === "ArrowRight") goToNextPage();
      if (e.key === "=" || e.key === "+") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "f") toggleFullscreen();
      if (e.key === "Escape") goBackToLibrary();
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPreviousPage, goToNextPage, zoomIn, zoomOut, toggleFullscreen, goBackToLibrary]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  const clearCacheAndRetry = async () => {
    try {
      // Clear all caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        for (const cacheName of cacheNames) {
          await caches.delete(cacheName);
        }
      }
      
      // Clear service worker cache
      if ('serviceWorker' in navigator) {
        const registration = await navigator.serviceWorker.getRegistration();
        if (registration) {
          await registration.update();
        }
      }
      
      // Reload the page
      window.location.reload();
    } catch (error) {
      console.error('Failed to clear cache:', error);
      window.location.reload();
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Retry
            </button>
            <button
              onClick={clearCacheAndRetry}
              className="px-6 py-2 bg-secondary text-secondary-foreground rounded-lg hover:bg-secondary/90 transition-colors"
            >
              Clear Cache & Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-screen bg-background">
      {/* Top Toolbar */}
      <div className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2">
            <button
              onClick={goBackToLibrary}
              className="p-2 rounded-lg hover:bg-accent transition-colors mr-1"
              title="Back to Library"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={goToPreviousPage}
              disabled={pageNum <= 1}
              className="p-2 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Previous page (←)"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-3">
              <input
                type="number"
                value={pageNum}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= numPages) setPageNum(val);
                }}
                className="w-16 px-2 py-1 text-center bg-background border border-border rounded"
                min={1}
                max={numPages}
              />
              <span className="text-muted-foreground">of {numPages}</span>
            </div>
            <button
              onClick={goToNextPage}
              disabled={pageNum >= numPages}
              className="p-2 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Next page (→)"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-5 h-5" />
            </button>
            <span className="text-sm text-muted-foreground min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-2 rounded-lg hover:bg-accent disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-5 h-5" />
            </button>
            <div className="w-px h-6 bg-border mx-2" />
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-accent transition-colors"
              title="Toggle fullscreen (f)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5" />
              ) : (
                <Maximize2 className="w-5 h-5" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto bg-muted/20">
        <div className="flex justify-center items-start p-8 min-h-full">
          <canvas
            ref={canvasRef}
            className="shadow-2xl bg-white"
            style={{ display: rendering ? "none" : "block" }}
          />
          {rendering && (
            <div className="flex items-center justify-center py-20">
              <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>
      </div>

      {/* Performance Info & Keyboard Shortcuts */}
      <div className="border-t border-border bg-card px-4 py-2">
        <div className="flex justify-between items-center">
          <div className="text-xs text-muted-foreground">
            {prefetchedPages.size > 0 && (
              <span className="mr-4">
                📚 {prefetchedPages.size} pages cached
              </span>
            )}
            {readingSpeed > 0 && (
              <span className="mr-4">
                ⚡ {Math.round(readingSpeed * 60)} pages/min
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            <kbd className="px-1.5 py-0.5 bg-muted rounded">←</kbd> Previous •{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded">→</kbd> Next •{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded">+</kbd> Zoom In •{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded">-</kbd> Zoom Out •{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded">F</kbd> Fullscreen •{" "}
            <kbd className="px-1.5 py-0.5 bg-muted rounded">Esc</kbd> Back
          </p>
        </div>
      </div>
    </div>
  );
}
