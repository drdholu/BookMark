"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2, Minimize2 } from "lucide-react";
import { getSignedUrl } from "@/lib/storage";

type PdfReaderProps = {
  fileUrl: string;
  bookId: string;
};

type PDFJSLib = {
  GlobalWorkerOptions: { workerSrc: string };
  getDocument: (src: string | ArrayBuffer) => { promise: Promise<PDFDocumentProxy> };
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

  // Load PDF document
  useEffect(() => {
    let mounted = true;

    const loadPdf = async () => {
      try {
        setLoading(true);
        setError(null);

        // Initialize PDF.js only once
        if (!pdfjsLib) {
          if (typeof window !== 'undefined') {
            // Use CDN version to avoid webpack issues
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.min.mjs';
            script.type = 'module';
            
            await new Promise((resolve, reject) => {
              script.onload = resolve;
              script.onerror = reject;
              document.head.appendChild(script);
            });

            // Access the global pdfjsLib
            pdfjsLib = window.pdfjsLib as PDFJSLib;
            
            if (pdfjsLib) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.0.379/pdf.worker.min.mjs';
            }
          }
        }

        if (!pdfjsLib) {
          throw new Error('Failed to load PDF.js library');
        }

        // Try to fetch PDF data, with fallback to signed URL
        let pdfData: ArrayBuffer;
        let actualUrl = fileUrl;
        
        try {
          const response = await fetch(fileUrl);
          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          pdfData = await response.arrayBuffer();
        } catch (fetchError) {
          console.error('Error fetching PDF with public URL:', fetchError);
          
          // Try with signed URL as fallback
          try {
            // Extract path from the public URL
            const urlParts = fileUrl.split('/storage/v1/object/public/');
            if (urlParts.length === 2) {
              const pathParts = urlParts[1].split('/');
              const bucket = pathParts[0];
              const path = pathParts.slice(1).join('/');
              
              actualUrl = await getSignedUrl(bucket, path, 3600); // 1 hour expiry
              console.log('Using signed URL:', actualUrl);
              
              const response = await fetch(actualUrl);
              if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
              }
              pdfData = await response.arrayBuffer();
            } else {
              throw new Error('Invalid file URL format');
            }
          } catch (signedUrlError) {
            console.error('Error fetching PDF with signed URL:', signedUrlError);
            throw new Error('Failed to load PDF document. Please check if the file exists and is accessible.');
          }
        }

        const loadingTask = pdfjsLib.getDocument(pdfData);
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
    } catch (err) {
      console.error("Error rendering page:", err);
      setError("Failed to render page. Please try again.");
    } finally {
      renderingRef.current = false;
      setRendering(false);
    }
  }, [scale]);

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
      setPageNum((prev) => prev - 1);
    }
  }, [pageNum]);

  const goToNextPage = useCallback(() => {
    if (pageNum < numPages) {
      setPageNum((prev) => prev + 1);
    }
  }, [pageNum, numPages]);

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
        <div className="text-center space-y-4">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading PDF...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="text-center space-y-4 max-w-md px-6">
          <div className="text-6xl">⚠️</div>
          <h2 className="text-2xl font-bold text-foreground">Error</h2>
          <p className="text-muted-foreground">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
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

      {/* Keyboard Shortcuts Help */}
      <div className="border-t border-border bg-card px-4 py-2">
        <p className="text-xs text-muted-foreground text-center">
          Keyboard: <kbd className="px-1.5 py-0.5 bg-muted rounded">←</kbd> Previous •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded">→</kbd> Next •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded">+</kbd> Zoom In •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded">-</kbd> Zoom Out •{" "}
          <kbd className="px-1.5 py-0.5 bg-muted rounded">F</kbd> Fullscreen
        </p>
      </div>
    </div>
  );
}
