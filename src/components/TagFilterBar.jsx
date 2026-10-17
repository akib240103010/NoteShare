import React, { useState, useMemo } from 'react';
import {
  Tag,
  X,
  Search,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  Sparkles,
} from 'lucide-react';

export default function TagFilterBar({
  availableTagsWithCounts,
  selectedTags,
  onToggleTag,
  onClearTags,
  tagMatchMode,
  setTagMatchMode,
}) {
  const [tagSearchInput, setTagSearchInput] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  // Filter available tags based on search query inside the tag bar
  const filteredTags = useMemo(() => {
    if (!tagSearchInput.trim()) return availableTagsWithCounts;
    const q = tagSearchInput.toLowerCase().trim();
    return availableTagsWithCounts.filter((t) => t.tag.toLowerCase().includes(q));
  }, [availableTagsWithCounts, tagSearchInput]);

  // Display top 10 tags by default, or all if expanded or searching
  const displayedTags = useMemo(() => {
    if (isExpanded || tagSearchInput.trim()) {
      return filteredTags;
    }
    return filteredTags.slice(0, 10);
  }, [filteredTags, isExpanded, tagSearchInput]);

  return (
    <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md rounded-2xl border border-slate-200/90 dark:border-gray-800/80 p-4 shadow-2xs space-y-3">
      {/* Top Header: Tag Filter Title & Match Mode */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5 pb-2 border-b border-slate-100 dark:border-gray-800">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
            <Tag className="w-3.5 h-3.5" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
              <span>Filter by Topic Tags</span>
              {selectedTags.length > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 border border-transparent dark:border-indigo-800">
                  {selectedTags.length} active
                </span>
              )}
            </h3>
          </div>
        </div>

        {/* Controls: Match Mode (AND / OR) + Clear */}
        <div className="flex items-center gap-2 self-end sm:self-auto text-xs">
          {selectedTags.length > 1 && (
            <div className="flex items-center bg-slate-100/90 dark:bg-gray-800/90 backdrop-blur-xs p-0.5 rounded-lg text-[11px]">
              <button
                type="button"
                onClick={() => setTagMatchMode('any')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  tagMatchMode === 'any'
                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
                title="Match notes with any of the selected tags"
              >
                Match ANY (OR)
              </button>
              <button
                type="button"
                onClick={() => setTagMatchMode('all')}
                className={`px-2 py-0.5 rounded-md font-medium transition-all cursor-pointer ${
                  tagMatchMode === 'all'
                    ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-2xs font-semibold'
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
                }`}
                title="Match notes with all of the selected tags"
              >
                Match ALL (AND)
              </button>
            </div>
          )}

          {selectedTags.length > 0 && (
            <button
              type="button"
              onClick={onClearTags}
              className="text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-semibold text-xs flex items-center gap-1 px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-3 h-3" />
              <span>Clear Tags</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Selected Tags Bar */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/60">
          <span className="text-[11px] font-semibold text-indigo-900 dark:text-indigo-200 mr-1 flex items-center gap-1">
            <Filter className="w-3 h-3 text-indigo-600 dark:text-indigo-400" />
            Applied:
          </span>
          {selectedTags.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => onToggleTag(tag)}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-indigo-600 text-white shadow-2xs hover:bg-indigo-700 transition-colors cursor-pointer group"
              title="Click to remove tag filter"
            >
              <span>#{tag}</span>
              <X className="w-3 h-3 text-indigo-200 group-hover:text-white" />
            </button>
          ))}
        </div>
      )}

      {/* Tag Search Input if there are many tags */}
      {availableTagsWithCounts.length > 8 && (
        <div className="relative max-w-xs">
          <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={tagSearchInput}
            onChange={(e) => setTagSearchInput(e.target.value)}
            placeholder="Search tags (e.g. Algorithms, Raft, SVM)..."
            className="w-full text-xs rounded-xl border border-slate-200 dark:border-gray-700 pl-8 pr-3 py-1.5 bg-slate-50/90 dark:bg-gray-800/90 backdrop-blur-xs text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-all"
          />
          {tagSearchInput && (
            <button
              type="button"
              onClick={() => setTagSearchInput('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-gray-400 hover:text-slate-600 dark:hover:text-gray-200"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      )}

      {/* Tag Badges Grid / Cloud */}
      <div className="flex flex-wrap items-center gap-1.5">
        {displayedTags.length === 0 ? (
          <p className="text-xs text-slate-400 dark:text-gray-500 py-1 italic">
            No tags found matching "{tagSearchInput}".
          </p>
        ) : (
          displayedTags.map(({ tag, count }) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => onToggleTag(tag)}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-600 text-white shadow-xs font-semibold'
                    : 'bg-slate-50/90 dark:bg-gray-800/90 backdrop-blur-xs hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-slate-700 dark:text-gray-300 hover:text-indigo-700 dark:hover:text-indigo-300 border border-slate-200/80 dark:border-gray-700 hover:border-indigo-200 dark:hover:border-indigo-700'
                }`}
              >
                <span>#{tag}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    isSelected
                      ? 'bg-white/20 text-white'
                      : 'bg-slate-200 dark:bg-gray-700 text-slate-600 dark:text-gray-300'
                  }`}
                >
                  {count}
                </span>
                {isSelected && <Check className="w-3 h-3 ml-0.5" />}
              </button>
            );
          })
        )}

        {/* Expand / Collapse Button */}
        {filteredTags.length > 10 && !tagSearchInput && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 transition-colors cursor-pointer"
          >
            {isExpanded ? (
              <>
                <span>Show Less</span>
                <ChevronUp className="w-3.5 h-3.5" />
              </>
            ) : (
              <>
                <span>+{filteredTags.length - 10} More Tags</span>
                <ChevronDown className="w-3.5 h-3.5" />
              </>
            )}
          </button>
        )}
      </div>
    </div>
  );
}
