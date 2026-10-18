import React from 'react';
import {
  X,
  Bookmark,
  FileText,
  Trash2,
  Eye,
  Download,
  GraduationCap,
} from 'lucide-react';

export default function BookmarksModal({
  isOpen,
  onClose,
  bookmarkedNotes,
  onRemoveBookmark,
  onPreview,
  onDownload,
}) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="min-h-full flex items-center justify-center">
        <div
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-gray-800/80 overflow-hidden flex flex-col max-h-[85vh] my-auto animate-scaleUp text-gray-900 dark:text-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200/80 dark:border-gray-800 flex items-center justify-between bg-slate-50/90 dark:bg-gray-950/80 backdrop-blur-xs">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
              <Bookmark className="w-4 h-4 fill-amber-500" />
            </div>
            <div>
              <h3 className="text-base font-bold text-gray-900 dark:text-gray-100">
                Saved Study Resources
              </h3>
              <p className="text-xs text-slate-500 dark:text-gray-400">
                {bookmarkedNotes.length} {bookmarkedNotes.length === 1 ? 'note' : 'notes'} saved for quick access
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {bookmarkedNotes.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-12 h-12 rounded-xl bg-slate-100 dark:bg-gray-800 text-slate-400 dark:text-gray-500 flex items-center justify-center mx-auto mb-3">
                <Bookmark className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">No saved notes yet</h4>
              <p className="text-xs text-slate-500 dark:text-gray-400 mt-1 max-w-xs mx-auto">
                Click the bookmark icon on any note card to save it here for fast revision during study sessions.
              </p>
            </div>
          ) : (
            bookmarkedNotes.map((note) => (
              <div
                key={note.id}
                className="flex items-center justify-between gap-3 p-3.5 rounded-2xl border border-slate-200/90 dark:border-gray-800 hover:border-indigo-200 dark:hover:border-indigo-800/60 bg-white dark:bg-gray-800/80 hover:bg-slate-50/50 dark:hover:bg-gray-800 transition-colors"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 text-xs font-mono font-bold">
                    {note.file?.format || 'PDF'}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-mono text-xs font-bold bg-slate-900 dark:bg-gray-950 text-white px-1.5 py-0.2 rounded">
                        {note.courseCode}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-gray-400 truncate flex items-center gap-1">
                        <GraduationCap className="w-3 h-3 text-slate-400 dark:text-gray-500" />
                        {note.university}
                      </span>
                    </div>
                    <h4
                      onClick={() => {
                        onPreview(note);
                        onClose();
                      }}
                      className="text-sm font-semibold text-gray-900 dark:text-gray-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer truncate"
                    >
                      {note.title}
                    </h4>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => {
                      onPreview(note);
                      onClose();
                    }}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 text-slate-600 dark:text-gray-300 transition-colors cursor-pointer"
                    title="Preview Note"
                  >
                    <Eye className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onDownload(note)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl hover:bg-slate-200 dark:hover:bg-gray-700 text-indigo-600 dark:text-indigo-400 transition-colors cursor-pointer"
                    title="Download Note"
                  >
                    <Download className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => onRemoveBookmark(note.id)}
                    className="min-w-[40px] min-h-[40px] flex items-center justify-center p-2 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/50 text-rose-500 transition-colors cursor-pointer"
                    title="Remove Bookmark"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 bg-slate-50/90 dark:bg-gray-950/80 border-t border-slate-200 dark:border-gray-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-semibold bg-white dark:bg-gray-800 border border-slate-200 dark:border-gray-700 text-slate-700 dark:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  </div>
);
}
