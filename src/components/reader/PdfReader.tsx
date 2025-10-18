"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";

type PdfReaderProps = {
  fileUrl: string;
  bookId: string;
};

type PDFJSLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: unknown) => PDFLoadingTask;
  version?: string;
};

type PDFDocumentProxy = {
  numPages: number;
  getPage: (pageNumber: number) => Promise<PDFPageProxy>;
};

type PDFLoadingTask = {
  promise: Promise<PDFDocumentProxy>;
  onProgress?: (progressData: { loaded: number; total: number }) => void;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const pdfDocRef = useRef<PDFDocumentProxy | null>(null);
  const renderingRef = useRef(false);

  const [pageNum, setPageNum] = useState(1);
  const [numPages, setNumPages] = useState<number>(0);
  const [scale, setScale] = useState(1.25);
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [rendering, setRendering] = useState(false);
  const [prefetchedPages, setPrefetchedPages] = useState<Set<number>>(new Set());
  const [readingSpeed, setReadingSpeed] = useState<number>(0);
  const [lastPageTime, setLastPageTime] = useState<number>(0);

  // Load PDF document
  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
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

        // Use range-aware Supabase streaming endpoint
        const streamUrl = `/api/pdf-stream/${bookId}?url=${encodeURIComponent(fileUrl)}`;
        const loadingTask = pdfjsLib.getDocument({
          url: streamUrl,
          disableRange: false,
          disableStream: false,
          withCredentials: false,
          // Optimize for streaming performance
          disableAutoFetch: true, // Critical for linearized PDFs
          disableFontFace: false, // Enable font loading
          disableCreateObjectURL: true, // Use streaming instead of blob URLs
          // Memory management
          maxImageSize: 1024 * 1024, // 1MB max image size
          isEvalSupported: false, // Disable eval for security
          // Caching
          cMapUrl: 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/cmaps/',
          cMapPacked: true,
          // Performance
          verbosity: 0, // Reduce console output
        });
        // Progressive loading indicator
        try {
          if (typeof loadingTask.onProgress === 'function') {
            loadingTask.onProgress = ({ loaded, total }: { loaded: number; total: number }) => {
              if (total > 0) setProgress(Math.min(100, Math.round((loaded / total) * 100)));
            };
          }
        } catch {
          // ignore if pdf.js shape changes
        }
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
        console.error("Error loading PDF:", err);
        if (mounted) {
          setError("Failed to load PDF document. Please try again.");
          setLoading(false);
        }
      }
    };

    loadPdf();

    return () => {
      mounted = false;
    };
  }, [fileUrl, bookId]);

  // Intelligent prefetching based on reading patterns
  const prefetchAdjacentPages = useCallback(async (currentPage: number) => {
    if (!pdfDocRef.current) return;

    const totalPages = pdfDocRef.current.numPages;
    const prefetchCount = Math.min(3, Math.ceil(readingSpeed * 2)); // Adaptive prefetch count
    
    // Prefetch next pages (more important for forward reading)
    for (let i = 1; i <= prefetchCount; i++) {
      const nextPage = currentPage + i;
      if (nextPage <= totalPages && !prefetchedPages.has(nextPage)) {
        try {
          await pdfDocRef.current.getPage(nextPage);
          setPrefetchedPages(prev => new Set([...prev, nextPage]));
          console.log(`Prefetched page ${nextPage}`);
        } catch (error) {
          console.warn(`Failed to prefetch page ${nextPage}:`, error);
        }
      }
    }

    // Prefetch previous page (less aggressive)
    const prevPage = currentPage - 1;
    if (prevPage >= 1 && !prefetchedPages.has(prevPage)) {
      try {
        await pdfDocRef.current.getPage(prevPage);
        setPrefetchedPages(prev => new Set([...prev, prevPage]));
        console.log(`Prefetched page ${prevPage}`);
      } catch (error) {
        console.warn(`Failed to prefetch page ${prevPage}:`, error);
      }
    }
  }, [readingSpeed, prefetchedPages]);

  // Fit-to-width on first render for mobile widths
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const applyFit = () => {
      const width = el.clientWidth;
      // Heuristic: for narrow screens, reduce scale a bit; for wider, keep default
      if (width && width < 450) {
        setScale(1);
      } else if (width && width < 600) {
        setScale(1.1);
      }
    };
    applyFit();
    window.addEventListener("resize", applyFit, { passive: true } as EventListenerOptions);
    return () => window.removeEventListener("resize", applyFit as unknown as EventListener);
  }, []);

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
    if (lastPageTime > 0) {
      const timeSpent = now - lastPageTime;
      const pagesRead = Math.abs(newPage - pageNum);
      
      if (pagesRead > 0 && timeSpent > 0) {
        const speed = (pagesRead * 1000) / timeSpent; // pages per second
        setReadingSpeed(prev => (prev + speed) / 2); // Moving average
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
  }, [pageNum, scale, renderPage, saveProgress]);

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

  // Keyboard navigation
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") goToPreviousPage();
      if (e.key === "ArrowRight") goToNextPage();
      if (e.key === "=" || e.key === "+") zoomIn();
      if (e.key === "-") zoomOut();
      if (e.key === "f") toggleFullscreen();
    };

    window.addEventListener("keydown", handleKeyPress);
    return () => window.removeEventListener("keydown", handleKeyPress);
  }, [goToPreviousPage, goToNextPage, zoomIn, zoomOut, toggleFullscreen]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-6 animate-fade-in">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-primary/20 rounded-full blur-xl"></div>
            <div className="relative w-16 h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
          </div>
          <div className="space-y-2">
            <p className="text-lg font-medium">Loading PDF</p>
            {progress > 0 && (
              <p className="text-sm text-muted-foreground">{progress}%</p>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-6 max-w-md px-6 animate-scale-in">
          <div className="relative inline-flex">
            <div className="absolute inset-0 bg-destructive/10 rounded-full blur-xl"></div>
            <div className="relative bg-destructive/10 p-6 rounded-2xl border border-destructive/20">
              <div className="text-5xl">⚠️</div>
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Error Loading PDF</h2>
            <p className="text-muted-foreground">{error}</p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-8 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 smooth-transition shadow-lg hover:shadow-xl font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex flex-col h-[100dvh] bg-background">
      {/* Top Toolbar */}
      <div className="border-b border-border bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 shadow-sm">
        <div className="flex items-center justify-between px-3 sm:px-4 py-3 sm:py-4 gap-3 flex-wrap">
          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <a
              href="/library"
              className="p-2 rounded-lg hover:bg-primary/10 smooth-transition mr-1 group"
              title="Back to Library"
            >
              <ChevronLeft className="w-5 h-5 group-hover:text-primary smooth-transition" />
            </a>
            <div className="w-px h-6 bg-border mx-1 hidden sm:block" />
            <button
              onClick={goToPreviousPage}
              disabled={pageNum <= 1}
              className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition group"
              title="Previous page (←)"
            >
              <ChevronLeft className="w-5 h-5 group-hover:text-primary smooth-transition" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1 bg-muted/50 rounded-lg border border-border">
              <input
                type="number"
                value={pageNum}
                onChange={(e) => {
                  const val = parseInt(e.target.value);
                  if (val >= 1 && val <= numPages) setPageNum(val);
                }}
                className="w-12 sm:w-14 px-1 py-0.5 text-center bg-transparent border-0 focus:outline-none focus:ring-0 font-medium"
                min={1}
                max={numPages}
              />
              <span className="text-sm text-muted-foreground font-medium">/ {numPages}</span>
            </div>
            <button
              onClick={goToNextPage}
              disabled={pageNum >= numPages}
              className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition group"
              title="Next page (→)"
            >
              <ChevronRight className="w-5 h-5 group-hover:text-primary smooth-transition" />
            </button>
          </div>

          <div className="flex items-center gap-1 sm:gap-2 flex-wrap">
            <button
              onClick={zoomOut}
              disabled={scale <= 0.5}
              className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition group"
              title="Zoom out (-)"
            >
              <ZoomOut className="w-5 h-5 group-hover:text-primary smooth-transition" />
            </button>
            <span className="text-sm font-medium bg-muted/50 px-3 py-1 rounded-lg border border-border min-w-[4rem] text-center">
              {Math.round(scale * 100)}%
            </span>
            <button
              onClick={zoomIn}
              disabled={scale >= 3}
              className="p-2 rounded-lg hover:bg-primary/10 disabled:opacity-40 disabled:cursor-not-allowed smooth-transition group"
              title="Zoom in (+)"
            >
              <ZoomIn className="w-5 h-5 group-hover:text-primary smooth-transition" />
            </button>
            <div className="w-px h-6 bg-border mx-2 hidden sm:block" />
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-primary/10 smooth-transition group"
              title="Toggle fullscreen (f)"
            >
              {isFullscreen ? (
                <Minimize2 className="w-5 h-5 group-hover:text-primary smooth-transition" />
              ) : (
                <Maximize2 className="w-5 h-5 group-hover:text-primary smooth-transition" />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Canvas Container */}
      <div className="flex-1 overflow-auto bg-gradient-to-br from-muted/20 to-muted/5">
        <div className="flex justify-center items-start p-4 sm:p-8 min-h-full">
          <canvas
            ref={canvasRef}
            className="shadow-2xl bg-white rounded-sm"
            style={{ display: rendering ? "none" : "block" }}
          />
          {rendering && (
            <div className="flex items-center justify-center py-20">
              <div className="relative inline-flex">
                <div className="absolute inset-0 bg-primary/20 rounded-full blur-lg"></div>
                <div className="relative w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Performance Info & Keyboard Shortcuts */}
      <div className="border-t border-border bg-card/80 backdrop-blur-lg supports-[backdrop-filter]:bg-card/80 px-4 py-3">
        <div className="flex justify-between items-center gap-4 flex-wrap">
          <div className="flex items-center gap-4 text-xs font-medium">
            {prefetchedPages.size > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-primary/10 text-primary rounded-md">
                <span>📚</span>
                <span>{prefetchedPages.size} cached</span>
              </span>
            )}
            {readingSpeed > 0 && (
              <span className="flex items-center gap-1.5 px-2 py-1 bg-accent/10 text-accent rounded-md">
                <span>⚡</span>
                <span>{Math.round(readingSpeed * 60)} pages/min</span>
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground hidden lg:flex items-center gap-2">
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-medium">←</kbd> Prev •{" "}
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-medium">→</kbd> Next •{" "}
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-medium">+</kbd> Zoom •{" "}
            <kbd className="px-2 py-1 bg-muted rounded border border-border font-medium">F</kbd> Fullscreen
          </p>
        </div>
      </div>
    </div>
  );
}
