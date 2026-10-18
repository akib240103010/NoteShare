import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  X,
  Check,
  Image as ImageIcon,
  Link as LinkIcon,
  RotateCcw,
  Sun,
  Moon,
  Monitor,
  ExternalLink,
  ChevronRight,
  Info,
  AlertCircle,
} from 'lucide-react';
import { useTheme, DEFAULT_ANIME_WALLPAPER } from '../context/ThemeContext';

/**
 * AnimeThemePicker Component
 *
 * Accessible from the Navbar or ThemeToggle dropdown.
 * - Displays a grid of thumbnail presets for curated anime aesthetic wallpapers.
 * - Provides a custom image link input field with live validation and preview.
 * - Instantly updates background state with smooth CSS transitions.
 * - Includes a prominent 'Default Theme' reset button to switch back to standard solid light/dark backgrounds.
 */
export default function AnimeThemePicker({
  isOpen: controlledIsOpen,
  onClose: controlledOnClose,
  isDropdown = false,
  className = '',
}) {
  const {
    theme,
    resolvedTheme,
    isAnime,
    animeWallpaper,
    wallpapers,
    isAnimePickerOpen,
    closeAnimePicker,
    setAnimeWallpaper,
    resetToDefaultTheme,
    setTheme,
  } = useTheme();

  // Determine if picker is open based on controlled prop or ThemeContext state
  const isOpen = controlledIsOpen !== undefined ? controlledIsOpen : isAnimePickerOpen;
  const handleClose = controlledOnClose || closeAnimePicker;

  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');
  const [isValidatingCustom, setIsValidatingCustom] = useState(false);
  const [customPreviewLoaded, setCustomPreviewLoaded] = useState(false);
  const [showCustomInput, setShowCustomInput] = useState(false);
  const [appliedNotification, setAppliedNotification] = useState('');

  const containerRef = useRef(null);

  // Close when pressing Escape key
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, handleClose]);

  // Close when clicking outside in dropdown mode
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        // Do not close if clicking the trigger button itself
        const isTrigger = e.target.closest('[data-anime-picker-trigger]');
        if (!isTrigger) {
          handleClose();
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('touchstart', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen, handleClose]);

  // Auto-dismiss temporary notification banner
  useEffect(() => {
    if (!appliedNotification) return;
    const timer = setTimeout(() => setAppliedNotification(''), 2500);
    return () => clearTimeout(timer);
  }, [appliedNotification]);

  if (!isOpen) return null;

  // Instant wallpaper update with smooth CSS transition
  const handleSelectWallpaper = (wp) => {
    setAnimeWallpaper(wp.url);
    if (theme !== 'anime') {
      setTheme('anime');
    }
    setAppliedNotification(`Applied: ${wp.name}`);
  };

  // Custom image URL validation with live image preloading to prevent 404 network errors
  const handleApplyCustomUrl = (e) => {
    if (e) e.preventDefault();
    const trimmed = customUrl.trim();

    if (!trimmed) {
      setCustomError('Please enter an image URL');
      return;
    }

    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setCustomError('URL must begin with http:// or https://');
      return;
    }

    setCustomError('');
    setIsValidatingCustom(true);

    // Pre-test image to verify it loads without returning a 404 or network error
    const testImg = new Image();
    let isCancelled = false;

    const timer = setTimeout(() => {
      if (!isCancelled) {
        isCancelled = true;
        setIsValidatingCustom(false);
        setCustomError('Image verification timed out. Please check that the URL points directly to an active image.');
      }
    }, 7000);

    testImg.onload = () => {
      if (isCancelled) return;
      clearTimeout(timer);
      setIsValidatingCustom(false);
      setAnimeWallpaper(trimmed);
      if (theme !== 'anime') {
        setTheme('anime');
      }
      setAppliedNotification('Applied custom anime wallpaper successfully!');
      setCustomUrl('');
      setCustomPreviewLoaded(false);
    };

    testImg.onerror = () => {
      if (isCancelled) return;
      clearTimeout(timer);
      setIsValidatingCustom(false);
      setCustomError('Unable to load image (404 Not Found or unsupported host). Please verify the direct image link.');
    };

    testImg.src = trimmed;
  };

  // Reset to Default Theme (Solid Background)
  const handleResetDefault = (targetMode = 'system') => {
    resetToDefaultTheme(targetMode);
    const label =
      targetMode === 'dark'
        ? 'Solid Dark'
        : targetMode === 'light'
        ? 'Solid Light'
        : 'System Default';
    setAppliedNotification(`Switched to standard ${label} background`);
  };

  const content = (
    <div
      ref={containerRef}
      className={`bg-gray-900 dark:bg-gray-950 border border-gray-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col transition-all duration-200 text-white ${
        isDropdown
          ? 'w-[92vw] sm:w-[480px] md:w-[520px] max-w-[540px] max-h-[85vh] animate-scaleUp'
          : 'w-full max-w-2xl max-h-[90vh] animate-scaleUp'
      } ${className}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="anime-picker-heading"
    >
      {/* Header Bar */}
      <div className="p-4 sm:p-5 border-b border-gray-800 flex items-center justify-between shrink-0 bg-gray-900/90 dark:bg-gray-950/90">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-pink-500 to-rose-500 text-white flex items-center justify-center shadow-md shadow-pink-500/25 shrink-0">
            <Sparkles className="w-5 h-5 animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="anime-picker-heading"
                className="text-base sm:text-lg font-bold text-white tracking-tight"
              >
                Anime Theme Studio
              </h2>
              {isAnime ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-pink-950/80 text-pink-300 border border-pink-500/40">
                  Anime Active
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-gray-800 text-gray-300 border border-gray-700">
                  Solid Theme Active
                </span>
              )}
            </div>
            <p className="text-xs text-gray-300 dark:text-gray-400">
              Personalize with aesthetic anime scenery or custom image
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleClose}
          className="min-h-[44px] min-w-[44px] p-2.5 rounded-xl text-gray-400 hover:text-white hover:bg-gray-800 transition-colors flex items-center justify-center cursor-pointer"
          aria-label="Close anime theme picker"
          title="Close (Esc)"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Temporary Applied Toast inside Picker */}
      {appliedNotification && (
        <div className="px-4 py-2 bg-pink-950/80 border-b border-pink-900/60 flex items-center gap-2 text-xs font-semibold text-pink-300 animate-fadeIn">
          <Check className="w-4 h-4 shrink-0 text-pink-400" />
          <span>{appliedNotification}</span>
        </div>
      )}

      {/* Scrollable Content Body */}
      <div className="p-4 sm:p-5 overflow-y-auto space-y-5 flex-1">
        
        {/* 'Default Theme' Reset Section */}
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gray-900 border border-gray-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
              <RotateCcw className="w-4 h-4" />
            </div>
            <div>
              <div className="text-xs sm:text-sm font-bold text-white flex items-center gap-1.5">
                <span>Standard Solid Themes</span>
                {!isAnime && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500" title="Currently Active" />
                )}
              </div>
              <p className="text-[11px] text-gray-300 dark:text-gray-400">
                Switch back to clean, distraction-free solid light or dark backgrounds
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 self-start sm:self-auto shrink-0">
            {/* Primary Default Theme Button */}
            <button
              type="button"
              onClick={() => handleResetDefault('system')}
              className={`min-h-[44px] px-3.5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs ${
                !isAnime && theme === 'system'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/40'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-200 hover:text-white border border-gray-700'
              }`}
              title="Reset to default system theme (Auto)"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Default Theme</span>
            </button>

            {/* Quick Solid Dark Button */}
            <button
              type="button"
              onClick={() => handleResetDefault('dark')}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                !isAnime && theme === 'dark'
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400/40 border border-indigo-500'
                  : 'bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700'
              }`}
              title="Switch to Solid Dark"
              aria-label="Switch to Solid Dark"
            >
              <Moon className="w-4 h-4 text-indigo-300" />
            </button>

            {/* Quick Solid Light Button */}
            <button
              type="button"
              onClick={() => handleResetDefault('light')}
              className={`min-h-[44px] min-w-[44px] p-2 rounded-xl text-xs font-medium transition-all flex items-center justify-center cursor-pointer ${
                !isAnime && theme === 'light'
                  ? 'bg-amber-500 text-white ring-2 ring-amber-400/40 border border-amber-400'
                  : 'bg-gray-800 hover:bg-gray-700 text-amber-400 hover:text-amber-300 border border-gray-700'
              }`}
              title="Switch to Solid Light"
              aria-label="Switch to Solid Light"
            >
              <Sun className="w-4 h-4 text-amber-400" />
            </button>
          </div>
        </div>

        {/* Preset Anime Wallpapers Grid */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300 dark:text-gray-400 flex items-center gap-1.5">
              <ImageIcon className="w-3.5 h-3.5 text-pink-500" />
              <span>Preset Anime Wallpapers</span>
            </h3>
            <span className="text-[11px] font-medium text-gray-400 dark:text-gray-400">
              {wallpapers.length} curated scenes
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {wallpapers.map((wp) => {
              const isSelected = isAnime && animeWallpaper === wp.url;

              return (
                <button
                  key={wp.id}
                  type="button"
                  onClick={() => handleSelectWallpaper(wp)}
                  className={`group relative rounded-2xl overflow-hidden border-2 text-left transition-all duration-200 cursor-pointer focus:outline-hidden focus-visible:ring-2 focus-visible:ring-pink-500 flex flex-col bg-gray-900 ${
                    isSelected
                      ? 'border-pink-500 ring-2 ring-pink-500/40 shadow-lg shadow-pink-500/20 scale-[1.02]'
                      : 'border-gray-800 hover:border-pink-400/60 dark:hover:border-pink-500/60 hover:shadow-md hover:scale-[1.01]'
                  }`}
                  title={`${wp.name} — ${wp.description}`}
                >
                  {/* Thumbnail Image Container */}
                  <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                    <img
                      src={wp.thumbnail || wp.url}
                      alt={wp.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-108"
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.onerror = null;
                        if (e.currentTarget.src !== wp.url) {
                          e.currentTarget.src = wp.url;
                        } else {
                          e.currentTarget.src = DEFAULT_ANIME_WALLPAPER;
                        }
                      }}
                    />

                    {/* Gradient Overlay for Typography Readability */}
                    <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/25 to-transparent" />

                    {/* Active Selected Checkmark Badge */}
                    {isSelected && (
                      <div className="absolute top-2 right-2 z-10 w-5 h-5 rounded-full bg-pink-500 text-white flex items-center justify-center shadow-md animate-bounce-in">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}

                    {/* Category Tag Pill (e.g. 'Cozy Study', 'Cyberpunk & City') */}
                    <div className="absolute top-2 left-2 z-10">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-black/75 backdrop-blur-xs text-pink-300 border border-pink-500/30 shadow-xs">
                        {wp.category}
                      </span>
                    </div>
                  </div>

                  {/* Card Info & Subtitles */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between bg-gray-900 border-t border-gray-800">
                    <div>
                      <h4 className="text-xs font-medium text-white truncate group-hover:text-pink-300 transition-colors">
                        {wp.name}
                      </h4>
                      <p className="mt-1 text-[11px] text-gray-300 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {wp.description}
                      </p>
                    </div>

                    {/* Helper Note */}
                    <div className="mt-2 pt-1.5 border-t border-gray-800/80 flex items-center justify-between text-[10px]">
                      <span className="text-gray-300 dark:text-gray-400 font-mono">
                        2560 × 1440 HD
                      </span>
                      <span className={`font-semibold ${isSelected ? 'text-pink-400' : 'text-indigo-400 group-hover:underline'}`}>
                        {isSelected ? 'Active' : 'Apply'}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Image Link Option */}
        <div className="pt-3 border-t border-gray-800">
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => setShowCustomInput((prev) => !prev)}
              className="text-xs font-bold uppercase tracking-wider text-white hover:text-pink-300 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <LinkIcon className="w-3.5 h-3.5 text-pink-500" />
              <span>Custom Image Link</span>
              <span className="text-[10px] font-normal text-gray-400 lowercase">
                ({showCustomInput ? 'collapse' : 'expand'})
              </span>
            </button>

            {isAnime && !wallpapers.some((w) => w.url === animeWallpaper) && (
              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-950/80 text-pink-300 border border-pink-500/40">
                Custom Wallpaper Active
              </span>
            )}
          </div>

          {(showCustomInput || !isAnime || !wallpapers.some((w) => w.url === animeWallpaper)) && (
            <form onSubmit={handleApplyCustomUrl} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                    <LinkIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => {
                      setCustomUrl(e.target.value);
                      if (customError) setCustomError('');
                    }}
                    placeholder="https://example.com/anime-wallpaper.jpg"
                    className="w-full min-h-[44px] pl-9.5 pr-8 py-2.5 rounded-xl border text-xs sm:text-sm bg-gray-800 border-gray-700 text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-pink-500 transition-colors"
                  />
                  {customUrl && (
                    <button
                      type="button"
                      onClick={() => setCustomUrl('')}
                      className="absolute inset-y-0 right-0 pr-2.5 flex items-center text-gray-400 hover:text-white cursor-pointer"
                      title="Clear"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={!customUrl.trim() || isValidatingCustom}
                  className="min-h-[44px] px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold bg-linear-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-40 disabled:cursor-not-allowed text-white shadow-sm shadow-pink-500/25 transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  {isValidatingCustom ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                      <span>Verifying...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4" />
                      <span>Apply Custom</span>
                    </>
                  )}
                </button>
              </div>

              {customError && (
                <div className="p-3 rounded-2xl bg-rose-950/60 border border-rose-800/80 text-xs text-rose-200 flex items-start gap-2.5 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-semibold block text-rose-100">Failed to load custom wallpaper</span>
                    <p className="mt-0.5 text-rose-200 leading-relaxed">{customError}</p>
                  </div>
                </div>
              )}

              <p className="text-[11px] text-gray-300 dark:text-gray-400 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                <span>Supports direct links to PNG, JPG, or WebP images from Unsplash, Imgur, etc.</span>
              </p>
            </form>
          )}
        </div>

      </div>

      {/* Footer Note */}
      <div className="p-3.5 sm:p-4 border-t border-gray-800 bg-gray-900/95 dark:bg-gray-950/95 flex items-center justify-between text-xs shrink-0">
        <span className="flex items-center gap-2 text-xs font-medium text-gray-300 dark:text-gray-300">
          <Sparkles className="w-4 h-4 text-pink-400 shrink-0" />
          <span>All wallpapers are layered with a high-contrast dark overlay.</span>
        </span>

        <button
          type="button"
          onClick={handleClose}
          className="min-h-[44px] px-6 py-2 rounded-xl font-bold text-xs bg-white text-gray-950 hover:bg-gray-100 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200 shadow-md transition-all cursor-pointer flex items-center justify-center shrink-0"
        >
          Done
        </button>
      </div>

    </div>
  );

  // If used as a standalone modal (not anchored as a popover dropdown)
  if (!isDropdown) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-xs animate-fadeIn"
        aria-labelledby="anime-picker-heading"
      >
        {content}
      </div>
    );
  }

  // If used in dropdown mode, return content directly so parent anchors it
  return content;
}
