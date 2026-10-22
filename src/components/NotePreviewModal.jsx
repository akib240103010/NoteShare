import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Download,
  Bookmark,
  Share2,
  ThumbsUp,
  GraduationCap,
  FileText,
  Calendar,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Sparkles,
  ExternalLink,
  ImageIcon,
  CloudCheck,
  Trash2,
  Pencil,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  BookOpen,
  CheckCircle2,
  WifiOff,
  HardDriveDownload,
} from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';
import { cacheNoteOffline, getCachedNoteFile, getCachedNoteFileUrl } from '../lib/offlineStorage';
import PdfDocumentViewer from './PdfDocumentViewer';

/**
 * Converts a base64 data string (or data:application/pdf URI) into a browser Blob URL
 * so that iframes and embeds can render uploaded PDFs directly and reliably.
 */
function convertBase64ToBlobUrl(base64Data) {
  try {
    if (!base64Data || typeof base64Data !== 'string') return null;
    const parts = base64Data.split(',');
    const meta = parts[0] || '';
    const rawData = parts[1] || parts[0];
    const mimeMatch = meta.match(/:(.*?);/);
    const mimeType = mimeMatch ? mimeMatch[1] : 'application/pdf';

    const byteCharacters = atob(rawData);
    const byteArrays = [];
    const sliceSize = 512;
    for (let offset = 0; offset < byteCharacters.length; offset += sliceSize) {
      const slice = byteCharacters.slice(offset, offset + sliceSize);
      const byteNumbers = new Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i);
      }
      byteArrays.push(new Uint8Array(byteNumbers));
    }
    const blob = new Blob(byteArrays, { type: mimeType });
    return URL.createObjectURL(blob);
  } catch (err) {
    console.warn('Failed to convert base64 to blob URL:', err);
    return null;
  }
}

export default function NotePreviewModal({
  note,
  onClose,
  isBookmarked,
  onToggleBookmark,
  onDownload,
  onShare,
  onUpvote,
  hasUpvoted,
  onToggleTag,
  selectedTags = [],
  currentUserId = null,
  onDelete = null,
  onEdit = null,
}) {
  const isAuthor = Boolean(currentUserId && note?.author?.id && String(currentUserId) === String(note.author.id));
  const [activePageIndex, setActivePageIndex] = useState(0);
  const [zoomScale, setZoomScale] = useState(1.0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPinching, setIsPinching] = useState(false);

  const initialTouchDistanceRef = useRef(null);
  const initialZoomRef = useRef(1.0);
  const readerSectionRef = useRef(null);
  const canvasRef = useRef(null);

  const { isOnline, cachedNoteIds } = useNetwork();
  const [offlineBlobUrl, setOfflineBlobUrl] = useState(null);
  const [activePdfUrl, setActivePdfUrl] = useState(null);
  const isCached = cachedNoteIds?.includes(note?.id);

  const rawFileUrl =
    note?.file?.url ||
    note?.file_url ||
    note?.fileUrl ||
    (typeof note?.file === 'string' ? note.file : null);

  const isImageAttachment =
    note?.file?.format === 'IMAGE' ||
    note?.file?.type?.startsWith('image/') ||
    Boolean((rawFileUrl || '').match(/\.(png|jpe?g|webp|gif)/i));

  const [viewType, setViewType] = useState(() => (rawFileUrl && !isImageAttachment ? 'pdf' : 'reader'));

  // Resolve PDF render source (Supabase Storage public URL, base64 data URI, or offline blob)
  useEffect(() => {
    let active = true;
    let createdBlobUrl = null;

    async function resolveSource() {
      if (!note) return;

      // Automatically cache in background
      cacheNoteOffline(note).catch(console.error);

      // 1. Direct raw file source (base64 data URI or HTTP/HTTPS public URL)
      const rawSource =
        note.file?.url ||
        note.file_url ||
        note.fileUrl ||
        (typeof note.file === 'string' ? note.file : null);

      if (rawSource) {
        if (typeof rawSource === 'string' && rawSource.startsWith('data:')) {
          const bUrl = convertBase64ToBlobUrl(rawSource);
          if (bUrl && active) {
            createdBlobUrl = bUrl;
            setActivePdfUrl(bUrl);
            setOfflineBlobUrl(null);
            if (!isImageAttachment) setViewType('pdf');
            return;
          }
        } else if (
          typeof rawSource === 'string' &&
          (rawSource.startsWith('http://') || rawSource.startsWith('https://') || rawSource.startsWith('blob:'))
        ) {
          if (active) {
            setActivePdfUrl(rawSource);
            setOfflineBlobUrl(null);
            if (!isImageAttachment) setViewType('pdf');
            return;
          }
        }
      }

      // 2. If no direct rawSource (or offline), try cached binary from IndexedDB
      try {
        const cachedFile = await getCachedNoteFile(note.id);
        if (cachedFile && cachedFile.blob && active) {
          const isPdf =
            cachedFile.blob.type?.includes('pdf') || cachedFile.fileFormat === 'PDF';
          const isImg =
            cachedFile.blob.type?.startsWith('image/') || cachedFile.fileFormat === 'IMAGE';

          if (isPdf || isImg) {
            const cachedUrl = URL.createObjectURL(cachedFile.blob);
            createdBlobUrl = cachedUrl;
            setOfflineBlobUrl(cachedUrl);
            setActivePdfUrl(cachedUrl);
            if (isPdf && !isImageAttachment) setViewType('pdf');
            return;
          }
        }
      } catch (err) {
        console.warn('Offline blob retrieval notice:', err);
      }

      // 3. Fallback: No renderable PDF file found, switch to formatted reader view
      if (active) {
        setActivePdfUrl(null);
        setOfflineBlobUrl(null);
        setViewType('reader');
      }
    }

    resolveSource();

    return () => {
      active = false;
      if (createdBlobUrl) {
        URL.revokeObjectURL(createdBlobUrl);
      }
    };
  }, [note?.id, note?.file?.url, note?.file_url, note?.fileUrl, isImageAttachment]);

  const pages = note.pagesContent && note.pagesContent.length > 0
    ? note.pagesContent
    : [
        {
          pageNumber: 1,
          title: `${note.courseCode} - Core Principles & Syllabus Overview`,
          excerpt: note.description,
          keyTakeaway: 'Master the fundamental theorems and practice solved past exam problems regularly.',
        },
        {
          pageNumber: 2,
          title: `${note.courseCode} - Worked Problem Sets & Derivations`,
          excerpt: 'Step-by-step mathematical proofs, key corollary transformations, and boundary conditions commonly tested in midterms and finals.',
          keyTakeaway: 'Always verify edge case convergence criteria before applying asymptotic reductions.',
        },
        {
          pageNumber: 3,
          title: `${note.courseCode} - Exam Revision Cheatsheet & Formulas`,
          excerpt: 'High-yield formula synthesis sheet cross-referencing major lecture modules, textbook appendices, and quiz review guides.',
          keyTakeaway: 'Memorize the core operational lemmas; rest of the formulas can be derived on scratch paper during tests.',
        },
      ];

  const currentPage = pages[activePageIndex] || pages[0];

  // Fullscreen event listener to sync state with native browser fullscreen
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrentlyFs = Boolean(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      );
      setIsFullscreen(isCurrentlyFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  // Keyboard navigation & zoom shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignore if user is typing in a comment input or form field
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes(e.target.tagName)) return;

      if (e.key === 'Escape' && !document.fullscreenElement) {
        onClose();
        return;
      }

      // Reader text-excerpt view pagination & zoom (PDF view has its own dedicated handler in PdfDocumentViewer)
      if (viewType === 'reader') {
        if (e.key === 'ArrowRight' || e.key === 'PageDown') {
          setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1));
        } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
          setActivePageIndex((prev) => Math.max(0, prev - 1));
        } else if (e.key === '+' || e.key === '=') {
          setZoomScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
        } else if (e.key === '-' || e.key === '_') {
          setZoomScale((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
        } else if (e.key === '0') {
          setZoomScale(1.0);
        }
      } else if (isImageAttachment) {
        if (e.key === '+' || e.key === '=') {
          setZoomScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
        } else if (e.key === '-' || e.key === '_') {
          setZoomScale((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
        } else if (e.key === '0') {
          setZoomScale(1.0);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pages.length, onClose, viewType, isImageAttachment]);

  // Touch Gesture Handlers for Pinch-to-Zoom
  const handleTouchStart = (e) => {
    if (e.touches.length === 2) {
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const dist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      initialTouchDistanceRef.current = dist;
      initialZoomRef.current = zoomScale;
      setIsPinching(true);
    }
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 2 && initialTouchDistanceRef.current) {
      if (e.cancelable) e.preventDefault();
      const touch1 = e.touches[0];
      const touch2 = e.touches[1];
      const currentDist = Math.hypot(touch2.clientX - touch1.clientX, touch2.clientY - touch1.clientY);
      const ratio = currentDist / initialTouchDistanceRef.current;
      const nextZoom = Math.min(2.5, Math.max(0.6, Number((initialZoomRef.current * ratio).toFixed(2))));
      setZoomScale(nextZoom);
    }
  };

  const handleTouchEnd = (e) => {
    if (e.touches.length < 2) {
      initialTouchDistanceRef.current = null;
      setIsPinching(false);
    }
  };

  // Fullscreen Toggle using standard & vendor prefixed APIs
  const handleToggleFullscreen = async () => {
    const target = readerSectionRef.current || document.documentElement;
    try {
      if (!document.fullscreenElement) {
        if (target.requestFullscreen) {
          await target.requestFullscreen();
        } else if (target.webkitRequestFullscreen) {
          await target.webkitRequestFullscreen();
        } else if (target.msRequestFullscreen) {
          await target.msRequestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if (document.webkitExitFullscreen) {
          await document.webkitExitFullscreen();
        } else if (document.msExitFullscreen) {
          await document.msExitFullscreen();
        }
      }
    } catch (err) {
      console.warn('Fullscreen toggle failed:', err);
    }
  };

  const handleZoomIn = () => {
    setZoomScale((prev) => Math.min(2.5, Number((prev + 0.15).toFixed(2))));
  };

  const handleZoomOut = () => {
    setZoomScale((prev) => Math.max(0.6, Number((prev - 0.15).toFixed(2))));
  };

  const handleResetZoom = () => {
    setZoomScale(1.0);
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 md:p-6 animate-fadeIn"
      onClick={onClose}
    >
      <div className="min-h-full flex items-center justify-center">
        <div
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-6xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-gray-800/80 overflow-hidden flex flex-col max-h-[92vh] my-auto animate-scaleUp text-gray-900 dark:text-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Modal Top Header with 44x44px touch targets */}
        <div className="px-4 sm:px-5 py-3.5 sm:py-4 bg-slate-900/95 dark:bg-gray-950/95 backdrop-blur-md text-white flex items-center justify-between gap-3 sm:gap-4 shrink-0 border-b border-slate-800 dark:border-gray-800">
          <div className="flex items-center gap-3 min-w-0">
            <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-indigo-500 text-white shrink-0">
              {note.courseCode}
            </span>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base md:text-lg font-bold truncate leading-snug">
                {note.title}
              </h2>
              <p className="text-xs text-slate-300 flex items-center gap-2 truncate">
                <span className="flex items-center gap-1">
                  <GraduationCap className="w-3.5 h-3.5 text-indigo-400" />
                  {note.university}
                </span>
                <span>•</span>
                <span>{note.category}</span>
                {isCached && (
                  <>
                    <span>•</span>
                    <span className="text-emerald-400 flex items-center gap-1 text-[11px]" title="Saved locally in offline storage">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Available Offline
                    </span>
                  </>
                )}
                {!isOnline && (
                  <>
                    <span>•</span>
                    <span className="text-amber-400 flex items-center gap-1 text-[11px]">
                      <WifiOff className="w-3.5 h-3.5" />
                      Offline Mode
                    </span>
                  </>
                )}
                {note.file?.url && (
                  <>
                    <span>•</span>
                    <span className="text-indigo-300 flex items-center gap-1 text-[11px]">
                      <CloudCheck className="w-3.5 h-3.5" />
                      Cloud Attached
                    </span>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Action buttons (All with min-w-[44px] min-h-[44px]) */}
          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
            <button
              onClick={() => onToggleBookmark(note.id)}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl transition-colors cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-500 text-white'
                  : 'bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700'
              }`}
              title={isBookmarked ? 'Remove Bookmark' : 'Bookmark Note'}
              aria-label={isBookmarked ? 'Remove Bookmark' : 'Bookmark Note'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => onShare(note)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors cursor-pointer"
              title="Share Note"
              aria-label="Share Note"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onDownload(note)}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 min-h-[44px] rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-xs transition-all cursor-pointer"
              title={`Download ${note.file?.format || 'PDF'}`}
            >
              <Download className="w-4 h-4" />
              <span>Download {note.file?.format || 'PDF'}</span>
            </button>

            {isAuthor && onEdit && (
              <button
                onClick={() => {
                  onEdit(note);
                  onClose();
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-indigo-600 text-indigo-400 hover:text-white transition-colors cursor-pointer"
                title="Edit & Re-upload Note (Author only)"
                aria-label="Edit & Re-upload Note"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {isAuthor && onDelete && (
              <button
                onClick={() => {
                  if (window.confirm(`Delete "${note.title}"? This action is permanent and cannot be undone.`)) {
                    onDelete(note.id);
                    onClose();
                  }
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 hover:bg-rose-600 text-rose-400 hover:text-white transition-colors cursor-pointer"
                title="Delete your note (Author only)"
                aria-label="Delete your note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={onClose}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors ml-1 cursor-pointer"
              title="Close Preview (Esc)"
              aria-label="Close Preview"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="flex-1 overflow-y-auto grid grid-cols-1 lg:grid-cols-12 min-h-0 bg-slate-100 dark:bg-gray-950">
          
          {/* Left Column: Interactive Reader & PDF Viewer Section */}
          <div
            ref={readerSectionRef}
            className={`lg:col-span-8 p-3 sm:p-5 md:p-6 flex flex-col justify-between ${
              isFullscreen ? 'fixed inset-0 z-50 bg-slate-900 p-4 sm:p-8 overflow-y-auto' : ''
            }`}
          >
            {/* Viewer Top Toolbar with View Switcher, Zoom Controls, Fullscreen, and Pagination */}
            <div className="flex flex-wrap items-center justify-between gap-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md px-3 py-2 sm:px-4 sm:py-2.5 rounded-2xl border border-slate-200/90 dark:border-gray-800/80 shadow-2xs mb-4 text-xs">
              
              {/* Left Side: View Mode Switcher or Document Label */}
              <div className="flex items-center gap-2">
                {activePdfUrl && !isImageAttachment ? (
                  <div className="inline-flex items-center bg-slate-100 dark:bg-gray-800 rounded-xl p-0.5 border border-slate-200/80 dark:border-gray-700">
                    <button
                      type="button"
                      onClick={() => setViewType('pdf')}
                      className={`min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewType === 'pdf'
                          ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>PDF Document</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewType('reader')}
                      className={`min-h-[36px] sm:min-h-[38px] px-2.5 sm:px-3 rounded-lg font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
                        viewType === 'reader'
                          ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-300 shadow-2xs font-bold'
                          : 'text-slate-600 dark:text-gray-400 hover:text-slate-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>Study Notes</span>
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300 font-medium truncate max-w-xs">
                    {isImageAttachment ? (
                      <ImageIcon className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
                    ) : (
                      <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                    )}
                    <span className="font-semibold truncate">
                      {isImageAttachment ? 'Image Document' : `Page ${activePageIndex + 1} of ${pages.length}`}
                    </span>
                  </div>
                )}
              </div>

              {/* Center / Right Side: Responsive Zoom Controls (44x44px touch targets) */}
              <div className="flex items-center gap-1 sm:gap-1.5 ml-auto">
                {(viewType === 'reader' || isImageAttachment) && (
                  <>
                    {/* Zoom Out Button */}
                    <button
                      type="button"
                      onClick={handleZoomOut}
                      disabled={zoomScale <= 0.6}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Zoom Out (-)"
                      aria-label="Zoom Out"
                    >
                      <ZoomOut className="w-4 h-4" />
                    </button>

                    {/* Reset Zoom / Scale Indicator Button */}
                    <button
                      type="button"
                      onClick={handleResetZoom}
                      className="min-h-[44px] px-2.5 rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-800 dark:text-gray-200 border border-slate-200 dark:border-gray-700 font-mono text-xs font-bold transition-colors cursor-pointer flex items-center gap-1"
                      title="Reset Zoom to 100% (Press 0)"
                      aria-label="Reset Zoom"
                    >
                      <span>{Math.round(zoomScale * 100)}%</span>
                      {zoomScale !== 1.0 && <RotateCcw className="w-3 h-3 text-slate-400" />}
                    </button>

                    {/* Zoom In Button */}
                    <button
                      type="button"
                      onClick={handleZoomIn}
                      disabled={zoomScale >= 2.5}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors cursor-pointer"
                      title="Zoom In (+)"
                      aria-label="Zoom In"
                    >
                      <ZoomIn className="w-4 h-4" />
                    </button>
                  </>
                )}

                {/* Fullscreen Toggle Button */}
                <button
                  type="button"
                  onClick={handleToggleFullscreen}
                  className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-colors cursor-pointer ${
                    isFullscreen
                      ? 'bg-indigo-600 text-white border-indigo-600'
                      : 'bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border-slate-200 dark:border-gray-700'
                  }`}
                  title={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                  aria-label={isFullscreen ? 'Exit Fullscreen' : 'View Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {/* Direct Link to Raw File if available (shown in reader mode) */}
              {activePdfUrl && viewType !== 'pdf' && (
                <a
                  href={activePdfUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="min-h-[44px] px-3 inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-300"
                >
                  <span>Open Raw</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>

            {/* Document Canvas Container with Touch Pinch-to-Zoom Gesture Listeners */}
            <div
              ref={viewType !== 'pdf' ? canvasRef : undefined}
              onTouchStart={viewType !== 'pdf' ? handleTouchStart : undefined}
              onTouchMove={viewType !== 'pdf' ? handleTouchMove : undefined}
              onTouchEnd={viewType !== 'pdf' ? handleTouchEnd : undefined}
              onTouchCancel={viewType !== 'pdf' ? handleTouchEnd : undefined}
              style={{
                touchAction:
                  viewType !== 'pdf'
                    ? zoomScale > 1.0 || isPinching
                      ? 'none'
                      : 'pan-x pan-y pinch-zoom'
                    : 'pan-y',
              }}
              className="relative bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-3xl border border-slate-200/90 dark:border-gray-800/80 shadow-md p-3 sm:p-5 md:p-6 min-h-[580px] sm:min-h-[640px] flex-1 flex flex-col justify-between overflow-x-auto overflow-y-auto"
            >
              {/* Floating Mobile Pinch Indicator Badge */}
              {viewType !== 'pdf' && (isPinching || zoomScale !== 1.0) && (
                <div className="absolute top-3 right-3 z-20 pointer-events-none bg-slate-900/85 text-white text-[11px] px-3 py-1.5 rounded-full font-semibold shadow-lg backdrop-blur-xs flex items-center gap-1.5 animate-fadeIn">
                  <span>Zoom: {Math.round(zoomScale * 100)}%</span>
                  <span className="text-indigo-300">• Pinch or Double-Tap</span>
                </div>
              )}

              {/* Content Box with CSS Transform for Pinch-to-Zoom */}
              <div
                style={
                  viewType !== 'pdf'
                    ? {
                        transform: `scale(${zoomScale})`,
                        transformOrigin: 'top center',
                        transition: isPinching ? 'none' : 'transform 150ms ease-out',
                      }
                    : undefined
                }
                className="w-full flex-1 flex flex-col"
              >
                {/* Universal HTML5 Canvas PDF View Mode (Mobile & Desktop) */}
                {viewType === 'pdf' && activePdfUrl ? (
                  <div className="w-full flex-1 flex flex-col space-y-3">
                    {offlineBlobUrl && (
                      <div className="flex items-center gap-1.5 text-xs text-emerald-600 dark:text-emerald-400 font-medium px-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Locally Cached Document (Offline Ready)</span>
                      </div>
                    )}
                    <PdfDocumentViewer
                      url={activePdfUrl}
                      title={note.title}
                      onDownload={() => onDownload(note)}
                    />
                  </div>
                ) : isImageAttachment && (activePdfUrl || offlineBlobUrl || note.file?.url) ? (
                  /* Attached Image Mode */
                  <div className="space-y-4">
                    <div className="rounded-2xl overflow-hidden border border-slate-200 dark:border-gray-800 bg-slate-950 flex items-center justify-center max-h-[540px]">
                      <img
                        src={activePdfUrl || offlineBlobUrl || note.file?.url}
                        alt={note.title}
                        className="max-h-[540px] w-auto object-contain select-none"
                      />
                    </div>
                    <p className="text-xs text-slate-600 dark:text-gray-300">{currentPage.excerpt}</p>
                  </div>
                ) : (
                  /* Formatted Academic Note Content & Derivations */
                  <div>
                    {/* Header */}
                    <div className="border-b border-slate-200 dark:border-gray-800 pb-4 mb-5 flex items-center justify-between">
                      <div>
                        <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                          {note.courseCode} — {note.courseName}
                        </span>
                        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mt-1">
                          {currentPage.title}
                        </h3>
                      </div>
                      <div className="text-right hidden sm:block">
                        <span className="text-xs font-semibold text-slate-600 dark:text-gray-300 block">
                          {note.university}
                        </span>
                        <span className="text-[10px] text-slate-400 dark:text-gray-500">
                          Author: {note.author?.name}
                        </span>
                      </div>
                    </div>

                    <div className="prose prose-slate dark:prose-invert max-w-none text-sm sm:text-base text-slate-700 dark:text-gray-300 leading-relaxed space-y-4">
                      <p>{currentPage.excerpt}</p>

                      <div className="bg-slate-50 dark:bg-gray-800/80 border-l-4 border-indigo-500 p-4 rounded-r-2xl">
                        <h4 className="text-xs font-bold uppercase tracking-wider text-indigo-900 dark:text-indigo-300 flex items-center gap-1.5 mb-1">
                          <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                          Key Takeaway & Exam Note
                        </h4>
                        <p className="text-xs sm:text-sm text-slate-700 dark:text-gray-300 italic">
                          {currentPage.keyTakeaway}
                        </p>
                      </div>

                      <div className="pt-2 text-xs text-slate-500 dark:text-gray-400 font-mono bg-slate-50 dark:bg-gray-800/80 p-3.5 rounded-xl border border-slate-200 dark:border-gray-800">
                        <span className="text-indigo-600 dark:text-indigo-400 font-semibold">[Notation Summary]</span> Verified against official syllabus ({note.uploadDate}). Includes complete derivations and solved practice problems.
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Pagination Controls & Watermark for Study Notes Reader */}
              {viewType === 'reader' && (
                <div className="border-t border-slate-100 dark:border-gray-800 pt-4 mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 dark:text-gray-400">
                  <div className="flex items-center gap-1">
                    {/* First Page */}
                    <button
                      type="button"
                      disabled={activePageIndex === 0}
                      onClick={() => setActivePageIndex(0)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="First Page"
                      aria-label="First Page"
                    >
                      <ChevronsLeft className="w-4 h-4" />
                    </button>

                    {/* Previous Page */}
                    <button
                      type="button"
                      disabled={activePageIndex === 0}
                      onClick={() => setActivePageIndex((prev) => Math.max(0, prev - 1))}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Previous Page (Left Arrow)"
                      aria-label="Previous Page"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>

                    {/* Page Jump Selector */}
                    <div className="flex items-center px-2">
                      <select
                        value={activePageIndex}
                        onChange={(e) => setActivePageIndex(Number(e.target.value))}
                        className="min-h-[44px] px-3 bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 font-mono font-semibold text-xs cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-indigo-500/30"
                        aria-label="Jump to page"
                      >
                        {pages.map((_, idx) => (
                          <option key={idx} value={idx} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                            Page {idx + 1} of {pages.length}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Next Page */}
                    <button
                      type="button"
                      disabled={activePageIndex === pages.length - 1}
                      onClick={() => setActivePageIndex((prev) => Math.min(pages.length - 1, prev + 1))}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Next Page (Right Arrow)"
                      aria-label="Next Page"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>

                    {/* Last Page */}
                    <button
                      type="button"
                      disabled={activePageIndex === pages.length - 1}
                      onClick={() => setActivePageIndex(pages.length - 1)}
                      className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 border border-slate-200 dark:border-gray-700 disabled:opacity-30 disabled:pointer-events-none transition-colors cursor-pointer"
                      title="Last Page"
                      aria-label="Last Page"
                    >
                      <ChevronsRight className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-gray-500">
                    <span>Verified NoteShare Academic Edition</span>
                    <span>•</span>
                    <span>{note.file?.pages || pages.length} pages</span>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Download CTA (min-h-[48px]) */}
            <div className="mt-4 sm:hidden">
              <button
                onClick={() => onDownload(note)}
                className="w-full min-h-[48px] flex items-center justify-center gap-2 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm shadow-md cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download Resource ({note.file?.size || 'PDF'})</span>
              </button>
            </div>
          </div>

          {/* Right Column: Academic Metadata & Study Controls (Expanded to comfortably fill space) */}
          <div className="lg:col-span-4 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md border-t lg:border-t-0 lg:border-l border-slate-200/90 dark:border-gray-800/80 p-5 sm:p-6 flex flex-col justify-between space-y-5 overflow-y-auto">
            <div className="space-y-4">
              {/* Author Profile Card */}
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider block mb-2">
                  Uploaded By Contributor
                </span>
                <div className="flex items-center gap-3">
                  {note.author?.avatar ? (
                    <img
                      src={note.author.avatar}
                      alt={note.author.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-200 dark:border-gray-700"
                    />
                  ) : (
                    <div className="w-11 h-11 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-base border border-indigo-200 dark:border-indigo-800">
                      {note.author?.name?.[0] || 'S'}
                    </div>
                  )}
                  <div className="min-w-0">
                    <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 leading-snug truncate flex items-center gap-1.5">
                      <span>{note.author?.name || 'Student Contributor'}</span>
                      {note.verified && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-indigo-500 shrink-0" title="Verified Author" />
                      )}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-gray-400 truncate">
                      {note.author?.degree || 'Student'} • {note.university}
                    </p>
                  </div>
                </div>
              </div>

              {/* Engagement Stats: Upvote & Download Counter */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => onUpvote(note.id)}
                  className={`min-h-[44px] flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-semibold text-xs border transition-all cursor-pointer ${
                    hasUpvoted
                      ? 'bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 shadow-xs'
                      : 'bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200'
                  }`}
                  aria-label={hasUpvoted ? 'Upvoted note' : 'Mark note helpful'}
                >
                  <ThumbsUp className={`w-4 h-4 ${hasUpvoted ? 'fill-indigo-600 dark:fill-indigo-400' : ''}`} />
                  <span>{hasUpvoted ? 'Upvoted' : 'Helpful'} ({note.reviewsCount || 0})</span>
                </button>

                <div className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-xs font-semibold text-slate-700 dark:text-gray-300">
                  <Download className="w-4 h-4 text-slate-400 dark:text-gray-500" />
                  <span>{note.downloads} downloads</span>
                </div>
              </div>

              {/* Document Overview & Description */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                  About This Resource
                </span>
                <p className="text-xs text-slate-600 dark:text-gray-300 leading-relaxed">
                  {note.description || 'Comprehensive verified study note for lecture revision, homework, and exam preparation.'}
                </p>
              </div>

              {/* Academic & File Specifications */}
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700 space-y-2.5 text-xs text-slate-600 dark:text-gray-300">
                <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider block mb-1">
                  Document Specifications
                </span>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-gray-700/60">
                  <span className="text-slate-400 dark:text-gray-400">Subject:</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">{note.category}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-gray-700/60">
                  <span className="text-slate-400 dark:text-gray-400">Resource Type:</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">{note.resourceType}</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-gray-700/60">
                  <span className="text-slate-400 dark:text-gray-400">File Attachment:</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">{note.file?.format || 'PDF'} ({note.file?.size || '2.0 MB'})</span>
                </div>
                <div className="flex justify-between items-center py-0.5 border-b border-slate-200/60 dark:border-gray-700/60">
                  <span className="text-slate-400 dark:text-gray-400">Pages:</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200">{note.file?.pages || pages.length} pages</span>
                </div>
                <div className="flex justify-between items-center py-0.5">
                  <span className="text-slate-400 dark:text-gray-400">Upload Date:</span>
                  <span className="font-semibold text-slate-800 dark:text-gray-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
                    {note.uploadDate}
                  </span>
                </div>
              </div>

              {/* Tags & Topics */}
              {note.tags && note.tags.length > 0 && (
                <div className="pt-1">
                  <span className="text-[11px] font-semibold text-slate-400 dark:text-gray-400 uppercase tracking-wider block mb-1.5">
                    Topics & Keywords
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {note.tags.map((t) => {
                      const isSelected = selectedTags.includes(t);
                      return (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            onToggleTag && onToggleTag(t);
                            onClose();
                          }}
                          className={`min-h-[32px] text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center ${
                            isSelected
                              ? 'bg-indigo-600 text-white font-semibold'
                              : 'bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-700 dark:hover:text-indigo-300'
                          }`}
                          title={`Filter notes with #${t}`}
                        >
                          #{t}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Bottom Study & Download Action Controls */}
            <div className="border-t border-slate-200 dark:border-gray-800 pt-4 space-y-2.5">
              <button
                type="button"
                onClick={() => onDownload(note)}
                className="w-full min-h-[46px] flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-500/20 hover:shadow-indigo-500/30 transition-all cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Download {note.file?.format || 'PDF'} ({note.file?.size || 'Direct File'})</span>
              </button>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => onToggleBookmark(note.id)}
                  className={`min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border text-xs font-semibold transition-all cursor-pointer ${
                    isBookmarked
                      ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300'
                      : 'bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-700'
                  }`}
                  title={isBookmarked ? 'Remove Bookmark' : 'Save to Bookmarks'}
                >
                  <Bookmark className={`w-3.5 h-3.5 ${isBookmarked ? 'fill-current' : ''}`} />
                  <span>{isBookmarked ? 'Saved' : 'Bookmark'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => onShare(note)}
                  className="min-h-[44px] flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-300 text-xs font-semibold transition-all cursor-pointer"
                  title="Share Link"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>Share Link</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);
}
