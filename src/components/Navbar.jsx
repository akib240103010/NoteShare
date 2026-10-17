import React, { useState, useEffect, useRef } from 'react';
import {
  GraduationCap,
  UploadCloud,
  Bookmark,
  Search,
  Menu,
  X,
  Sparkles,
  BookOpen,
  User,
  LogOut,
  Database,
  LogIn,
  Layers,
  ChevronDown,
  ShieldCheck,
  Cpu,
  Pi,
  Atom,
  Wrench,
  Stethoscope,
  TrendingUp,
  FlaskConical,
  BookMarked,
  WifiOff,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import OfflineBanner from './OfflineBanner';
import ThemeToggle from './ThemeToggle';
import { CATEGORIES } from '../data/initialNotes';

const CATEGORY_ICONS = {
  'All Categories': <Layers className="w-4 h-4 text-slate-500 dark:text-gray-400" />,
  'Computer Science': <Cpu className="w-4 h-4 text-blue-500" />,
  'Mathematics': <Pi className="w-4 h-4 text-purple-500" />,
  'Physics': <Atom className="w-4 h-4 text-cyan-500" />,
  'Engineering': <Wrench className="w-4 h-4 text-amber-500" />,
  'Medicine & Biology': <Stethoscope className="w-4 h-4 text-emerald-500" />,
  'Chemistry': <FlaskConical className="w-4 h-4 text-teal-500" />,
  'History & Humanities': <BookMarked className="w-4 h-4 text-orange-500" />,
  'Economics & Business': <TrendingUp className="w-4 h-4 text-rose-500" />,
};

export default function Navbar({
  currentView,
  setCurrentView,
  bookmarksCount,
  isBookmarksOpen = false,
  onOpenBookmarks,
  onFocusSearch,
  onOpenAuth,
  onOpenProfile,
  onOpenConfig,
  selectedCategory = 'All Categories',
  onSelectCategory,
  onOfflineActionAttempt,
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [categoriesDropdownOpen, setCategoriesDropdownOpen] = useState(false);
  const [drawerCategoriesOpen, setDrawerCategoriesOpen] = useState(true);

  const { user, profile, logout, isConfigured } = useAuth();
  const { openAnimePicker } = useTheme();
  const { isOnline } = useNetwork();
  const dropdownRef = useRef(null);

  // Close desktop categories dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCategoriesDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close mobile drawer on Escape key and prevent background body scrolling
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && drawerOpen) {
        setDrawerOpen(false);
      }
    };

    if (drawerOpen) {
      document.body.style.overflow = 'hidden';
      window.addEventListener('keydown', handleKeyDown);
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [drawerOpen]);

  const handleCategoryClick = (cat) => {
    if (onSelectCategory) {
      onSelectCategory(cat);
    }
    setCategoriesDropdownOpen(false);
    setDrawerOpen(false);
  };

  const handleNavigateHome = () => {
    setCurrentView('home');
    if (onSelectCategory && selectedCategory !== 'All Categories') {
      onSelectCategory('All Categories');
    }
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNavigateUpload = () => {
    if (!isOnline) {
      if (onOfflineActionAttempt) {
        onOfflineActionAttempt('Uploading new notes requires an active internet connection. Please reconnect to publish notes.');
      }
      return;
    }
    setCurrentView('upload');
    setDrawerOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Active state calculations for navigation tabs
  const isBrowseActive = currentView === 'home' && !isBookmarksOpen && selectedCategory === 'All Categories';
  const isCategoriesActive = selectedCategory !== 'All Categories' || categoriesDropdownOpen;
  const isSavedActive = Boolean(isBookmarksOpen);

  return (
    <>
      {/* ===================================================================== */}
      {/* STICKY GLASSMORPHISM HEADER (DESKTOP & TABLET/MOBILE TASKBAR)          */}
      {/* ===================================================================== */}
      <header className="sticky top-0 z-50 w-full backdrop-blur-md bg-white/80 dark:bg-gray-950/80 border-b border-gray-200/20 dark:border-gray-800/50 shadow-xs transition-colors duration-300">
        {/* Offline Banner when disconnected */}
        <OfflineBanner />

        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16 gap-2">
            
            {/* Interactive Brand Logo with Scale-on-Hover & Click-to-Reset Home */}
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={handleNavigateHome}
                className="group flex items-center gap-2.5 text-left focus:outline-hidden cursor-pointer transition-transform duration-200 hover:scale-[1.02] active:scale-95"
                title="NoteShare — Click to return to Home"
              >
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-linear-to-tr from-indigo-600 via-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20 group-hover:shadow-indigo-500/35 group-hover:scale-105 group-hover:rotate-1 transition-all duration-200 shrink-0">
                  <GraduationCap className="w-5 h-5 sm:w-6 sm:h-6 transition-transform group-hover:scale-110" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-lg sm:text-xl font-bold tracking-tight bg-linear-to-r from-slate-950 dark:from-white via-slate-900 dark:via-gray-150 to-indigo-950 dark:to-indigo-300 bg-clip-text text-transparent group-hover:from-indigo-600 group-hover:to-violet-600 dark:group-hover:from-indigo-400 dark:group-hover:to-violet-400 transition-colors">
                      NoteShare
                    </span>
                    <span className="hidden sm:inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200/60 dark:border-indigo-800/60 group-hover:border-indigo-400 transition-colors">
                      <Sparkles className="w-2.5 h-2.5 mr-0.5 text-indigo-500 animate-pulse" />
                      Global
                    </span>
                  </div>
                  <p className="hidden 2xl:block text-[11px] text-slate-500 dark:text-gray-400 font-medium -mt-0.5 truncate group-hover:text-indigo-600/80 dark:group-hover:text-indigo-400/80 transition-colors">
                    Student Knowledge Exchange
                  </p>
                </div>
              </button>
            </div>

            {/* Desktop Navigation Links with Active State Highlighting */}
            <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink min-w-0 overflow-x-auto scrollbar-none">
              
              {/* Browse Notes */}
              <button
                type="button"
                onClick={handleNavigateHome}
                className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isBrowseActive
                    ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/70 dark:border-indigo-800/60 ring-2 ring-indigo-500/20 shadow-xs'
                    : 'text-slate-600 dark:text-gray-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-gray-800/80'
                }`}
              >
                <BookOpen className={`w-4 h-4 shrink-0 ${isBrowseActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                <span>Browse Notes</span>
                {isBrowseActive && (
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                )}
              </button>

              {/* Categories Dropdown */}
              <div ref={dropdownRef} className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setCategoriesDropdownOpen((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                    isCategoriesActive
                      ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold border border-indigo-200/70 dark:border-indigo-800/60 ring-2 ring-indigo-500/20 shadow-xs'
                      : 'text-slate-600 dark:text-gray-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-gray-800/80'
                  }`}
                  aria-expanded={categoriesDropdownOpen}
                >
                  <Layers className={`w-4 h-4 shrink-0 ${isCategoriesActive ? 'text-indigo-600 dark:text-indigo-400' : ''}`} />
                  <span>
                    {selectedCategory !== 'All Categories' ? selectedCategory : 'Categories'}
                  </span>
                  <ChevronDown
                    className={`w-3.5 h-3.5 transition-transform duration-200 shrink-0 ${
                      categoriesDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {categoriesDropdownOpen && (
                  <div className="absolute left-0 top-full mt-2 w-56 rounded-2xl bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-slate-200/90 dark:border-gray-800/80 shadow-2xl p-1.5 z-50 animate-scaleUp">
                    <div className="px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 flex items-center justify-between">
                      <span>Academic Disciplines</span>
                      {selectedCategory !== 'All Categories' && (
                        <button
                          type="button"
                          onClick={() => handleCategoryClick('All Categories')}
                          className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto space-y-0.5">
                      {CATEGORIES.map((cat) => {
                        const isCurrent = selectedCategory === cat;
                        return (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => handleCategoryClick(cat)}
                            className={`w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs text-left transition-colors cursor-pointer ${
                              isCurrent
                                ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                                : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
                            }`}
                          >
                            <span className="shrink-0">{CATEGORY_ICONS[cat] || <Layers className="w-4 h-4" />}</span>
                            <span className="truncate flex-1">{cat}</span>
                            {isCurrent && (
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Real-time Search Input trigger */}
              <button
                type="button"
                onClick={onFocusSearch}
                className="px-3 py-1.5 text-xs xl:text-sm text-slate-500 dark:text-gray-400 hover:text-slate-800 dark:hover:text-gray-200 hover:bg-slate-100/80 dark:hover:bg-gray-800/80 rounded-xl flex items-center gap-2 transition-colors border border-transparent hover:border-slate-200 dark:hover:border-gray-700 cursor-pointer shrink-0"
                title="Focus search input (or press /)"
              >
                <Search className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500 shrink-0" />
                <span>Search</span>
                <kbd className="text-[10px] font-semibold bg-slate-100 dark:bg-gray-800 text-slate-600 dark:text-gray-300 px-1.5 py-0.2 rounded-md border border-slate-200 dark:border-gray-700">
                  /
                </kbd>
              </button>

              {/* Saved Notes Drawer Trigger with Active Highlight & Count Badge */}
              <button
                type="button"
                onClick={onOpenBookmarks}
                className={`px-3 py-1.5 rounded-xl text-xs xl:text-sm font-medium transition-all duration-200 cursor-pointer flex items-center gap-1.5 shrink-0 ${
                  isSavedActive
                    ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 font-bold border border-amber-200/70 dark:border-amber-800/60 ring-2 ring-amber-500/20 shadow-xs'
                    : 'text-slate-600 dark:text-gray-300 hover:text-slate-950 dark:hover:text-white hover:bg-slate-100/80 dark:hover:bg-gray-800/80'
                }`}
                title="View saved notes"
              >
                <Bookmark className={`w-4 h-4 shrink-0 ${isSavedActive ? 'text-amber-600 dark:text-amber-400' : 'text-amber-500'}`} />
                <span>Saved</span>
                {bookmarksCount > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                    {bookmarksCount}
                  </span>
                )}
              </button>
            </nav>

            {/* Right Action Area - Streamlined, non-overflowing flex layout */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              
              {/* Reactive Network Status Badge */}
              <div
                className="relative group shrink-0"
                role="status"
                aria-live="polite"
              >
                <div
                  className={`inline-flex items-center gap-1.5 px-2 sm:px-2.5 py-1.5 rounded-xl text-xs font-medium border transition-all cursor-default select-none ${
                    !isOnline
                      ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30 shadow-xs animate-pulse'
                      : 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/15'
                  }`}
                >
                  <span className="relative flex h-2 w-2">
                    {isOnline ? (
                      <>
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
                      </>
                    ) : (
                      <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    )}
                  </span>
                  <span className="hidden sm:inline font-semibold">
                    {isOnline ? 'Online' : 'Offline'}
                  </span>
                </div>

                {/* Smooth Hover Tooltip */}
                <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 hidden group-hover:flex flex-col items-center z-50 pointer-events-none transition-all duration-200 animate-fadeIn">
                  <div className="w-1.5 h-1.5 bg-slate-900 dark:bg-gray-800 rotate-45 -mb-1" />
                  <div className="px-2.5 py-1.5 rounded-xl bg-slate-900 dark:bg-gray-800 text-white text-[11px] font-medium shadow-xl whitespace-nowrap border border-slate-700/50">
                    {isOnline
                      ? 'Online • Real-time Cloud Sync & AI Verification Active'
                      : 'Offline • Browsing local cached study notes'}
                  </div>
                </div>
              </div>

              {/* Consolidated Theme & Anime Controls with Hover Tooltips */}
              <ThemeToggle />

              {/* Setup Backend Button with Vibrant Gradient Hover Effect */}
              <button
                type="button"
                onClick={onOpenConfig}
                className={`inline-flex items-center gap-1.5 min-h-[40px] px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-300 hover:scale-105 shadow-xs hover:shadow-md hover:shadow-indigo-500/25 cursor-pointer shrink-0 border ${
                  isConfigured
                    ? 'bg-linear-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border-emerald-300/80 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 hover:from-emerald-100 hover:to-teal-100 dark:hover:from-emerald-900/50 dark:hover:to-teal-900/50'
                    : 'bg-linear-to-r from-indigo-50 via-purple-50 to-pink-50 dark:from-indigo-950/40 dark:via-purple-950/40 dark:to-pink-950/40 border-indigo-200/80 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 hover:border-indigo-400 hover:from-indigo-100 hover:to-purple-100'
                }`}
                title={isConfigured ? 'Supabase Database Connected — Click to manage settings' : 'Setup Supabase Backend & Database'}
                aria-label={isConfigured ? 'Supabase Database Connected' : 'Setup Supabase Backend'}
              >
                <span
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400 animate-ping'
                  }`}
                />
                <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
                <span className="hidden xl:inline font-semibold">
                  {isConfigured ? 'Supabase' : 'Setup Backend'}
                </span>
              </button>

              {/* User Profile Avatar with Instant Modal Trigger & Hover Micro-Interactions */}
              <div className="hidden lg:flex items-center shrink-0">
                {user ? (
                  <div className="flex items-center gap-1.5 sm:gap-2 pl-0.5">
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="hidden 2xl:flex flex-col text-right cursor-pointer hover:opacity-80 transition-opacity text-left group"
                      title="Manage Student Profile"
                    >
                      <span className="text-xs font-bold text-gray-900 dark:text-gray-100 leading-tight truncate max-w-[110px] group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {profile?.full_name || user.user_metadata?.full_name || user.email?.split('@')[0]}
                      </span>
                      <span className="text-[10px] text-slate-500 dark:text-gray-400 truncate max-w-[110px]">
                        {profile?.university || user.user_metadata?.university || 'Student Scholar'}
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={onOpenProfile}
                      className="w-8 h-8 rounded-full bg-linear-to-tr from-indigo-500 via-purple-500 to-violet-500 text-white flex items-center justify-center font-bold text-xs shadow-xs shrink-0 cursor-pointer overflow-hidden ring-2 ring-indigo-500/20 hover:ring-indigo-500/60 hover:scale-110 active:scale-95 transition-all duration-200"
                      title={`Student Profile — ${profile?.full_name || user.user_metadata?.full_name || user.email} (Click to edit)`}
                      aria-label="Manage Student Profile"
                    >
                      {(profile?.avatar_url || user.user_metadata?.avatar_url) ? (
                        <img
                          src={profile?.avatar_url || user.user_metadata?.avatar_url}
                          alt={profile?.full_name || 'Profile'}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>
                          {(profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || 'S').toUpperCase()}
                        </span>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={logout}
                      className="p-1.5 text-slate-400 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors cursor-pointer shrink-0"
                      title="Sign Out"
                      aria-label="Sign Out"
                    >
                      <LogOut className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={onOpenAuth}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-gray-200 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-gray-800 rounded-xl transition-all duration-200 hover:scale-105 active:scale-95 cursor-pointer border border-slate-200 dark:border-gray-700 shrink-0 min-h-[40px]"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In</span>
                  </button>
                )}
              </div>

              {/* Upload CTA Button with Vibrant Gradient Hover Effects */}
              <button
                type="button"
                onClick={handleNavigateUpload}
                title={!isOnline ? 'Uploading disabled while offline' : 'Upload Study Notes'}
                className={`relative inline-flex items-center gap-1.5 min-h-[40px] px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-semibold transition-all duration-300 hover:scale-105 shadow-md hover:shadow-indigo-500/25 cursor-pointer shrink-0 active:scale-95 ${
                  !isOnline
                    ? 'bg-slate-200 dark:bg-gray-800 text-slate-500 dark:text-gray-400 border border-slate-300 dark:border-gray-700 opacity-80 cursor-not-allowed hover:scale-100 hover:shadow-none'
                    : currentView === 'upload'
                    ? 'bg-linear-to-r from-indigo-700 to-violet-700 text-white ring-2 ring-indigo-400/50 shadow-indigo-600/30'
                    : 'bg-linear-to-r from-indigo-600 via-indigo-500 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white shadow-indigo-500/25 hover:shadow-indigo-500/40'
                }`}
              >
                {isOnline ? (
                  <UploadCloud className="w-4 h-4 shrink-0" />
                ) : (
                  <WifiOff className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                )}
                <span className="hidden sm:inline">{!isOnline ? 'Upload (Offline)' : 'Upload Notes'}</span>
                <span className="sm:hidden">{!isOnline ? 'Offline' : 'Upload'}</span>
              </button>

              {/* Hamburger Menu Button with 44x44px minimum touch target */}
              <button
                type="button"
                onClick={() => setDrawerOpen(true)}
                className="lg:hidden min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-600 dark:text-gray-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-gray-800 transition-all duration-200 active:scale-95 focus:outline-hidden focus-visible:ring-2 focus-visible:ring-indigo-500 shrink-0 cursor-pointer"
                aria-label="Open mobile navigation menu"
                aria-expanded={drawerOpen}
              >
                <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
              </button>

            </div>

          </div>
        </div>
      </header>

      {/* ===================================================================== */}
      {/* MOBILE & TABLET SLIDE-OUT DRAWER OVERLAY                              */}
      {/* ===================================================================== */}
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs transition-opacity duration-300 lg:hidden ${
          drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setDrawerOpen(false)}
        aria-hidden="true"
      />

      {/* Slide-out Drawer Panel */}
      <aside
        className={`fixed top-0 right-0 bottom-0 z-50 w-full max-w-xs sm:max-w-sm bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl shadow-2xl border-l border-slate-200/90 dark:border-gray-800/80 flex flex-col transition-transform duration-300 ease-in-out lg:hidden ${
          drawerOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
        aria-label="Mobile Navigation Drawer"
      >
        {/* Drawer Header */}
        <div className="p-4 border-b border-slate-100 dark:border-gray-800 flex items-center justify-between bg-slate-50/80 dark:bg-gray-850/80 backdrop-blur-xs">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white shadow-xs">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-sm text-gray-900 dark:text-gray-100">NoteShare</span>
              <span className="block text-[10px] text-slate-400 dark:text-gray-500">Student Scholar Menu</span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setDrawerOpen(false)}
            className="min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-700 dark:hover:text-gray-200 hover:bg-slate-200 dark:hover:bg-gray-800 transition-colors cursor-pointer"
            aria-label="Close navigation drawer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          
          {/* User Auth Profile Card */}
          {user ? (
            <div className="p-3 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => {
                  onOpenProfile?.();
                  setDrawerOpen(false);
                }}
                className="flex items-center gap-2.5 min-w-0 flex-1 text-left cursor-pointer group"
                title="Manage Student Profile"
              >
                <div className="w-9 h-9 rounded-full bg-linear-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs overflow-hidden group-hover:ring-2 group-hover:ring-indigo-500 transition-all">
                  {(profile?.avatar_url || user.user_metadata?.avatar_url) ? (
                    <img
                      src={profile?.avatar_url || user.user_metadata?.avatar_url}
                      alt={profile?.full_name || 'Profile'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>
                      {(profile?.full_name?.[0] || user.user_metadata?.full_name?.[0] || user.email?.[0] || 'S').toUpperCase()}
                    </span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-gray-900 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {profile?.full_name || user.user_metadata?.full_name || user.email}
                  </div>
                  <div className="text-[10px] text-slate-500 dark:text-gray-400 truncate">
                    {profile?.university || user.user_metadata?.university || 'Student Scholar'} • Edit Profile
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  logout();
                  setDrawerOpen(false);
                }}
                className="text-xs font-semibold text-rose-600 dark:text-rose-400 hover:text-rose-700 p-1.5 rounded-lg hover:bg-rose-100/50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer shrink-0"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => {
                onOpenAuth();
                setDrawerOpen(false);
              }}
              className="w-full min-h-[44px] py-2.5 px-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all cursor-pointer"
            >
              <User className="w-4 h-4" />
              <span>Sign In / Create Account</span>
            </button>
          )}

          {/* Primary Navigation Links with Active State Highlighting */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 px-2 block mb-1">
              Navigation
            </span>

            {/* Home / Browse Notes */}
            <button
              type="button"
              onClick={handleNavigateHome}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isBrowseActive
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                <BookOpen className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span>Browse All Notes</span>
              </div>
              {isBrowseActive && (
                <span className="w-2 h-2 rounded-full bg-indigo-600 dark:bg-indigo-400" />
              )}
            </button>

            {/* Upload Notes */}
            <button
              type="button"
              onClick={handleNavigateUpload}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                !isOnline
                  ? 'bg-slate-100 dark:bg-gray-800/60 text-slate-500 dark:text-gray-400 opacity-75'
                  : currentView === 'upload'
                  ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 shadow-2xs border border-indigo-200/60 dark:border-indigo-800/60'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              <div className="flex items-center gap-3">
                {isOnline ? (
                  <UploadCloud className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                ) : (
                  <WifiOff className="w-4 h-4 text-amber-500" />
                )}
                <span>Upload Notes</span>
              </div>
              {!isOnline && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300">
                  Offline
                </span>
              )}
            </button>

            {/* Saved Bookmarks */}
            <button
              type="button"
              onClick={() => {
                onOpenBookmarks();
                setDrawerOpen(false);
              }}
              className={`w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer ${
                isSavedActive
                  ? 'bg-amber-50 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 shadow-2xs border border-amber-200/60 dark:border-amber-800/60'
                  : 'text-slate-700 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800'
              }`}
            >
              <span className="flex items-center gap-3">
                <Bookmark className="w-4 h-4 text-amber-500" />
                <span>Saved Bookmarks</span>
              </span>
              {bookmarksCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 dark:bg-amber-950/70 text-amber-800 dark:text-amber-300 border border-amber-200/60 dark:border-amber-800/60">
                  {bookmarksCount}
                </span>
              )}
            </button>
          </div>

          {/* Categories Accordion Section */}
          <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => setDrawerCategoriesOpen((prev) => !prev)}
              className="w-full flex items-center justify-between px-2 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-gray-500 hover:text-slate-700 dark:hover:text-gray-300 cursor-pointer"
            >
              <span className="flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-500" />
                <span>Disciplines & Categories</span>
              </span>
              <ChevronDown
                className={`w-3.5 h-3.5 transition-transform duration-200 ${
                  drawerCategoriesOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {drawerCategoriesOpen && (
              <div className="mt-1.5 space-y-1 pl-1">
                {CATEGORIES.map((cat) => {
                  const isCurrent = selectedCategory === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleCategoryClick(cat)}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition-colors cursor-pointer min-h-[38px] ${
                        isCurrent
                          ? 'bg-indigo-50 dark:bg-indigo-950/70 text-indigo-700 dark:text-indigo-300 font-bold'
                          : 'text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 hover:text-slate-900 dark:hover:text-gray-200'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="shrink-0">{CATEGORY_ICONS[cat] || <Layers className="w-3.5 h-3.5" />}</span>
                        <span className="truncate">{cat}</span>
                      </div>
                      {isCurrent && (
                        <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400 shrink-0" />
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Supabase Cloud Settings */}
          <div className="pt-2 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={() => {
                onOpenConfig();
                setDrawerOpen(false);
              }}
              className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-gray-400 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-h-[44px]"
            >
              <div className="flex items-center gap-2.5">
                <Database className="w-4 h-4 text-indigo-500 shrink-0" />
                <span>Supabase Cloud Integration</span>
              </div>
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-amber-400'
                }`}
              />
            </button>
          </div>

        </div>

        {/* Drawer Footer: Theme Toggle & Info */}
        <div className="p-4 border-t border-slate-100 dark:border-gray-800 bg-slate-50/70 dark:bg-gray-850/80 space-y-3">
          {/* Direct Anime Theme Studio Trigger in Mobile Drawer */}
          <button
            type="button"
            onClick={() => {
              openAnimePicker();
              setDrawerOpen(false);
            }}
            className="w-full min-h-[44px] flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold text-pink-700 dark:text-pink-300 bg-pink-500/10 hover:bg-pink-500/20 border border-pink-400/30 transition-all cursor-pointer hover:scale-[1.01] active:scale-98"
          >
            <div className="flex items-center gap-2.5">
              <Sparkles className="w-4 h-4 text-pink-500 animate-pulse" />
              <span>Anime Theme Studio</span>
            </div>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-pink-200/60 dark:bg-pink-900/60 text-pink-800 dark:text-pink-200">
              Wallpapers
            </span>
          </button>

          <div className="flex flex-col gap-2">
            <span className="text-xs font-bold text-slate-700 dark:text-gray-300">
              Theme Mode
            </span>
            <div className="flex items-center justify-between">
              <ThemeToggle variant="group" showLabels={true} size="sm" />
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 dark:text-gray-500 pt-1 border-t border-slate-200/60 dark:border-gray-800">
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              NoteShare Verified
            </span>
            <span>v2.5 • Global</span>
          </div>
        </div>

      </aside>
    </>
  );
}
