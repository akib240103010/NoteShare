import React, { useState, useEffect, useContext, Component } from 'react';
import {
  ThemeContext,
  DEFAULT_ANIME_WALLPAPER,
  FALLBACK_ANIME_GRADIENT,
} from '../context/ThemeContext';

/**
 * Local Error Boundary to catch any rendering issues, hook misfires,
 * or wallpaper loading crashes gracefully without blank-screening the app.
 */
export class AnimeErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.warn(
      '[NoteShare] AnimeBackground encountered an error and fell back gracefully:',
      error,
      errorInfo
    );
  }

  render() {
    if (this.state.hasError) {
      // Safe aesthetic gradient fallback so the student still sees nice styling without crashes
      return (
        <div
          className="fixed inset-0 pointer-events-none z-0"
          aria-hidden="true"
        >
          <div
            className="absolute inset-0 bg-slate-950"
            style={{ background: FALLBACK_ANIME_GRADIENT }}
          />
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        </div>
      );
    }
    return this.props.children;
  }
}

/**
 * Internal Anime Wallpaper Renderer with strict top-level hook placement.
 */
function AnimeBackgroundRenderer() {
  // Top-level Hook 1: Safe Context Reading (never throws even if provider is unmounting)
  const theme = useContext(ThemeContext);
  const isAnime = Boolean(theme?.isAnime);
  const animeWallpaper = theme?.animeWallpaper || DEFAULT_ANIME_WALLPAPER;

  // Top-level Hook 2: State for active wallpaper URL
  const [activeUrl, setActiveUrl] = useState(() => animeWallpaper);

  // Top-level Hook 3: Image load completion state
  const [isLoaded, setIsLoaded] = useState(false);

  // Top-level Hook 4: Error flag for image network/404 failures
  const [hasError, setHasError] = useState(false);

  // Top-level Hook 5: Image preloader effect
  useEffect(() => {
    if (!isAnime || !animeWallpaper) {
      setIsLoaded(false);
      setHasError(false);
      return;
    }

    let isCurrent = true;
    setIsLoaded(false);
    setHasError(false);

    try {
      const img = new Image();
      img.src = animeWallpaper;

      img.onload = () => {
        if (!isCurrent) return;
        setActiveUrl(animeWallpaper);
        setIsLoaded(true);
        setHasError(false);
      };

      img.onerror = () => {
        if (!isCurrent) return;
        console.warn(
          `[NoteShare] Wallpaper failed to load: ${animeWallpaper}. Gracefully falling back to default theme.`
        );
        setHasError(true);
        setActiveUrl(DEFAULT_ANIME_WALLPAPER);
        setIsLoaded(true);
      };
    } catch (err) {
      console.warn('[NoteShare] Image preloader error:', err);
      if (isCurrent) {
        setHasError(true);
        setActiveUrl(DEFAULT_ANIME_WALLPAPER);
        setIsLoaded(true);
      }
    }

    return () => {
      isCurrent = false;
    };
  }, [isAnime, animeWallpaper]);

  // Conditional rendering occurs strictly AFTER all hooks have executed
  if (!isAnime) return null;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 transition-opacity duration-700 ease-in-out opacity-100"
      aria-hidden="true"
    >
      {/* 1. Base Anime Aesthetic Gradient (Always visible as solid fallback) */}
      <div
        className="absolute inset-0 bg-slate-950"
        style={{
          background: FALLBACK_ANIME_GRADIENT,
        }}
      />

      {/* 2. Dynamic Anime Wallpaper Image with Smooth Fade Transition */}
      {activeUrl && !hasError && (
        <div
          key={activeUrl}
          style={{ backgroundImage: `url("${activeUrl}")` }}
          className={`absolute inset-0 bg-cover bg-center bg-fixed transition-opacity duration-700 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          } animate-wallpaper-fade`}
        />
      )}

      {/* 3. Contrast Overlay with subtle backdrop blur for optimal text contrast */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
    </div>
  );
}

/**
 * Public AnimeBackground Component wrapped in an Error Boundary
 */
export default function AnimeBackground() {
  return (
    <AnimeErrorBoundary>
      <AnimeBackgroundRenderer />
    </AnimeErrorBoundary>
  );
}
