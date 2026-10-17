import React from 'react';
import {
  FileQuestion,
  Sparkles,
  UploadCloud,
  RotateCcw,
  BookOpen,
  FileText,
  GraduationCap,
} from 'lucide-react';
import NoteCard from './NoteCard';

export default function NoteListView({
  notes = [],
  isLoading = false,
  viewMode = 'grid',
  bookmarks = [],
  cachedNoteIds = [],
  onToggleBookmark,
  onPreview,
  onDownload,
  onShare,
  onResetFilters,
  onGoToUpload,
  searchQuery = '',
  selectedCategory = 'All Categories',
  selectedUniversity = 'All Universities',
  selectedTags = [],
  onToggleTag,
  currentUserId = null,
  onDelete = null,
  onEdit = null,
}) {
  const isFiltered =
    Boolean(searchQuery) ||
    selectedCategory !== 'All Categories' ||
    selectedUniversity !== 'All Universities' ||
    selectedTags.length > 0;

  // -------------------------------------------------------------
  // 1. LOADING STATE (FETCHING FROM SUPABASE)
  // -------------------------------------------------------------
  if (isLoading) {
    return (
      <div className="bg-white/85 dark:bg-gray-950/85 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-gray-800/80 p-8 sm:p-14 text-center shadow-xs animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4 animate-pulse">
          <FileText className="w-8 h-8 animate-bounce" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          Loading student study notes...
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-sm mx-auto">
          Connecting to live Supabase database and retrieving verified academic notes.
        </p>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 2. EMPTY STATE: NO NOTES IN SUPABASE (OR REPOSITORY EMPTY)
  // -------------------------------------------------------------
  if (notes.length === 0 && !isFiltered) {
    return (
      <div className="bg-white/85 dark:bg-gray-950/85 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-gray-800/80 p-8 sm:p-16 text-center shadow-xs animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4 shadow-2xs">
          <BookOpen className="w-8 h-8" />
        </div>
        <h3 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
          No notes uploaded yet
        </h3>
        <p className="text-sm sm:text-base text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-8 leading-relaxed">
          Be the first to share your notes! Upload lecture summaries, study guides, formula sheets, or exam reviews to help fellow students worldwide.
        </p>
        <button
          onClick={onGoToUpload}
          className="inline-flex items-center gap-2.5 px-6 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold transition-all shadow-md shadow-indigo-500/25 hover:shadow-indigo-500/40 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          <span>Upload the First Note</span>
        </button>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 3. EMPTY STATE: NO MATCHES FOR ACTIVE SEARCH / FILTERS
  // -------------------------------------------------------------
  if (notes.length === 0 && isFiltered) {
    return (
      <div className="bg-white/85 dark:bg-gray-950/85 backdrop-blur-md rounded-3xl border border-slate-200/80 dark:border-gray-800/80 p-8 sm:p-12 text-center shadow-xs animate-fadeIn">
        <div className="w-16 h-16 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-800 flex items-center justify-center text-indigo-600 dark:text-indigo-400 mx-auto mb-4">
          <FileQuestion className="w-8 h-8" />
        </div>
        <h3 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
          No matching study notes found
        </h3>
        <p className="text-sm text-gray-600 dark:text-gray-300 max-w-md mx-auto mb-6">
          {searchQuery
            ? `We couldn't find any uploaded notes matching "${searchQuery}". Try searching with fewer keywords, removing tag filters, or selecting "All Categories".`
            : selectedTags.length > 0
            ? 'No notes match the selected combination of topic tags. Try removing some tags or switching the match mode.'
            : 'There are currently no notes uploaded under these filter criteria.'}
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3">
          <button
            onClick={onResetFilters}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 bg-white/90 dark:bg-gray-800/90 backdrop-blur-xs hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 text-sm font-semibold transition-colors shadow-2xs cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-slate-400 dark:text-gray-500" />
            <span>Clear All Active Filters</span>
          </button>

          <button
            onClick={onGoToUpload}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" />
            <span>Upload Notes for this Course</span>
          </button>
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // 4. NOTES LIST / GRID DISPLAY
  // -------------------------------------------------------------
  return (
    <div className="space-y-4">
      {/* Results Header Count & Active Filters Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs sm:text-sm text-gray-600 dark:text-gray-300 gap-2 px-1">
        <div className="flex flex-wrap items-center gap-1.5 font-medium">
          <span>Showing</span>
          <span className="font-bold text-gray-900 dark:text-gray-100">{notes.length}</span>
          <span>{notes.length === 1 ? 'study resource' : 'study resources'}</span>
          {selectedCategory !== 'All Categories' && (
            <>
              <span>in</span>
              <span className="font-semibold text-indigo-600 dark:text-indigo-400">{selectedCategory}</span>
            </>
          )}
          {selectedUniversity !== 'All Universities' && (
            <>
              <span>from</span>
              <span className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1">
                <GraduationCap className="w-3.5 h-3.5 text-indigo-500 inline" />
                {selectedUniversity}
              </span>
            </>
          )}
          {searchQuery && (
            <>
              <span>matching</span>
              <span className="italic font-semibold text-gray-900 dark:text-gray-100">"{searchQuery}"</span>
            </>
          )}
          {selectedTags.length > 0 && (
            <span className="text-slate-400 dark:text-gray-500">
              ({selectedTags.length} {selectedTags.length === 1 ? 'tag' : 'tags'} applied)
            </span>
          )}
        </div>

        <div className="hidden sm:flex items-center gap-1 text-slate-400 dark:text-gray-500 text-xs">
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          <span>Real-time instant filtering</span>
        </div>
      </div>

      {/* Grid or List Layout */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5 lg:gap-6">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              viewMode="grid"
              isBookmarked={bookmarks.includes(note.id)}
              isCachedOffline={cachedNoteIds.includes(note.id)}
              onToggleBookmark={onToggleBookmark}
              onPreview={onPreview}
              onDownload={onDownload}
              onShare={onShare}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {notes.map((note) => (
            <NoteCard
              key={note.id}
              note={note}
              viewMode="list"
              isBookmarked={bookmarks.includes(note.id)}
              isCachedOffline={cachedNoteIds.includes(note.id)}
              onToggleBookmark={onToggleBookmark}
              onPreview={onPreview}
              onDownload={onDownload}
              onShare={onShare}
              searchQuery={searchQuery}
              selectedTags={selectedTags}
              onToggleTag={onToggleTag}
              currentUserId={currentUserId}
              onDelete={onDelete}
              onEdit={onEdit}
            />
          ))}
        </div>
      )}
    </div>
  );
}
