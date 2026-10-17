import React, { useState } from 'react';
import {
  Sparkles,
  X,
  Check,
  Image as ImageIcon,
  ExternalLink,
  RotateCcw,
  Palette,
  Eye,
  Layers,
  Heart,
  AlertCircle,
} from 'lucide-react';
import { useTheme, DEFAULT_ANIME_WALLPAPER } from '../context/ThemeContext';

export default function AnimeWallpaperModal() {
  const {
    theme,
    isAnime,
    animeWallpaper,
    wallpapers,
    isWallpaperModalOpen,
    closeWallpaperModal,
    setAnimeWallpaper,
    resetAnimeWallpaper,
    setTheme,
  } = useTheme();

  const [customUrl, setCustomUrl] = useState('');
  const [customError, setCustomError] = useState('');
  const [isValidatingCustom, setIsValidatingCustom] = useState(false);
  const [previewCustom, setPreviewCustom] = useState(false);

  if (!isWallpaperModalOpen) return null;

  const handleSelectWallpaper = (url) => {
    setAnimeWallpaper(url);
    if (theme !== 'anime') {
      setTheme('anime');
    }
  };

  const handleApplyCustom = (e) => {
    e.preventDefault();
    const trimmed = customUrl.trim();
    if (!trimmed) {
      setCustomError('Please enter a valid image URL');
      return;
    }
    if (!trimmed.startsWith('http://') && !trimmed.startsWith('https://')) {
      setCustomError('URL must start with http:// or https://');
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
      setCustomUrl('');
      setPreviewCustom(false);
    };

    testImg.onerror = () => {
      if (isCancelled) return;
      clearTimeout(timer);
      setIsValidatingCustom(false);
      setCustomError('Unable to load image (404 Not Found or unsupported host). Please verify the direct image link.');
    };

    testImg.src = trimmed;
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-fadeIn"
      onClick={closeWallpaperModal}
    >
      <div
        className="bg-gray-900 dark:bg-gray-950 border border-gray-800 w-full max-w-4xl rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-scaleUp text-white"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-pink-600 via-purple-600 to-indigo-700 text-white flex items-center justify-between border-b border-pink-500/30 relative overflow-hidden shrink-0">
          <div className="flex items-center gap-3 relative z-10">
            <div className="w-11 h-11 rounded-2xl bg-white/20 backdrop-blur-md text-white border border-white/30 flex items-center justify-center shadow-md shrink-0">
              <Sparkles className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg sm:text-xl font-extrabold tracking-tight">
                  Anime Aesthetic Wallpaper Studio
                </h3>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-white/20 text-white uppercase tracking-wider">
                  HD 4K
                </span>
              </div>
              <p className="text-xs text-pink-100/90 mt-0.5">
                Select a high-resolution anime aesthetic backdrop or paste a custom wallpaper URL
              </p>
            </div>
          </div>

          <button
            onClick={closeWallpaperModal}
            className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl text-white/80 hover:text-white hover:bg-white/20 transition-colors cursor-pointer relative z-10 shrink-0"
            title="Close Wallpaper Studio"
            aria-label="Close Wallpaper Studio"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Decorative glowing gradient blur */}
          <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* Content Body */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-6 flex-1">
          
          {/* Mode Switch Notice */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-gray-850 dark:bg-gray-900/90 border border-gray-800 text-xs text-gray-300">
            <div className="flex items-center gap-2">
              <Palette className="w-4 h-4 text-pink-400 shrink-0" />
              <span>
                Current Theme:{' '}
                <strong className="capitalize text-pink-300">
                  {theme === 'anime' ? 'Anime Aesthetic Mode (Active)' : `${theme} Mode`}
                </strong>
              </span>
            </div>
            {theme !== 'anime' && (
              <button
                type="button"
                onClick={() => setTheme('anime')}
                className="min-h-[36px] px-3.5 py-1.5 rounded-xl bg-pink-600 hover:bg-pink-700 text-white font-semibold transition-all cursor-pointer shadow-xs shrink-0 flex items-center gap-1.5"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Switch to Anime Mode</span>
              </button>
            )}
          </div>

          {/* Section 1: Curated Wallpapers Grid */}
          <div>
            <div className="flex items-center justify-between mb-3.5">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-pink-400" />
                <h4 className="text-sm font-bold text-white">
                  Curated Anime Wallpapers
                </h4>
              </div>
              <span className="text-xs text-gray-300 dark:text-gray-400">
                {wallpapers.length} high-res wallpapers
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {wallpapers.map((wp) => {
                const isSelected = isAnime && animeWallpaper === wp.url;

                return (
                  <div
                    key={wp.id}
                    onClick={() => handleSelectWallpaper(wp.url)}
                    className={`group relative rounded-2xl overflow-hidden border-2 transition-all cursor-pointer flex flex-col bg-gray-850 dark:bg-gray-900 text-left ${
                      isSelected
                        ? 'border-pink-500 ring-4 ring-pink-500/20 shadow-lg shadow-pink-500/10 scale-[1.01]'
                        : 'border-gray-800 hover:border-pink-500/60 hover:shadow-md'
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="relative aspect-video w-full overflow-hidden bg-slate-950">
                      <img
                        src={wp.thumbnail || wp.url}
                        alt={wp.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
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
                      <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent" />
                      
                      {/* Category Badge */}
                      <span className="absolute top-2 left-2 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-xs text-pink-300 border border-pink-500/30">
                        {wp.category}
                      </span>

                      {/* Active Checkmark Pill */}
                      {isSelected && (
                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-pink-600 text-white shadow-md animate-bounce-in">
                          <Check className="w-3 h-3" />
                          <span>Active</span>
                        </span>
                      )}

                      {/* Title on Image */}
                      <div className="absolute bottom-2 left-2 right-2">
                        <h5 className="text-xs font-medium text-white truncate drop-shadow-sm">
                          {wp.name}
                        </h5>
                      </div>
                    </div>

                    {/* Card Info */}
                    <div className="p-3 flex-1 flex flex-col justify-between bg-gray-850 dark:bg-gray-900 border-t border-gray-800">
                      <p className="text-[11px] text-gray-300 dark:text-gray-400 line-clamp-2 leading-relaxed">
                        {wp.description}
                      </p>
                      
                      <div className="mt-2.5 pt-2 border-t border-gray-800 flex items-center justify-between text-[11px]">
                        <span className="text-gray-300 dark:text-gray-400 font-mono text-[10px]">
                          2560 × 1440 HD
                        </span>
                        <span className={`font-semibold text-xs ${isSelected ? 'text-pink-400' : 'text-indigo-400 group-hover:underline'}`}>
                          {isSelected ? 'Applied' : 'Click to Apply'}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 2: Custom Wallpaper URL Input */}
          <div className="p-4 sm:p-5 rounded-2xl bg-gray-850 dark:bg-gray-900/90 border border-gray-800">
            <div className="flex items-center gap-2 mb-2">
              <ExternalLink className="w-4 h-4 text-purple-400" />
              <h4 className="text-sm font-bold text-white">
                Custom Wallpaper URL
              </h4>
            </div>
            <p className="text-xs text-gray-300 dark:text-gray-400 mb-3">
              Prefer your own anime or Lo-Fi artwork? Paste a direct image link (Unsplash, Imgur, Pinterest, etc.) below.
            </p>

            <form onSubmit={handleApplyCustom} className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="url"
                  value={customUrl}
                  onChange={(e) => {
                    setCustomUrl(e.target.value);
                    if (customError) setCustomError('');
                  }}
                  placeholder="https://images.unsplash.com/... or your custom wallpaper URL"
                  className="flex-1 min-h-[44px] text-xs sm:text-sm rounded-xl border border-gray-700 px-3.5 py-2.5 bg-gray-800 text-white placeholder-gray-400 focus:outline-hidden focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 font-mono"
                />

                <div className="flex items-center gap-2">
                  {customUrl.trim() && (
                    <button
                      type="button"
                      onClick={() => setPreviewCustom(!previewCustom)}
                      className="min-h-[44px] px-3.5 py-2 rounded-xl border border-gray-700 bg-gray-800 hover:bg-gray-750 text-gray-200 text-xs font-semibold transition-colors cursor-pointer flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-4 h-4" />
                      <span>{previewCustom ? 'Hide Preview' : 'Preview'}</span>
                    </button>
                  )}

                  <button
                    type="submit"
                    disabled={!customUrl.trim() || isValidatingCustom}
                    className="min-h-[44px] px-5 py-2 rounded-xl bg-linear-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-md shadow-purple-500/20 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
                  >
                    {isValidatingCustom ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                        <span>Verifying...</span>
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Apply Custom</span>
                      </>
                    )}
                  </button>
                </div>
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

              {previewCustom && customUrl.trim() && (
                <div className="mt-3 p-2 rounded-xl bg-slate-950 border border-gray-700 overflow-hidden">
                  <div className="text-[11px] text-gray-400 mb-1.5 font-mono px-1">
                    Image Preview:
                  </div>
                  <img
                    src={customUrl.trim()}
                    alt="Custom Wallpaper Preview"
                    onError={() => setCustomError('Failed to load image from this URL. Please verify the link is accessible.')}
                    className="max-h-48 w-full object-cover rounded-lg border border-gray-800"
                  />
                </div>
              )}
            </form>
          </div>

        </div>

        {/* Modal Footer with Actions */}
        <div className="p-4 sm:p-5 border-t border-gray-800 bg-gray-900/95 dark:bg-gray-950/95 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
          <button
            type="button"
            onClick={resetAnimeWallpaper}
            className="min-h-[44px] text-xs font-semibold text-gray-300 hover:text-white transition-colors cursor-pointer flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset to Default (Lo-Fi Study Room)</span>
          </button>

          <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={closeWallpaperModal}
              className="min-h-[44px] px-6 py-2 rounded-xl bg-white hover:bg-gray-100 text-gray-950 text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center"
            >
              Done & Explore Notes
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
