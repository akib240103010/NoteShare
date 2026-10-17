import React, { useState, useRef, useEffect } from 'react';
import {
  Sun,
  Moon,
  Monitor,
  Sparkles,
  ChevronDown,
  Check,
} from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

/**
 * ThemeToggle Component
 *
 * Consolidates standard theme controls (Light, Dark, System, and standard theme dropdown)
 * alongside the single clean 'Anime Themes' button as the sole entry point for the Anime Theme Studio.
 */
export default function ThemeToggle({
  className = '',
  showLabels = false,
  size = 'md',
  variant = 'consolidated', // 'consolidated' | 'group'
}) {
  const {
    theme,
    resolvedTheme,
    isAnime,
    setTheme,
    openAnimePicker,
  } = useTheme();

  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdown on click outside or Escape
  useEffect(() => {
    if (!isDropdownOpen) return;

    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsDropdownOpen(false);
      }
    };

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isDropdownOpen]);

  const standardThemes = [
    {
      id: 'light',
      label: 'Light',
      title: 'Light mode',
      icon: Sun,
      color: 'text-amber-500',
      activeBg: 'bg-white text-amber-600 shadow-xs font-bold',
    },
    {
      id: 'dark',
      label: 'Dark',
      title: 'Dark mode',
      icon: Moon,
      color: 'text-indigo-400',
      activeBg: 'bg-gray-900 text-indigo-400 dark:bg-gray-700 dark:text-indigo-300 shadow-xs font-bold',
    },
    {
      id: 'system',
      label: 'Auto',
      title: `System default (${resolvedTheme === 'dark' ? 'Dark active' : 'Light active'})`,
      icon: Monitor,
      color: 'text-indigo-600 dark:text-indigo-400',
      activeBg: 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold',
    },
  ];

  const currentStandard = standardThemes.find((s) => s.id === theme) || {
    id: 'system',
    label: resolvedTheme === 'dark' ? 'Dark (Auto)' : 'Light (Auto)',
    icon: Monitor,
    color: 'text-indigo-500',
  };

  const CurrentStandardIcon = currentStandard.icon;

  // =========================================================================
  // VARIANT 1: INLINE SEGMENTED BUTTON GROUP (FOR MOBILE DRAWER)
  // =========================================================================
  if (variant === 'group') {
    return (
      <div
        role="group"
        aria-label="Standard theme selector"
        className={`inline-flex items-center bg-slate-100 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700 rounded-xl p-1 gap-1 select-none ${className}`}
      >
        {standardThemes.map((opt) => {
          const Icon = opt.icon;
          const isActive = !isAnime && theme === opt.id;

          return (
            <button
              key={opt.id}
              type="button"
              onClick={() => setTheme(opt.id)}
              aria-pressed={isActive}
              className={`min-h-[38px] px-2.5 py-1 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                isActive
                  ? 'bg-white dark:bg-gray-700 text-indigo-600 dark:text-indigo-400 shadow-xs font-bold'
                  : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${opt.color}`} />
              {showLabels && <span>{opt.label}</span>}
            </button>
          );
        })}
      </div>
    );
  }

  // =========================================================================
  // VARIANT 2: CONSOLIDATED NAVBAR THEME CONTROLS
  // Combines: [ Light, Dark, System, & Standard Theme Dropdown ] alongside [ Single 'Anime Themes' Button ]
  // =========================================================================
  return (
    <div
      ref={dropdownRef}
      className={`relative inline-flex items-center gap-1 sm:gap-1.5 p-1 rounded-2xl bg-slate-100/90 dark:bg-gray-800/90 border border-slate-200/80 dark:border-gray-700 shadow-2xs select-none ${className}`}
    >
      {/* 1. Standard Theme Toggle Controls (Light, Dark, System) */}
      <div
        role="group"
        aria-label="Standard Theme Controls"
        className="hidden 2xl:inline-flex items-center gap-0.5"
      >
        {standardThemes.map((opt) => {
          const Icon = opt.icon;
          const isActive = !isAnime && theme === opt.id;

          return (
            <div key={opt.id} className="relative group">
              <button
                type="button"
                onClick={() => setTheme(opt.id)}
                aria-pressed={isActive}
                aria-label={opt.title}
                className={`min-h-[36px] min-w-[36px] p-2 rounded-xl text-xs font-medium transition-all duration-200 flex items-center justify-center cursor-pointer hover:scale-105 active:scale-95 ${
                  isActive
                    ? opt.activeBg
                    : 'text-slate-500 dark:text-gray-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-200/60 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className={`w-4 h-4 ${opt.color}`} />
              </button>

              {/* Smooth Hover Tooltip */}
              <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200 animate-fadeIn">
                <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-gray-800 rotate-45 -mb-1" />
                <div className="px-2 py-1 rounded-lg bg-slate-900 dark:bg-gray-800 text-white text-[10px] font-semibold shadow-lg whitespace-nowrap border border-slate-700/50">
                  {opt.label} Mode
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Standard Theme Dropdown on compact viewports (< 2xl) */}
      <div className="2xl:hidden relative">
        <button
          type="button"
          onClick={() => setIsDropdownOpen((prev) => !prev)}
          className={`min-h-[36px] px-2 py-1 rounded-xl text-xs font-semibold flex items-center gap-1 transition-all cursor-pointer ${
            !isAnime
              ? 'bg-white dark:bg-gray-700 text-slate-800 dark:text-white shadow-xs'
              : 'text-slate-600 dark:text-gray-400 hover:bg-slate-200/60 dark:hover:bg-gray-700'
          }`}
          title="Select standard theme (Light, Dark, Auto)"
          aria-label="Select standard theme"
        >
          <CurrentStandardIcon className={`w-4 h-4 ${currentStandard.color}`} />
          <ChevronDown className="w-3 h-3 text-slate-400" />
        </button>
      </div>

      {/* Standard Theme Dropdown Menu Popover */}
      {isDropdownOpen && (
        <div className="absolute left-0 top-full mt-2 w-48 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-gray-800 shadow-xl p-1.5 z-50 text-gray-900 dark:text-gray-100 animate-scaleUp">
          <div className="px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500">
            Standard Themes
          </div>
          {standardThemes.map((opt) => {
            const Icon = opt.icon;
            const isSelected = !isAnime && theme === opt.id;

            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  setTheme(opt.id);
                  setIsDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-xl text-xs font-medium transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                    : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Icon className={`w-4 h-4 ${opt.color}`} />
                  <span>{opt.label}</span>
                </div>
                {isSelected && <Check className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />}
              </button>
            );
          })}
        </div>
      )}

      {/* Subtle Vertical Divider */}
      <div className="w-px h-5 bg-slate-300/80 dark:bg-gray-700 shrink-0" />

      {/* 2. Single Consolidated 'Anime Themes' Entry Point Button */}
      <div className="relative group shrink-0">
        <button
          type="button"
          onClick={() => {
            if (theme !== 'anime') setTheme('anime');
            openAnimePicker();
          }}
          className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer shrink-0 ${
            isAnime
              ? 'bg-linear-to-r from-pink-500 to-rose-500 text-white shadow-xs font-bold ring-2 ring-pink-500/20'
              : 'text-slate-700 dark:text-gray-300 hover:text-pink-600 dark:hover:text-pink-400 hover:bg-pink-50/70 dark:hover:bg-pink-950/40'
          }`}
          aria-label="Open Anime Theme Studio"
        >
          <Sparkles
            className={`w-3.5 h-3.5 shrink-0 ${
              isAnime ? 'animate-pulse text-white' : 'text-pink-500'
            }`}
          />
          <span className="hidden 2xl:inline">Anime Themes</span>
        </button>

        {/* Smooth Hover Tooltip */}
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200 animate-fadeIn">
          <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-gray-800 rotate-45 -mb-1" />
          <div className="px-2 py-1 rounded-lg bg-slate-900 dark:bg-gray-800 text-white text-[10px] font-semibold shadow-lg whitespace-nowrap border border-slate-700/50">
            Anime Theme Studio (Wallpapers)
          </div>
        </div>
      </div>
    </div>
  );
}
