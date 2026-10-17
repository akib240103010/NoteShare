import React, { forwardRef, useState, useMemo, useRef, useEffect } from 'react';
import {
  Search,
  X,
  Sparkles,
  BookMarked,
  GraduationCap,
  Users,
  Flame,
  Tag,
  BookOpen,
  ArrowRight,
} from 'lucide-react';
import { POPULAR_SEARCH_TERMS } from '../data/initialNotes';
import HighlightMatch from './HighlightMatch';

const HeroSearch = forwardRef(function HeroSearch(
  {
    searchQuery,
    setSearchQuery,
    totalNotesCount,
    matchingCount,
    onSelectTag,
    onToggleTag,
    selectedTags = [],
    notes = [],
  },
  ref
) {
  const [isFocused, setIsFocused] = useState(false);
  const containerRef = useRef(null);

  // Close suggestions if clicked outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Compute real-time suggestions based on current query
  const suggestions = useMemo(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) return null;
    const q = searchQuery.toLowerCase().trim();

    // Matching notes (max 4)
    const matchingNotes = notes
      .filter(
        (n) =>
          n.title.toLowerCase().includes(q) ||
          n.courseCode.toLowerCase().includes(q) ||
          n.university.toLowerCase().includes(q)
      )
      .slice(0, 4);

    // Matching tags (max 4)
    const allTags = Array.from(new Set(notes.flatMap((n) => n.tags || [])));
    const matchingTags = allTags
      .filter((t) => t.toLowerCase().includes(q))
      .slice(0, 4);

    // Matching universities (max 3)
    const allUnis = Array.from(new Set(notes.map((n) => n.university)));
    const matchingUnis = allUnis
      .filter((u) => u.toLowerCase().includes(q))
      .slice(0, 3);

    const hasAny =
      matchingNotes.length > 0 || matchingTags.length > 0 || matchingUnis.length > 0;

    return hasAny
      ? { notes: matchingNotes, tags: matchingTags, universities: matchingUnis }
      : null;
  }, [searchQuery, notes]);

  return (
    <section className="relative overflow-hidden pt-8 pb-10 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md border-b border-slate-200/60 dark:border-gray-800/80">
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none overflow-hidden opacity-60 dark:opacity-20">
        <div className="absolute -top-24 left-1/4 w-96 h-96 bg-indigo-200/50 dark:bg-indigo-900/30 rounded-full blur-3xl" />
        <div className="absolute top-12 right-1/4 w-80 h-80 bg-violet-200/40 dark:bg-violet-900/20 rounded-full blur-3xl" />
      </div>

      <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        
        {/* Global Student Badge */}
        <div className="inline-flex flex-wrap justify-center items-center gap-1.5 sm:gap-2 px-3 sm:px-3.5 py-1.5 rounded-full bg-white/90 dark:bg-gray-800/90 backdrop-blur-md border border-indigo-100 dark:border-gray-700 shadow-xs mb-4 sm:mb-5 max-w-full">
          <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span className="text-xs font-semibold text-slate-700 dark:text-gray-300">
            Global Student Academic Exchange
          </span>
          <span className="hidden xs:inline text-slate-300 dark:text-gray-600">|</span>
          <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
            <Sparkles className="w-3 h-3 shrink-0" />
            Over {totalNotesCount} curated notes
          </span>
        </div>

        {/* Hero Headline */}
        <h1 className="text-2xl xs:text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100 leading-[1.18] sm:leading-[1.15]">
          Share Knowledge Across Borders.{' '}
          <span className="bg-linear-to-r from-indigo-600 via-violet-600 to-purple-600 bg-clip-text text-transparent">
            Excel Together.
          </span>
        </h1>

        {/* Subtitle */}
        <p className="mt-3 max-w-2xl mx-auto text-sm sm:text-base md:text-lg text-slate-600 dark:text-gray-400 leading-relaxed">
          Access high-yield lecture notes, exam study guides, formula sheets, and lab reports contributed by top university students worldwide.
        </p>

        {/* Real-Time Search Bar Container */}
        <div ref={containerRef} className="relative mt-8 max-w-3xl mx-auto">
          <div className="relative flex items-center bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl shadow-xl shadow-indigo-500/8 border border-slate-200/90 dark:border-gray-800/80 hover:border-indigo-300 dark:hover:border-indigo-600 focus-within:border-indigo-500 dark:focus-within:border-indigo-500 focus-within:ring-4 focus-within:ring-indigo-500/10 dark:focus-within:ring-indigo-500/20 transition-all p-1.5">
            <div className="pl-3.5 pr-2 text-slate-400 dark:text-gray-500">
              <Search className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            </div>

            <input
              ref={ref}
              type="text"
              value={searchQuery}
              onFocus={() => setIsFocused(true)}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsFocused(true);
              }}
              placeholder="Search by course code (e.g. CS229, 6.006), title, topic, or university..."
              className="w-full bg-transparent border-none text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 text-sm sm:text-base focus:outline-hidden py-2.5 px-2"
            />

            {/* Live Result Counter Badge */}
            {searchQuery && (
              <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-transparent dark:border-indigo-800 mr-2 shrink-0">
                {matchingCount} {matchingCount === 1 ? 'result' : 'results'}
              </span>
            )}

            {searchQuery && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setIsFocused(false);
                }}
                className="p-1.5 mr-1 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            <button
              onClick={() => {
                if (ref && ref.current) {
                  ref.current.focus();
                }
              }}
              className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-all shadow-sm shrink-0 cursor-pointer"
            >
              <span>Explore</span>
            </button>
          </div>

          {/* Real-time Search Suggestions Dropdown */}
          {isFocused && suggestions && (
            <div className="absolute left-0 right-0 top-full mt-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-gray-800/80 shadow-2xl p-4 text-left z-30 animate-fadeIn space-y-3">
              
              {/* Matched Notes */}
              {suggestions.notes.length > 0 && (
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 block mb-1.5">
                    Matching Courses & Notes
                  </span>
                  <div className="space-y-1">
                    {suggestions.notes.map((n) => (
                      <button
                        key={n.id}
                        onClick={() => {
                          setSearchQuery(n.courseCode);
                          setIsFocused(false);
                        }}
                        className="w-full flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 dark:hover:bg-gray-800 transition-colors text-xs text-slate-800 dark:text-gray-200 text-left group"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="px-1.5 py-0.5 rounded font-mono font-bold bg-slate-900 dark:bg-gray-800 text-white dark:text-gray-100 text-[10px] border border-transparent dark:border-gray-700">
                            {n.courseCode}
                          </span>
                          <span className="font-semibold truncate">
                            <HighlightMatch text={n.title} query={searchQuery} />
                          </span>
                        </div>
                        <span className="text-[11px] text-slate-400 dark:text-gray-500 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 shrink-0 ml-2">
                          {n.university.split(' ')[0]}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Tags */}
              {suggestions.tags.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 block mb-1.5">
                    Matching Topic Tags
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.tags.map((tag) => (
                      <button
                        key={tag}
                        onClick={() => {
                          onToggleTag(tag);
                          setSearchQuery('');
                          setIsFocused(false);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all cursor-pointer"
                      >
                        <Tag className="w-3 h-3" />
                        <span>#{tag}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Matched Universities */}
              {suggestions.universities.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 block mb-1.5">
                    Matching Universities
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {suggestions.universities.map((uni) => (
                      <button
                        key={uni}
                        onClick={() => {
                          setSearchQuery(uni);
                          setIsFocused(false);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 dark:bg-gray-800 text-slate-700 dark:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-700 transition-colors cursor-pointer"
                      >
                        <GraduationCap className="w-3 h-3 text-slate-500 dark:text-gray-400" />
                        <span>{uni}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* Popular Search Tags */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-1.5 text-xs text-slate-500 dark:text-gray-400">
            <span className="flex items-center gap-1 font-medium text-slate-600 dark:text-gray-300 mr-1">
              <Flame className="w-3.5 h-3.5 text-amber-500" /> Popular:
            </span>
            {POPULAR_SEARCH_TERMS.map((term) => {
              const isTagActive = selectedTags.includes(term);
              const isSearchActive = searchQuery.toLowerCase() === term.toLowerCase();
              const active = isTagActive || isSearchActive;

              return (
                <button
                  key={term}
                  onClick={() => onToggleTag(term)}
                  className={`px-2.5 py-1 rounded-lg border transition-all text-xs cursor-pointer ${
                    active
                      ? 'bg-indigo-600 text-white border-indigo-600 font-semibold shadow-xs'
                      : 'bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-800 text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 border-slate-200/80 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-600'
                  }`}
                >
                  #{term}
                </button>
              );
            })}
          </div>
        </div>

        {/* Global Academic Impact Highlights */}
        <div className="mt-8 pt-6 border-t border-slate-200/60 dark:border-gray-800 grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-4 max-w-2xl mx-auto">
          <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-gray-300">
            <GraduationCap className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">140+</span>
            <span className="text-xs text-slate-500 dark:text-gray-400">Global Universities</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-gray-300">
            <BookMarked className="w-4 h-4 text-violet-600 dark:text-violet-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">100% Peer</span>
            <span className="text-xs text-slate-500 dark:text-gray-400">Verified Notes</span>
          </div>
          <div className="flex items-center justify-center gap-2 text-slate-700 dark:text-gray-300">
            <Users className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">45k+</span>
            <span className="text-xs text-slate-500 dark:text-gray-400">Active Students</span>
          </div>
        </div>

      </div>
    </section>
  );
});

export default HeroSearch;
