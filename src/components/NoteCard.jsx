import React from 'react';
import {
  FileText,
  Download,
  Eye,
  Star,
  Bookmark,
  Share2,
  CheckCircle2,
  GraduationCap,
  Calendar,
  Tag,
  Trash2,
  Pencil,
} from 'lucide-react';
import HighlightMatch from './HighlightMatch';

const CATEGORY_COLORS = {
  'Computer Science': {
    badge: 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 border-blue-200/80 dark:border-blue-800/60',
    dot: 'bg-blue-500 dark:bg-blue-400',
  },
  Mathematics: {
    badge: 'bg-purple-50 dark:bg-purple-950/40 text-purple-700 dark:text-purple-300 border-purple-200/80 dark:border-purple-800/60',
    dot: 'bg-purple-500 dark:bg-purple-400',
  },
  Physics: {
    badge: 'bg-cyan-50 dark:bg-cyan-950/40 text-cyan-800 dark:text-cyan-300 border-cyan-200/80 dark:border-cyan-800/60',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
  },
  Engineering: {
    badge: 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-200/80 dark:border-amber-800/60',
    dot: 'bg-amber-500 dark:bg-amber-400',
  },
  'Medicine & Biology': {
    badge: 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-200/80 dark:border-emerald-800/60',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
  },
  'Economics & Business': {
    badge: 'bg-rose-50 dark:bg-rose-950/40 text-rose-800 dark:text-rose-300 border-rose-200/80 dark:border-rose-800/60',
    dot: 'bg-rose-500 dark:bg-rose-400',
  },
};

export default function NoteCard({
  note,
  viewMode = 'grid',
  isBookmarked,
  isCachedOffline = false,
  onToggleBookmark,
  onPreview,
  onDownload,
  onShare,
  searchQuery = '',
  selectedTags = [],
  onToggleTag,
  currentUserId = null,
  onDelete = null,
  onEdit = null,
}) {
  const isAuthor = Boolean(currentUserId && note.author?.id && String(currentUserId) === String(note.author.id));

  const catColor = CATEGORY_COLORS[note.category] || {
    badge: 'bg-slate-50 dark:bg-gray-800 text-slate-700 dark:text-gray-300 border-slate-200 dark:border-gray-700',
    dot: 'bg-slate-500 dark:bg-slate-400',
  };

  // -------------------------------------------------------------
  // LIST VIEW LAYOUT
  // -------------------------------------------------------------
  if (viewMode === 'list') {
    return (
      <article className="group backdrop-blur-md bg-white/85 dark:bg-gray-950/85 border border-gray-200/20 dark:border-gray-800/50 text-gray-900 dark:text-white rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-500/60 p-4 sm:p-5 shadow-2xs hover:shadow-md transition-all duration-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        
        {/* Left Section: Icon + Details */}
        <div className="flex items-start gap-4 flex-1 min-w-0">
          <div className="w-12 h-12 rounded-xl bg-slate-100/90 dark:bg-gray-800/90 group-hover:bg-indigo-50 dark:group-hover:bg-indigo-950/50 border border-slate-200/70 dark:border-gray-700 group-hover:border-indigo-200 dark:group-hover:border-indigo-700 flex flex-col items-center justify-center shrink-0 text-gray-700 dark:text-gray-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            <FileText className="w-6 h-6" />
            <span className="text-[9px] font-bold uppercase tracking-wider -mt-0.5">
              {note.file?.format || 'PDF'}
            </span>
          </div>

          <div className="flex-1 min-w-0">
            {/* Meta Row: Course Code + University + Category/Subject */}
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded-md text-xs font-mono font-bold bg-slate-900 dark:bg-gray-800 text-white dark:text-gray-100 border border-transparent dark:border-gray-700">
                <HighlightMatch text={note.courseCode} query={searchQuery} />
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border ${catColor.badge}`}
              >
                <span className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
                {note.subject || note.category}
              </span>
              <span className="text-xs text-gray-600 dark:text-gray-300 flex items-center gap-1 font-medium truncate max-w-[220px]">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
                <HighlightMatch text={note.university} query={searchQuery} />
              </span>
              {isCachedOffline && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                  title="Cached locally on device for offline study"
                >
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                  <span>Offline Ready</span>
                </span>
              )}
            </div>

            {/* Note Title */}
            <h3
              onClick={() => onPreview(note)}
              className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer line-clamp-1"
            >
              <HighlightMatch text={note.title} query={searchQuery} />
            </h3>

            {/* Description Snippet */}
            <p className="text-xs text-gray-600 dark:text-gray-300 line-clamp-1 mt-0.5">
              <HighlightMatch text={note.description} query={searchQuery} />
            </p>

            {/* Tags + Author Info */}
            <div className="mt-2.5 flex flex-wrap items-center gap-2 sm:gap-3 text-xs text-gray-600 dark:text-gray-300">
              <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100">
                {note.author?.avatar ? (
                  <img
                    src={note.author.avatar}
                    alt={note.author.name}
                    className="w-4 h-4 rounded-full object-cover"
                  />
                ) : (
                  <div className="w-4 h-4 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold">
                    {note.author?.name?.[0] || 'S'}
                  </div>
                )}
                <span><HighlightMatch text={note.author?.name} query={searchQuery} /></span>
                {note.verified && (
                  <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400" title="Verified Student Author" />
                )}
              </div>

              <span className="text-slate-300 dark:text-gray-600">•</span>
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400 dark:text-gray-400" />
                {note.uploadDate}
              </span>
              <span className="text-slate-300 dark:text-gray-600">•</span>
              <span>{note.file?.pages || 1} pages</span>
              <span className="text-slate-300 dark:text-gray-600">•</span>
              <span>{note.file?.size || '2.0 MB'}</span>

              {/* Tag Chips */}
              {note.tags && note.tags.length > 0 && (
                <>
                  <span className="text-slate-300 dark:text-gray-600">•</span>
                  <div className="flex items-center gap-1 flex-wrap">
                    {note.tags.map((tag) => {
                      const isTagActive = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleTag && onToggleTag(tag);
                          }}
                          className={`min-h-[28px] inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                            isTagActive
                              ? 'bg-indigo-600 text-white font-bold'
                              : 'bg-slate-100/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border border-slate-200/60 dark:border-gray-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-700'
                          }`}
                        >
                          #{tag}
                        </button>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Section: Stats + Action Buttons (All 44x44px touch target compliant) */}
        <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-slate-100/80 dark:border-gray-800/80 shrink-0">
          
          {/* Rating & Downloads */}
          <div className="flex items-center gap-3 text-right pr-2">
            <div>
              <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
                <span>{Number(note.rating).toFixed(1)}</span>
                <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
                  ({note.reviewsCount})
                </span>
              </div>
              <div className="text-[11px] text-gray-600 dark:text-gray-300 mt-0.5">
                {note.downloads?.toLocaleString()} downloads
              </div>
            </div>
          </div>

          {/* Action Buttons (Minimum 44x44px for effortless mobile tapping) */}
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => onToggleBookmark(note.id)}
              className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                isBookmarked
                  ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                  : 'bg-slate-50/90 dark:bg-gray-800/90 hover:bg-slate-100 dark:hover:bg-gray-700 border-slate-200/80 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
              }`}
              title={isBookmarked ? 'Remove bookmark' : 'Save note'}
              aria-label={isBookmarked ? 'Remove bookmark' : 'Save note'}
            >
              <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
            </button>

            <button
              onClick={() => onShare(note)}
              className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50/90 dark:bg-gray-800/90 hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200/80 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100 transition-colors cursor-pointer"
              title="Share note"
              aria-label="Share note"
            >
              <Share2 className="w-4 h-4" />
            </button>

            <button
              onClick={() => onPreview(note)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-3.5 rounded-xl bg-slate-100/90 dark:bg-gray-800/90 hover:bg-slate-200 dark:hover:bg-gray-700 border border-slate-200/60 dark:border-gray-700 text-gray-800 dark:text-gray-100 text-xs font-semibold transition-colors cursor-pointer"
            >
              <Eye className="w-4 h-4" />
              <span>Preview</span>
            </button>

            <button
              onClick={() => onDownload(note)}
              className="min-h-[44px] inline-flex items-center gap-1.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-indigo-500/20 transition-all cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download</span>
            </button>

            {isAuthor && onEdit && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(note);
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50/90 dark:bg-gray-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors cursor-pointer"
                title="Edit & Re-upload note (Author only)"
                aria-label="Edit note"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}

            {isAuthor && onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete "${note.title}"? This cannot be undone.`)) {
                    onDelete(note.id);
                  }
                }}
                className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-slate-50/90 dark:bg-gray-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-800 text-rose-500 dark:text-rose-400 hover:text-rose-600 dark:hover:text-rose-300 transition-colors cursor-pointer"
                title="Delete your note (Author only)"
                aria-label="Delete note"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>

        </div>
      </article>
    );
  }

  // -------------------------------------------------------------
  // GRID VIEW LAYOUT (DEFAULT)
  // -------------------------------------------------------------
  return (
    <article className="group backdrop-blur-md bg-white/85 dark:bg-gray-950/85 border border-gray-200/20 dark:border-gray-800/50 text-gray-900 dark:text-white rounded-2xl hover:border-indigo-300 dark:hover:border-indigo-500/60 shadow-2xs hover:shadow-xl hover:shadow-indigo-500/8 transition-all duration-300 flex flex-col justify-between overflow-hidden">
      
      {/* Top Banner & Badges */}
      <div className="p-5 pb-3">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold bg-slate-900 dark:bg-gray-800 text-white dark:text-gray-100 shadow-2xs border border-transparent dark:border-gray-700">
              <HighlightMatch text={note.courseCode} query={searchQuery} />
            </span>
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-lg text-xs font-medium border ${catColor.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${catColor.dot}`} />
              {note.subject || note.category}
            </span>
            {isCachedOffline && (
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60"
                title="Cached locally on device for offline study"
              >
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                <span>Offline Ready</span>
              </span>
            )}
          </div>

          {/* Bookmark Button (44x44px touch target) */}
          <button
            onClick={() => onToggleBookmark(note.id)}
            className={`min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
              isBookmarked
                ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                : 'bg-slate-50/90 dark:bg-gray-800/90 hover:bg-slate-100 dark:hover:bg-gray-700 border-slate-200/80 dark:border-gray-700 text-gray-500 dark:text-gray-300 hover:text-gray-700 dark:hover:text-gray-100'
            }`}
            title={isBookmarked ? 'Remove bookmark' : 'Save note'}
            aria-label={isBookmarked ? 'Remove bookmark' : 'Save note'}
          >
            <Bookmark className={`w-4 h-4 ${isBookmarked ? 'fill-amber-500' : ''}`} />
          </button>
        </div>

        {/* University Info */}
        <div className="flex items-center gap-1.5 text-xs font-medium text-gray-600 dark:text-gray-300 mb-2 truncate">
          <GraduationCap className="w-3.5 h-3.5 text-indigo-500 dark:text-indigo-400 shrink-0" />
          <span className="truncate">
            <HighlightMatch text={note.university} query={searchQuery} />
          </span>
        </div>

        {/* Note Title */}
        <h3
          onClick={() => onPreview(note)}
          className="text-base font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors cursor-pointer line-clamp-2 leading-snug py-0.5"
        >
          <HighlightMatch text={note.title} query={searchQuery} />
        </h3>

        {/* Description Snippet */}
        <p className="mt-2 text-xs text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">
          <HighlightMatch text={note.description} query={searchQuery} />
        </p>

        {/* Tags with click-to-filter capability */}
        <div className="mt-3 flex flex-wrap gap-1.5">
          {note.tags?.slice(0, 4).map((tag) => {
            const isTagActive = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleTag && onToggleTag(tag);
                }}
                className={`min-h-[28px] inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg font-medium transition-colors cursor-pointer ${
                  isTagActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-2xs'
                    : 'bg-slate-100/90 dark:bg-gray-800/90 text-gray-700 dark:text-gray-200 border border-slate-200/60 dark:border-gray-700/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 hover:border-indigo-200 dark:hover:border-indigo-700'
                }`}
                title={`Filter by tag #${tag}`}
              >
                #{tag}
              </button>
            );
          })}
          {note.tags?.length > 4 && (
            <span className="min-h-[28px] inline-flex items-center text-[11px] px-2 py-0.5 rounded-lg bg-slate-100/90 dark:bg-gray-800/90 text-gray-600 dark:text-gray-300 border border-slate-200/60 dark:border-gray-700/60 font-medium">
              +{note.tags.length - 4}
            </span>
          )}
        </div>
      </div>

      {/* Footer Info & Actions */}
      <div className="px-5 pb-5 pt-3 border-t border-slate-100/80 dark:border-gray-800/80 bg-slate-50/80 dark:bg-gray-900/80 backdrop-blur-sm">
        
        {/* Author + File Specs */}
        <div className="flex items-center justify-between text-xs text-gray-600 dark:text-gray-300 mb-3">
          <div className="flex items-center gap-1.5 font-medium text-gray-900 dark:text-gray-100 min-w-0">
            {note.author?.avatar ? (
              <img
                src={note.author.avatar}
                alt={note.author.name}
                className="w-5 h-5 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-5 h-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 text-[10px] flex items-center justify-center font-bold shrink-0">
                {note.author?.name?.[0] || 'S'}
              </div>
            )}
            <span className="truncate text-xs">
              <HighlightMatch text={note.author?.name} query={searchQuery} />
            </span>
            {note.verified && (
              <CheckCircle2 className="w-3 h-3 text-indigo-600 dark:text-indigo-400 shrink-0" title="Verified Student Author" />
            )}
          </div>

          <div className="flex items-center gap-1 text-xs font-bold text-amber-600 dark:text-amber-400 shrink-0">
            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-500" />
            <span>{Number(note.rating).toFixed(1)}</span>
            <span className="text-[10px] text-gray-500 dark:text-gray-400 font-normal">
              ({note.reviewsCount})
            </span>
          </div>
        </div>

        {/* Secondary Specs: Pages, File Size, Downloads */}
        <div className="flex items-center justify-between text-[11px] text-gray-600 dark:text-gray-300 mb-3.5 px-0.5">
          <span className="flex items-center gap-1">
            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-gray-400" />
            {note.file?.pages || 1} pages ({note.file?.size || '2 MB'})
          </span>
          <span>{note.downloads?.toLocaleString()} downloads</span>
        </div>

        {/* Action Buttons (All 44x44px touch targets on mobile) */}
        <div className={`grid ${isAuthor ? (onEdit ? 'grid-cols-4' : 'grid-cols-3') : 'grid-cols-2'} gap-1.5 sm:gap-2`}>
          <button
            onClick={() => onPreview(note)}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-white/90 dark:bg-gray-800/90 hover:bg-slate-100 dark:hover:bg-gray-700 text-gray-800 dark:text-gray-100 text-xs font-semibold border border-slate-200/80 dark:border-gray-700 transition-colors shadow-2xs cursor-pointer truncate"
          >
            <Eye className="w-4 h-4 shrink-0" />
            <span className={isAuthor ? 'hidden sm:inline' : ''}>Preview</span>
          </button>

          <button
            onClick={() => onDownload(note)}
            className="min-h-[44px] flex items-center justify-center gap-1.5 py-2.5 px-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-xs hover:shadow-indigo-500/20 transition-all cursor-pointer truncate"
          >
            <Download className="w-4 h-4 shrink-0" />
            <span className={isAuthor ? 'hidden sm:inline' : ''}>Download</span>
          </button>

          {isAuthor && onEdit && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onEdit(note);
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-white/90 dark:bg-gray-800/90 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 border border-slate-200/80 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-800 text-indigo-600 dark:text-indigo-400 text-xs font-semibold transition-colors cursor-pointer shadow-2xs truncate"
              title="Edit & Re-upload note (Author only)"
              aria-label="Edit note"
            >
              <Pencil className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Edit</span>
            </button>
          )}

          {isAuthor && onDelete && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (window.confirm(`Delete "${note.title}"? This cannot be undone.`)) {
                  onDelete(note.id);
                }
              }}
              className="min-h-[44px] min-w-[44px] flex items-center justify-center gap-1 py-2.5 px-2 rounded-xl bg-white/90 dark:bg-gray-800/90 hover:bg-rose-50 dark:hover:bg-rose-950/40 border border-slate-200/80 dark:border-gray-700 hover:border-rose-200 dark:hover:border-rose-800 text-rose-500 dark:text-rose-400 text-xs font-semibold transition-colors cursor-pointer shadow-2xs truncate"
              title="Delete your note (Author only)"
              aria-label="Delete note"
            >
              <Trash2 className="w-4 h-4 shrink-0" />
              <span className="hidden sm:inline">Delete</span>
            </button>
          )}
        </div>

      </div>
    </article>
  );
}
