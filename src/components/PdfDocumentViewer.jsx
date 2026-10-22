import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  ExternalLink,
  Download,
  AlertCircle,
  Loader2,
  FileText,
  Layers,
  ScrollText,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// ---------------------------------------------------------------------------
// 1. Critical Polyfill: Promise.withResolvers
// Required by PDF.js v5+ for older mobile Android/iOS WebViews
// ---------------------------------------------------------------------------
if (typeof Promise.withResolvers === 'undefined') {
  Promise.withResolvers = function () {
    let resolve, reject;
    const promise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    return { promise, resolve, reject };
  };
}

// ---------------------------------------------------------------------------
// 2. Configure PDF.js Worker
// Uses local worker in public/ folder with CDN fallback
// ---------------------------------------------------------------------------
try {
  pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs';
} catch (e) {
  console.warn('PDF.js worker initialization notice:', e);
}

/**
 * Converts a base64 string or data:application/pdf URI into a Uint8Array
 */
function base64ToUint8Array(base64) {
  const rawData = base64.includes(',') ? base64.split(',')[1] : base64;
  const binaryString = atob(rawData);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

export default function PdfDocumentViewer({
  url,
  title = 'Study Note PDF',
  onDownload,
  className = '',
  initialPage = 1,
  onPageCountChange,
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const viewportRef = useRef(null);
  const renderTaskRef = useRef(null);

  const [pdfDoc, setPdfDoc] = useState(null);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [numPages, setNumPages] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Viewer modes: 'single' (page by page) or 'scroll' (all pages stacked)
  const [layoutMode, setLayoutMode] = useState('single');
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isPinching, setIsPinching] = useState(false);
  const touchStartDistRef = useRef(null);
  const touchStartScaleRef = useRef(1.0);

  // Fallback to Google Docs viewer if PDF.js fails completely
  const [useGoogleDocsFallback, setUseGoogleDocsFallback] = useState(false);

  // -------------------------------------------------------------------------
  // Step 1: Load PDF Document into Memory
  // -------------------------------------------------------------------------
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);
    setPdfDoc(null);
    setUseGoogleDocsFallback(false);

    if (!url) {
      setLoading(false);
      setError('No PDF document URL provided.');
      return;
    }

    async function loadDocument() {
      try {
        let loadingTask;

        if (typeof url === 'string' && url.startsWith('data:')) {
          const uint8Data = base64ToUint8Array(url);
          loadingTask = pdfjsLib.getDocument({ data: uint8Data });
        } else {
          loadingTask = pdfjsLib.getDocument({
            url,
            withCredentials: false,
            cMapUrl: 'https://cdn.jsdelivr.net/npm/pdfjs-dist@5.4.296/cmaps/',
            cMapPacked: true,
          });
        }

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage((prev) => Math.min(Math.max(1, prev), doc.numPages));
        if (onPageCountChange) onPageCountChange(doc.numPages);
        setLoading(false);
      } catch (err) {
        console.warn('PDF.js loading failed, preparing fallback:', err);
        if (isCancelled) return;

        // If it was a network or CORS issue on a public URL, suggest Google Docs Viewer
        if (typeof url === 'string' && (url.startsWith('http://') || url.startsWith('https://'))) {
          setUseGoogleDocsFallback(true);
        }

        setError(err.message || 'Unable to parse PDF document.');
        setLoading(false);
      }
    }

    loadDocument();

    return () => {
      isCancelled = true;
      if (renderTaskRef.current) {
        try {
          renderTaskRef.current.cancel();
        } catch {
          // ignore cancellation
        }
      }
    };
  }, [url]);

  // -------------------------------------------------------------------------
  // Step 2: Render Single Page to Canvas with Retina High-DPI Support
  // -------------------------------------------------------------------------
  const renderCurrentPage = useCallback(async () => {
    if (!pdfDoc || !canvasRef.current || layoutMode !== 'single') return;

    if (renderTaskRef.current) {
      try {
        renderTaskRef.current.cancel();
      } catch {
        // ignore
      }
    }

    try {
      const page = await pdfDoc.getPage(currentPage);
      const containerWidth = containerRef.current?.clientWidth || 360;

      // Fit page to container width nicely, then apply user zoom
      const unscaledViewport = page.getViewport({ scale: 1.0 });
      const targetWidth = Math.max(280, containerWidth - 24);
      const baseScale = targetWidth / unscaledViewport.width;
      const finalScale = baseScale * zoomScale;

      const viewport = page.getViewport({ scale: finalScale });
      const canvas = canvasRef.current;
      if (!canvas) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2.5); // Cap to 2.5 to save phone memory
      canvas.width = Math.floor(viewport.width * pixelRatio);
      canvas.height = Math.floor(viewport.height * pixelRatio);
      canvas.style.width = `${Math.floor(viewport.width)}px`;
      canvas.style.height = `${Math.floor(viewport.height)}px`;

      const ctx = canvas.getContext('2d');
      ctx.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

      const renderContext = {
        canvasContext: ctx,
        viewport,
      };

      const renderTask = page.render(renderContext);
      renderTaskRef.current = renderTask;
      await renderTask.promise;
    } catch (err) {
      if (err?.name !== 'RenderingCancelledException') {
        console.warn('Canvas render notice:', err);
      }
    }
  }, [pdfDoc, currentPage, zoomScale, layoutMode]);

  useEffect(() => {
    renderCurrentPage();
  }, [renderCurrentPage]);

  // Handle Window Resize to readjust fit-to-width on mobile rotation
  useEffect(() => {
    const handleResize = () => {
      renderCurrentPage();
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [renderCurrentPage]);

  // -------------------------------------------------------------------------
  // Touch Gestures: Pinch to Zoom on Mobile Phones
  // -------------------------------------------------------------------------
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      touchStartDistRef.current = dist;
      touchStartScaleRef.current = zoomScale;
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e) => {
    if (isPinching && e.touches.length === 2 && touchStartDistRef.current) {
      const dist = Math.hypot(
        e.touches[0].clientX - e.touches[1].clientX,
        e.touches[0].clientY - e.touches[1].clientY
      );
      const ratio = dist / touchStartDistRef.current;
      const nextZoom = Math.min(Math.max(0.7, touchStartScaleRef.current * ratio), 3.0);
      setZoomScale(Number(nextZoom.toFixed(2)));
    }
  };

  const handleTouchEnd = () => {
    setIsPinching(false);
    touchStartDistRef.current = null;
  };

  // Zoom Button Handlers
  const handleZoomIn = useCallback(() => setZoomScale((prev) => Math.min(3.0, Number((prev + 0.25).toFixed(2)))), []);
  const handleZoomOut = useCallback(() => setZoomScale((prev) => Math.max(0.6, Number((prev - 0.25).toFixed(2)))), []);
  const handleResetZoom = useCallback(() => setZoomScale(1.0), []);

  // Page Navigation Handlers
  const handlePrevPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev > 1) {
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
        return prev - 1;
      }
      return prev;
    });
  }, []);

  const handleNextPage = useCallback(() => {
    setCurrentPage((prev) => {
      if (prev < numPages) {
        if (viewportRef.current) viewportRef.current.scrollTop = 0;
        return prev + 1;
      }
      return prev;
    });
  }, [numPages]);

  const handleFirstPage = useCallback(() => {
    setCurrentPage(1);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, []);

  const handleLastPage = useCallback(() => {
    setCurrentPage(numPages);
    if (viewportRef.current) viewportRef.current.scrollTop = 0;
  }, [numPages]);

  // -------------------------------------------------------------------------
  // Keyboard Navigation: Left, Right, Up, Down, PageUp, PageDown, Home, End
  // -------------------------------------------------------------------------
  const handleKeyDown = useCallback(
    (e) => {
      // Ignore if user is interacting with an input, textarea, or select element
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target?.tagName)) return;

      const viewport = viewportRef.current;

      // 1. Arrow Right: Next Page
      if (e.key === 'ArrowRight') {
        e.preventDefault();
        setCurrentPage((prev) => {
          if (prev < numPages) {
            if (viewport) viewport.scrollTop = 0;
            return prev + 1;
          }
          return prev;
        });
      }

      // 2. Arrow Left: Previous Page
      else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        setCurrentPage((prev) => {
          if (prev > 1) {
            if (viewport) viewport.scrollTop = 0;
            return prev - 1;
          }
          return prev;
        });
      }

      // 3. Arrow Down: Scroll Down or Advance to Next Page when at bottom
      else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (viewport) {
          const maxScrollTop = viewport.scrollHeight - viewport.clientHeight;
          // If already at or near bottom (within 20px) and there's a next page, advance page
          if (maxScrollTop > 0 && viewport.scrollTop >= maxScrollTop - 20) {
            setCurrentPage((prev) => {
              if (prev < numPages) {
                viewport.scrollTop = 0;
                return prev + 1;
              }
              return prev;
            });
          } else {
            // Otherwise scroll down smoothly
            viewport.scrollBy({ top: 160, behavior: 'smooth' });
          }
        } else {
          setCurrentPage((prev) => Math.min(numPages, prev + 1));
        }
      }

      // 4. Arrow Up: Scroll Up or Go to Previous Page when at top
      else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (viewport) {
          // If already at the top (within 10px) and there's a previous page, go to previous page
          if (viewport.scrollTop <= 10) {
            setCurrentPage((prev) => {
              if (prev > 1) {
                setTimeout(() => {
                  if (viewportRef.current) {
                    viewportRef.current.scrollTop = viewportRef.current.scrollHeight;
                  }
                }, 80);
                return prev - 1;
              }
              return prev;
            });
          } else {
            // Otherwise scroll up smoothly
            viewport.scrollBy({ top: -160, behavior: 'smooth' });
          }
        } else {
          setCurrentPage((prev) => Math.max(1, prev - 1));
        }
      }

      // 5. PageDown / PageUp
      else if (e.key === 'PageDown') {
        e.preventDefault();
        setCurrentPage((prev) => {
          if (prev < numPages) {
            if (viewport) viewport.scrollTop = 0;
            return prev + 1;
          }
          return prev;
        });
      } else if (e.key === 'PageUp') {
        e.preventDefault();
        setCurrentPage((prev) => {
          if (prev > 1) {
            if (viewport) viewport.scrollTop = 0;
            return prev - 1;
          }
          return prev;
        });
      }

      // 6. Home / End
      else if (e.key === 'Home') {
        e.preventDefault();
        setCurrentPage(1);
        if (viewport) viewport.scrollTop = 0;
      } else if (e.key === 'End') {
        e.preventDefault();
        setCurrentPage(numPages);
        if (viewport) viewport.scrollTop = 0;
      }

      // 7. Zoom shortcuts (+, -, 0)
      else if (e.key === '+' || e.key === '=') {
        e.preventDefault();
        handleZoomIn();
      } else if (e.key === '-' || e.key === '_') {
        e.preventDefault();
        handleZoomOut();
      } else if (e.key === '0') {
        e.preventDefault();
        handleResetZoom();
      }
    },
    [numPages, handleZoomIn, handleZoomOut, handleResetZoom]
  );

  // Attach global keyboard listener when PDF document is active
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // -------------------------------------------------------------------------
  // Render: Loading Spinner
  // -------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] p-8 text-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-gray-800">
        <Loader2 className="w-10 h-10 text-indigo-600 dark:text-indigo-400 animate-spin mb-3" />
        <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">
          Rendering PDF for Mobile & Desktop...
        </h4>
        <p className="text-xs text-slate-500 dark:text-gray-400 max-w-xs">
          Loading document pages into high-definition mobile canvas reader.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Error / Fallback State
  // -------------------------------------------------------------------------
  if (error && !pdfDoc) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[380px] p-6 text-center bg-white/95 dark:bg-gray-900/95 rounded-2xl border border-slate-200 dark:border-gray-800 space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800 flex items-center justify-center text-amber-600 dark:text-amber-400">
          <FileText className="w-6 h-6" />
        </div>

        <div>
          <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
            Unable to inline render PDF on this device
          </h4>
          <p className="text-xs text-slate-500 dark:text-gray-400 max-w-sm mx-auto">
            Your browser security settings or network prevented direct canvas parsing. You can view it instantly using the options below:
          </p>
        </div>

        {/* Action Buttons: Open In New Tab & Download */}
        <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-all shadow-md shadow-indigo-500/25 flex items-center gap-1.5 cursor-pointer"
            >
              <span>Open in New Tab</span>
              <ExternalLink className="w-4 h-4" />
            </a>
          )}

          {onDownload && (
            <button
              type="button"
              onClick={onDownload}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 font-semibold text-xs border border-slate-200 dark:border-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download PDF</span>
            </button>
          )}

          {/* Toggle Google Docs viewer if remote HTTP URL */}
          {typeof url === 'string' && url.startsWith('http') && (
            <button
              type="button"
              onClick={() => {
                setError(null);
                setUseGoogleDocsFallback(true);
              }}
              className="min-h-[44px] px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 font-semibold text-xs border border-slate-200 dark:border-gray-700 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <span>Use Google Viewer</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Google Docs Fallback Iframe (for remote URLs when PDF.js fails)
  // -------------------------------------------------------------------------
  if (useGoogleDocsFallback && typeof url === 'string' && url.startsWith('http')) {
    const googleViewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    return (
      <div className="w-full flex-1 flex flex-col space-y-3">
        <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 pb-2 border-b border-slate-200 dark:border-gray-800">
          <span className="font-semibold text-slate-700 dark:text-gray-200">Google Docs Cloud Viewer</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-600 dark:text-indigo-400 font-semibold flex items-center gap-1"
          >
            Open Original <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
        <div className="w-full h-[65vh] min-h-[480px] rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 bg-slate-950">
          <iframe
            src={googleViewerUrl}
            title={title}
            className="w-full h-full border-0"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------------------
  // Render: Primary Universal Canvas Viewer (Mobile + Desktop)
  // -------------------------------------------------------------------------
  return (
    <div
      ref={containerRef}
      className={`w-full flex-1 flex flex-col space-y-3 select-none ${className}`}
    >
      {/* Top Mobile-Optimized Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 sm:p-2.5 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border border-slate-200/90 dark:border-gray-800/80 shadow-2xs text-xs">
        {/* Left: Page Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleFirstPage}
            disabled={currentPage <= 1}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="First Page"
            aria-label="First Page"
          >
            <ChevronsLeft className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Previous Page"
            aria-label="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {/* Interactive Jump-To-Page Dropdown */}
          <div className="flex items-center px-1">
            <select
              value={currentPage}
              onChange={(e) => setCurrentPage(Number(e.target.value))}
              className="min-h-[36px] px-2.5 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 font-mono font-bold text-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
              aria-label="Select page"
            >
              {Array.from({ length: numPages }, (_, i) => i + 1).map((p) => (
                <option key={p} value={p} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                  Page {p} of {numPages}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={handleNextPage}
            disabled={currentPage >= numPages}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Next Page"
            aria-label="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleLastPage}
            disabled={currentPage >= numPages}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
            title="Last Page"
            aria-label="Last Page"
          >
            <ChevronsRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Zoom Controls & Open In New Tab */}
        <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={zoomScale <= 0.6}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom Out (-)"
            aria-label="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleResetZoom}
            className="min-h-[36px] px-2 rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-gray-700 font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
            title="Reset Zoom to 100%"
            aria-label="Reset Zoom"
          >
            <span>{Math.round(zoomScale * 100)}%</span>
            {zoomScale !== 1.0 && <RotateCcw className="w-3 h-3 text-slate-400" />}
          </button>

          <button
            type="button"
            onClick={handleZoomIn}
            disabled={zoomScale >= 3.0}
            className="min-w-[36px] min-h-[36px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-40 transition-colors cursor-pointer"
            title="Zoom In (+)"
            aria-label="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>

          {/* Direct Open in New Tab Button for Mobile Guarantee */}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] px-2.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200/70 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 font-semibold text-[11px] inline-flex items-center gap-1 transition-colors"
              title="Open full PDF in browser tab"
            >
              <span className="hidden xs:inline">New Tab</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </div>

      {/* Main Canvas Viewport Area with Touch Pinch-Zoom & Keyboard Listeners */}
      <div
        ref={viewportRef}
        tabIndex={0}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className="w-full flex-1 min-h-[460px] sm:min-h-[580px] lg:min-h-[660px] rounded-2xl overflow-auto border border-slate-200 dark:border-gray-800 bg-slate-900/90 flex flex-col items-center justify-center p-2 sm:p-4 relative shadow-inner focus:outline-hidden focus:ring-1 focus:ring-indigo-500/30"
        style={{
          touchAction: zoomScale > 1.0 || isPinching ? 'pan-x pan-y' : 'pan-y pinch-zoom',
        }}
      >
        {/* Floating Pinch Indicator Pill */}
        {(isPinching || zoomScale !== 1.0) && (
          <div className="absolute top-3 right-3 z-20 pointer-events-none bg-slate-900/90 text-white text-[11px] px-3 py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-xs flex items-center gap-1.5 border border-slate-700/60 animate-fadeIn">
            <span>Scale: {Math.round(zoomScale * 100)}%</span>
            <span className="text-indigo-300">• Pinch or Double-Tap</span>
          </div>
        )}

        {/* HTML5 Canvas Element rendering the current PDF page */}
        <div className="flex items-center justify-center w-full transition-transform duration-100">
          <canvas
            ref={canvasRef}
            className="shadow-2xl rounded-lg max-w-none bg-white transition-shadow"
          />
        </div>
      </div>

      {/* Bottom Status & Keyboard Shortcut Hints */}
      <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-gray-400 px-1 pt-1">
        <span className="flex items-center gap-1.5 truncate max-w-xs sm:max-w-md">
          <FileText className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
          <span className="truncate">Document: {title}</span>
        </span>

        {/* Desktop Keyboard Hints */}
        <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-400 dark:text-gray-500 font-mono">
          <span className="inline-flex items-center gap-0.5">
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">←</kbd>
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">→</kbd>
            <span className="ml-0.5">page</span>
          </span>
          <span>•</span>
          <span className="inline-flex items-center gap-0.5">
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">↑</kbd>
            <kbd className="px-1 py-0.5 rounded bg-slate-100 dark:bg-gray-800 border border-slate-200 dark:border-gray-700">↓</kbd>
            <span className="ml-0.5">scroll</span>
          </span>
        </div>

        <span>Page {currentPage} of {numPages}</span>
      </div>
    </div>
  );
}
