import React from 'react';
import {
  Layers,
  Cpu,
  Pi,
  Atom,
  Wrench,
  Stethoscope,
  TrendingUp,
  LayoutGrid,
  List,
  SlidersHorizontal,
  RotateCcw,
  GraduationCap,
} from 'lucide-react';
import { CATEGORIES, RESOURCE_TYPES, UNIVERSITIES } from '../data/initialNotes';

const CATEGORY_ICONS = {
  'All Categories': <Layers className="w-4 h-4" />,
  'Computer Science': <Cpu className="w-4 h-4" />,
  'Mathematics': <Pi className="w-4 h-4" />,
  'Physics': <Atom className="w-4 h-4" />,
  'Engineering': <Wrench className="w-4 h-4" />,
  'Medicine & Biology': <Stethoscope className="w-4 h-4" />,
  'Economics & Business': <TrendingUp className="w-4 h-4" />,
};

export default function CategoryFilters({
  selectedCategory,
  setSelectedCategory,
  selectedResourceType,
  setSelectedResourceType,
  selectedUniversity,
  setSelectedUniversity,
  sortBy,
  setSortBy,
  viewMode,
  setViewMode,
  countsByCategory,
  onResetFilters,
  hasActiveFilters,
  availableUniversities = UNIVERSITIES,
  onRefresh,
  isRefreshing = false,
}) {
  return (
    <div className="space-y-4">
      {/* Primary Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none scroll-smooth -mx-3 px-3 sm:mx-0 sm:px-0">
        {CATEGORIES.map((cat) => {
          const isSelected = selectedCategory === cat;
          const count = countsByCategory[cat] ?? 0;
          const icon = CATEGORY_ICONS[cat] || <Layers className="w-4 h-4" />;

          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`shrink-0 inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/20 font-semibold'
                  : 'bg-white/90 dark:bg-gray-800/90 backdrop-blur-md text-slate-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-50 dark:hover:bg-gray-700 border border-slate-200/90 dark:border-gray-700 shadow-2xs'
              }`}
            >
              <span className={isSelected ? 'text-white' : 'text-slate-500 dark:text-gray-400'}>
                {icon}
              </span>
              <span>{cat}</span>
              <span
                className={`text-[11px] px-1.5 py-0.2 rounded-full font-semibold ${
                  isSelected
                    ? 'bg-white/20 text-white'
                    : 'bg-slate-100/90 dark:bg-gray-700/90 text-slate-500 dark:text-gray-300'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Secondary Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white/90 dark:bg-gray-900/90 backdrop-blur-md p-3 rounded-2xl border border-slate-200/80 dark:border-gray-800 shadow-2xs">
        
        {/* Left: Resource Type, University, and Sort Filter */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 dark:text-gray-400 pl-1">
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
            <span>Filter:</span>
          </div>

          {/* Resource Type Dropdown */}
          <select
            value={selectedResourceType}
            onChange={(e) => setSelectedResourceType(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50/90 dark:bg-gray-800/90 backdrop-blur-xs hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium transition-colors cursor-pointer"
          >
            {RESOURCE_TYPES.map((type) => (
              <option key={type} value={type} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {type}
              </option>
            ))}
          </select>

          {/* Global University Dropdown */}
          <select
            value={selectedUniversity}
            onChange={(e) => setSelectedUniversity(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50/90 dark:bg-gray-800/90 backdrop-blur-xs hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium transition-colors cursor-pointer max-w-[170px] truncate"
          >
            <option value="All Universities" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">All Universities</option>
            {availableUniversities.map((uni) => (
              <option key={uni} value={uni} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                {uni}
              </option>
            ))}
          </select>

          {/* Sort By Dropdown */}
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="text-xs sm:text-sm bg-slate-50/90 dark:bg-gray-800/90 backdrop-blur-xs hover:bg-slate-100 dark:hover:bg-gray-700 border border-slate-200 dark:border-gray-700 text-gray-900 dark:text-gray-100 rounded-lg px-2.5 py-1.5 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 font-medium transition-colors cursor-pointer"
          >
            <option value="popular" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Most Popular (Downloads)</option>
            <option value="rating" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Highest Rated</option>
            <option value="newest" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Recently Uploaded</option>
            <option value="title" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Alphabetical (A - Z)</option>
          </select>

          {/* Reset Filters button if any active */}
          {hasActiveFilters && (
            <button
              onClick={onResetFilters}
              className="inline-flex items-center gap-1 text-xs text-rose-600 dark:text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 font-medium px-2 py-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer"
              title="Reset all filters"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset</span>
            </button>
          )}

          {/* Cloud Sync / Refresh live notes button */}
          {onRefresh && (
            <button
              type="button"
              onClick={onRefresh}
              disabled={isRefreshing}
              className="inline-flex items-center gap-1.5 text-xs text-slate-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold px-2.5 py-1.5 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-lg transition-colors cursor-pointer border border-slate-200/80 dark:border-gray-700 disabled:opacity-50"
              title="Sync live notes from Supabase cloud"
              aria-label="Sync notes"
            >
              <RotateCcw className={`w-3.5 h-3.5 text-indigo-500 ${isRefreshing ? 'animate-spin' : ''}`} />
              <span className="hidden xs:inline">{isRefreshing ? 'Syncing...' : 'Sync'}</span>
            </button>
          )}
        </div>

        {/* Right: Layout Switcher (Grid vs. List) */}
        <div className="flex items-center justify-end gap-1 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100 dark:border-gray-800">
          <span className="text-xs text-slate-400 dark:text-gray-500 mr-1.5 hidden sm:inline">View:</span>
          <div className="inline-flex p-1 bg-slate-100/90 dark:bg-gray-800/90 backdrop-blur-xs rounded-xl">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
              }`}
              title="Grid View"
              aria-label="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                viewMode === 'list'
                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200'
              }`}
              title="List View"
              aria-label="List View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
