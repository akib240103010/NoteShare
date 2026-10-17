import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

// Curated high-resolution anime aesthetic wallpapers (All verified 100% active and stable)
export const ANIME_WALLPAPERS = [
  {
    id: 'lofi-study',
    name: 'Lo-Fi Study Room',
    category: 'Cozy Study',
    description: 'Cozy study desk with warm lamp glow, open books, and calming rainy window vibes',
    url: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'tokyo-night',
    name: 'Tokyo Night Scene',
    category: 'Cyberpunk & City',
    description: 'Vibrant Tokyo neon night reflections along rainy Shinjuku & Shibuya streets',
    url: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'cherry-blossom',
    name: 'Cherry Blossom Pathway',
    category: 'Sakura Spring',
    description: 'Spring Sakura cherry blossom petals drifting gently across a quiet canal path',
    url: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1522383225653-ed111181a951?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'anime-twilight',
    name: 'Twilight Starry Sky',
    category: 'Shinkai Aesthetic',
    description: 'Dreamy twilight purple skies, celestial sunset clouds, and evening stars',
    url: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'fuji-spring',
    name: 'Mount Fuji Blossom',
    category: 'Ghibli Nature',
    description: 'Scenic snow-capped Mount Fuji framed by vibrant pink cherry blossom branches',
    url: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1490806843957-31f4c9a91c65?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'lantern-alley',
    name: 'Lantern Alleyway',
    category: 'Manga Cafe',
    description: 'Warm glowing traditional paper lanterns in a hidden Kyoto Yokocho stone alley',
    url: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'rainy-cafe',
    name: 'Rainy Shinjuku Cafe',
    category: 'Rainy Vibes',
    description: 'Warm cafe window overlooking rainy Tokyo evening streetlights',
    url: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'sunset-train',
    name: 'Sunset Coastal Horizon',
    category: 'Anime Sunset',
    description: 'Golden hour sunset horizon over coastal railway and serene waters',
    url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'shibuya-neon',
    name: 'Neon Shibuya Crossing',
    category: 'Cyberpunk & City',
    description: 'Iconic bustling Shibuya neon billboards illuminated against the Tokyo evening skyline',
    url: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1542051841857-5f90071e7989?auto=format&fit=crop&w=400&q=80',
  },
  {
    id: 'kyoto-garden',
    name: 'Kyoto Spring Sanctuary',
    category: 'Ghibli Nature',
    description: 'Tranquil Kyoto temple garden surrounded by blossoming pink cherry blossoms and moss',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=2070&q=80',
    thumbnail: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=400&q=80',
  },
];

export const DEFAULT_ANIME_WALLPAPER = ANIME_WALLPAPERS[0].url;

// Solid Anime Aesthetic Gradient Fallback for offline or network image dropouts
export const FALLBACK_ANIME_GRADIENT = 'linear-gradient(135deg, #0b0f19 0%, #1e1b4b 35%, #312e81 65%, #4c1d95 85%, #831843 100%)';

export const ThemeContext = createContext({
  theme: 'system', // 'light' | 'dark' | 'system' | 'anime'
  resolvedTheme: 'light', // 'light' | 'dark'
  isDark: false,
  isAnime: false,
  animeWallpaper: DEFAULT_ANIME_WALLPAPER,
  wallpapers: ANIME_WALLPAPERS,
  isWallpaperModalOpen: false,
  isAnimePickerOpen: false,
  setTheme: () => {},
  toggleTheme: () => {},
  setAnimeWallpaper: () => {},
  resetAnimeWallpaper: () => {},
  resetToDefaultTheme: () => {},
  openAnimePicker: () => {},
  closeAnimePicker: () => {},
  toggleAnimePicker: () => {},
  openWallpaperModal: () => {},
  closeWallpaperModal: () => {},
});

const STORAGE_KEY = 'theme';
const ALT_STORAGE_KEY = 'noteshare_theme';
const WALLPAPER_STORAGE_KEY = 'noteshare_anime_wallpaper';

export function ThemeProvider({ children }) {
  // Theme state: 'light' | 'dark' | 'system' | 'anime'
  const [theme, setThemeState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(ALT_STORAGE_KEY);
        if (stored && ['light', 'dark', 'system', 'anime'].includes(stored)) {
          return stored;
        }
        return 'system';
      } catch {
        return 'system';
      }
    }
    return 'system';
  });

  // Persisted anime wallpaper selection
  const [animeWallpaper, setAnimeWallpaperState] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(WALLPAPER_STORAGE_KEY);
        // Automatically sanitize dead 404 links or non-HTTP values
        if (stored) {
          if (stored.includes('photo-1554797589-7241abc22097') || !stored.startsWith('http')) {
            localStorage.setItem(WALLPAPER_STORAGE_KEY, DEFAULT_ANIME_WALLPAPER);
            return DEFAULT_ANIME_WALLPAPER;
          }
          return stored;
        }
        return DEFAULT_ANIME_WALLPAPER;
      } catch {
        return DEFAULT_ANIME_WALLPAPER;
      }
    }
    return DEFAULT_ANIME_WALLPAPER;
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem(STORAGE_KEY) || localStorage.getItem(ALT_STORAGE_KEY);
        if (stored === 'anime' || stored === 'dark') return 'dark';
        if (stored === 'light') return 'light';
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      } catch {
        return 'light';
      }
    }
    return 'light';
  });

  // Cleanly apply or remove dark/anime/light classes and styles across html and body elements
  const applyTheme = useCallback((mode) => {
    if (typeof window === 'undefined') return;

    const root = document.documentElement;
    const body = document.body;
    let shouldBeDark = false;
    let isAnimeMode = false;

    if (mode === 'anime') {
      shouldBeDark = true;
      isAnimeMode = true;
    } else if (mode === 'dark') {
      shouldBeDark = true;
      isAnimeMode = false;
    } else if (mode === 'light') {
      shouldBeDark = false;
      isAnimeMode = false;
    } else {
      // System mode: evaluate OS media query
      shouldBeDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      isAnimeMode = false;
    }

    if (shouldBeDark) {
      // DARK / ANIME MODE
      root.classList.remove('light');
      root.classList.add('dark');
      root.style.colorScheme = 'dark';

      if (isAnimeMode) {
        root.classList.add('anime-mode');
      } else {
        root.classList.remove('anime-mode');
        root.style.removeProperty('background-image');
        root.style.removeProperty('background');
      }

      if (body) {
        body.classList.remove('light', 'bg-white', 'text-gray-900');
        body.classList.add('dark', 'bg-gray-900', 'text-gray-100');
        body.style.colorScheme = 'dark';
        if (isAnimeMode) {
          body.classList.add('anime-mode');
        } else {
          body.classList.remove('anime-mode');
          body.style.removeProperty('background-image');
          body.style.removeProperty('background');
        }
      }

      setResolvedTheme('dark');
    } else {
      // STRICT LIGHT MODE: Cleanly strip ANY lingering dark or custom anime classes/background styles
      root.classList.remove('dark', 'anime-mode', 'dark-theme', 'anime-theme');
      root.classList.add('light');
      root.style.removeProperty('background-image');
      root.style.removeProperty('background');
      root.style.colorScheme = 'light';

      if (body) {
        body.classList.remove(
          'dark',
          'anime-mode',
          'dark-theme',
          'anime-theme',
          'bg-gray-900',
          'bg-gray-950',
          'text-gray-100',
          'text-gray-150'
        );
        body.classList.add('light', 'bg-white', 'text-gray-900');
        body.style.removeProperty('background-image');
        body.style.removeProperty('background');
        body.style.colorScheme = 'light';
      }

      setResolvedTheme('light');
    }
  }, []);

  const setTheme = useCallback((newTheme) => {
    const validThemes = ['light', 'dark', 'system', 'anime'];
    const target = validThemes.includes(newTheme) ? newTheme : 'system';

    setThemeState(target);

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, target);
        localStorage.setItem(ALT_STORAGE_KEY, target);
        window.dispatchEvent(new Event('themechange'));
      } catch (e) {
        console.warn('Unable to save theme preference in localStorage:', e);
      }
    }

    applyTheme(target);
  }, [applyTheme]);

  // Set anime wallpaper and persist in localStorage
  const setAnimeWallpaper = useCallback((wallpaperUrl) => {
    if (!wallpaperUrl) return;
    setAnimeWallpaperState(wallpaperUrl);
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(WALLPAPER_STORAGE_KEY, wallpaperUrl);
      } catch (e) {
        console.warn('Unable to save anime wallpaper preference in localStorage:', e);
      }
    }
    // Automatically switch to anime theme when a wallpaper is picked
    if (theme !== 'anime') {
      setTheme('anime');
    }
  }, [theme, setTheme]);

  // Reset anime wallpaper to default Lo-Fi Study Room
  const resetAnimeWallpaper = useCallback(() => {
    setAnimeWallpaper(DEFAULT_ANIME_WALLPAPER);
  }, [setAnimeWallpaper]);

  // Anime theme picker open/closed state
  const [isAnimePickerOpen, setIsAnimePickerOpen] = useState(false);

  const openAnimePicker = useCallback(() => setIsAnimePickerOpen(true), []);
  const closeAnimePicker = useCallback(() => setIsAnimePickerOpen(false), []);
  const toggleAnimePicker = useCallback(() => setIsAnimePickerOpen((prev) => !prev), []);

  // Backward compatibility alias for modal state
  const isWallpaperModalOpen = isAnimePickerOpen;
  const openWallpaperModal = openAnimePicker;
  const closeWallpaperModal = closeAnimePicker;

  // Reset to default standard solid light/dark theme
  const resetToDefaultTheme = useCallback((targetTheme = 'light') => {
    setTheme(targetTheme);
  }, [setTheme]);

  const toggleTheme = useCallback(() => {
    setTheme((prev) => {
      if (prev === 'light') return 'dark';
      if (prev === 'dark') return 'anime';
      if (prev === 'anime') return 'light';
      return resolvedTheme === 'dark' ? 'light' : 'dark';
    });
  }, [resolvedTheme, setTheme]);

  // Handle initial apply, dynamic system preference changes, and cross-tab sync
  useEffect(() => {
    applyTheme(theme);

    // Cross-tab theme sync listener
    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEY || e.key === ALT_STORAGE_KEY) {
        const updated = e.newValue || 'system';
        setThemeState(updated);
        applyTheme(updated);
      }
    };
    window.addEventListener('storage', handleStorageChange);

    // System preference change listener
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = () => {
      if (theme === 'system') {
        applyTheme('system');
      }
    };

    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleSystemChange);
    } else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleSystemChange);
    }

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      if (mediaQuery.removeEventListener) {
        mediaQuery.removeEventListener('change', handleSystemChange);
      } else if (mediaQuery.removeListener) {
        mediaQuery.removeListener(handleSystemChange);
      }
    };
  }, [theme, applyTheme]);

  const isAnime = theme === 'anime';
  const isDark = resolvedTheme === 'dark' || isAnime;

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        isDark,
        isAnime,
        animeWallpaper,
        wallpapers: ANIME_WALLPAPERS,
        isWallpaperModalOpen,
        isAnimePickerOpen,
        setTheme,
        toggleTheme,
        setAnimeWallpaper,
        resetAnimeWallpaper,
        resetToDefaultTheme,
        openAnimePicker,
        closeAnimePicker,
        toggleAnimePicker,
        openWallpaperModal,
        closeWallpaperModal,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
