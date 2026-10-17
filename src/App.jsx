import React, { useState, useEffect, useMemo, useRef } from 'react';
import Navbar from './components/Navbar';
import HeroSearch from './components/HeroSearch';
import CategoryFilters from './components/CategoryFilters';
import TagFilterBar from './components/TagFilterBar';
import NoteListView from './components/NoteListView';
import NotePreviewModal from './components/NotePreviewModal';
import UploadPage from './components/UploadPage';
import BookmarksModal from './components/BookmarksModal';
import AuthModal from './components/AuthModal';
import UserProfileModal from './components/UserProfileModal';
import SupabaseConfigModal from './components/SupabaseConfigModal';
import AuthGuard from './components/AuthGuard';
import AnimeThemePicker from './components/AnimeThemePicker';
import AnimeBackground from './components/AnimeBackground';
import Toast from './components/Toast';
import Footer from './components/Footer';
import { CATEGORIES } from './data/initialNotes';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { NetworkProvider, useNetwork } from './context/NetworkContext';
import {
  getSavedBookmarks,
  saveBookmarks,
} from './utils/storage';
import {
  cacheNoteOffline,
  getCachedNoteFile,
  getAllCachedNotes,
} from './lib/offlineStorage';
import {
  isSupabaseConfigured,
  fetchNotesFromSupabase,
  updateNoteDownloads,
  updateNoteUpvotes,
  deleteNoteFromSupabase,
} from './lib/supabase';

function NoteShareApp() {
  const { user, loading: authLoading, authNotification, setAuthNotification } = useAuth();
  const { theme, isAnime, isDark, animeWallpaper } = useTheme();
  const { isOnline, cachedNoteIds, cachedNotesOnly } = useNetwork();

  // Navigation View ('home' | 'upload')
  const [currentView, setCurrentView] = useState('home');
  // Currently editing note (null when uploading a new note)
  const [editingNote, setEditingNote] = useState(null);

  // Notes and Bookmarks data
  const [notes, setNotes] = useState([]);
  const [isLoadingNotes, setIsLoadingNotes] = useState(true);
  const [bookmarks, setBookmarks] = useState(() => getSavedBookmarks());
  const [upvotedNotes, setUpvotedNotes] = useState(() => new Set());

  // Real-Time Search & Advanced Filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All Categories');
  const [selectedResourceType, setSelectedResourceType] = useState('All Types');
  const [selectedUniversity, setSelectedUniversity] = useState('All Universities');
  const [selectedTags, setSelectedTags] = useState([]);
  const [tagMatchMode, setTagMatchMode] = useState('any'); // 'any' | 'all'
  const [sortBy, setSortBy] = useState('popular');
  const [viewMode, setViewMode] = useState('grid');

  // Modals & Floating UI
  const [previewNote, setPreviewNote] = useState(null);
  const [isBookmarksOpen, setIsBookmarksOpen] = useState(false);
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [toast, setToast] = useState(null);

  const searchInputRef = useRef(null);

  // Check for flash toast saved before a page reload (e.g. Supabase connection update)
  useEffect(() => {
    try {
      const flash = sessionStorage.getItem('noteshare_flash_toast');
      if (flash) {
        sessionStorage.removeItem('noteshare_flash_toast');
        const parsed = JSON.parse(flash);
        setToast(parsed);
      }
    } catch (e) {
      // ignore
    }
  }, []);

  // Display auth notification toasts (e.g. email verification warnings) dispatched by AuthContext
  useEffect(() => {
    if (authNotification) {
      setToast(authNotification);
      setAuthNotification(null);
    }
  }, [authNotification, setAuthNotification]);

  // Sync notes strictly and exclusively from live Supabase notes table on mount and when auth resolves
  useEffect(() => {
    let isMounted = true;

    async function loadLiveNotes() {
      // If Supabase is configured, wait until auth state finishes initializing persisted session
      if (isSupabaseConfigured && authLoading) {
        return;
      }

      setIsLoadingNotes(true);
      try {
        if (isSupabaseConfigured) {
          const remoteNotes = await fetchNotesFromSupabase();
          if (isMounted) {
            const liveNotes = Array.isArray(remoteNotes) ? remoteNotes : [];
            setNotes(liveNotes);
            setIsLoadingNotes(false);
          }
        } else {
          // If Supabase is not configured yet, initialize as empty array
          if (isMounted) {
            setNotes([]);
            setIsLoadingNotes(false);
          }
        }
      } catch (err) {
        console.warn('Failed to load live notes from Supabase:', err);
        if (isMounted) {
          setNotes([]);
          setIsLoadingNotes(false);
        }
      }
    }

    loadLiveNotes();

    return () => {
      isMounted = false;
    };
  }, [authLoading, user?.id]);

  // When offline, merge any cached notes from local IndexedDB
  useEffect(() => {
    if (!isOnline) {
      getAllCachedNotes().then((cached) => {
        if (cached && cached.length > 0) {
          setNotes((prevLocal) => {
            const localIds = new Set(prevLocal.map((l) => l.id));
            const additions = cached.filter((c) => !localIds.has(c.id));
            return additions.length > 0 ? [...prevLocal, ...additions] : prevLocal;
          });
        }
      });
    }
  }, [isOnline]);

  // Alert student on online/offline state transitions
  const prevOnlineRef = useRef(isOnline);
  useEffect(() => {
    if (prevOnlineRef.current !== isOnline) {
      if (!isOnline) {
        setToast({
          type: 'info',
          title: 'Offline Mode Active',
          message: 'Viewing cached notes. Note uploads and live account sync are paused until connection is restored.',
        });
      } else {
        setToast({
          type: 'success',
          title: 'Connection Restored',
          message: 'You are back online! Full cloud sync, Gemini AI verification, and uploads are active.',
        });
      }
      prevOnlineRef.current = isOnline;
    }
  }, [isOnline]);

  // Sync bookmarks to localStorage
  useEffect(() => {
    saveBookmarks(bookmarks);
  }, [bookmarks]);

  // Global Keyboard Shortcuts (Cmd/Ctrl+K or '/' to focus search, Esc to close modals)
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === '/' &&
        currentView === 'home' &&
        document.activeElement?.tagName !== 'INPUT' &&
        document.activeElement?.tagName !== 'TEXTAREA'
      ) {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        setPreviewNote(null);
        setIsBookmarksOpen(false);
        setIsAuthOpen(false);
        setIsConfigOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [currentView]);

  // Extract all available tags and compute their frequencies dynamically
  const availableTagsWithCounts = useMemo(() => {
    const counts = {};
    notes.forEach((note) => {
      if (Array.isArray(note.tags)) {
        note.tags.forEach((tag) => {
          counts[tag] = (counts[tag] || 0) + 1;
        });
      }
    });
    return Object.entries(counts)
      .map(([tag, count]) => ({ tag, count }))
      .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag));
  }, [notes]);

  // Extract all available universities dynamically
  const availableUniversities = useMemo(() => {
    const set = new Set();
    notes.forEach((n) => {
      if (n.university) set.add(n.university);
    });
    return Array.from(set).sort();
  }, [notes]);

  // Compute category counts dynamically
  const countsByCategory = useMemo(() => {
    const counts = { 'All Categories': notes.length };
    CATEGORIES.forEach((cat) => {
      if (cat !== 'All Categories') {
        counts[cat] = notes.filter((n) => n.category === cat).length;
      }
    });
    return counts;
  }, [notes]);

  // Filtered and Sorted Notes with Real-Time Search & Multi-Tag Matching
  const filteredNotes = useMemo(() => {
    let result = [...notes];

    // 0. Filter by Cached Notes Only (Offline Mode)
    if (cachedNotesOnly) {
      result = result.filter((n) => cachedNoteIds.includes(n.id) || n.isCachedOffline);
    }

    // 1. Filter by Academic Category
    if (selectedCategory !== 'All Categories') {
      result = result.filter((n) => n.category === selectedCategory);
    }

    // 2. Filter by Resource Type
    if (selectedResourceType !== 'All Types') {
      result = result.filter((n) => n.resourceType === selectedResourceType);
    }

    // 3. Filter by Global University
    if (selectedUniversity !== 'All Universities') {
      result = result.filter((n) => n.university.toLowerCase().includes(selectedUniversity.toLowerCase()));
    }

    // 4. Tag-Based Filtering (Multi-Select with Match Mode ANY/ALL)
    if (selectedTags.length > 0) {
      result = result.filter((note) => {
        const noteTags = (note.tags || []).map((t) => t.toLowerCase());
        if (tagMatchMode === 'all') {
          return selectedTags.every((sel) => noteTags.includes(sel.toLowerCase()));
        } else {
          return selectedTags.some((sel) => noteTags.includes(sel.toLowerCase()));
        }
      });
    }

    // 5. Real-Time Tokenized Multi-Field Search
    if (searchQuery.trim()) {
      const tokens = searchQuery.toLowerCase().trim().split(/\s+/).filter(Boolean);
      result = result.filter((n) => {
        const searchableText = [
          n.title,
          n.courseCode,
          n.courseName,
          n.university,
          n.category,
          n.description,
          n.author?.name,
          ...(n.tags || []),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        // Every token in the query must match somewhere in the note's searchable text
        return tokens.every((token) => searchableText.includes(token));
      });
    }

    // 6. Sort
    result.sort((a, b) => {
      if (sortBy === 'popular') return (b.downloads || 0) - (a.downloads || 0);
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'newest') return new Date(b.uploadDate) - new Date(a.uploadDate);
      if (sortBy === 'title') return a.title.localeCompare(b.title);
      return 0;
    });

    return result;
  }, [
    notes,
    selectedCategory,
    selectedResourceType,
    selectedUniversity,
    selectedTags,
    tagMatchMode,
    searchQuery,
    sortBy,
  ]);

  // Bookmarked Notes objects
  const bookmarkedNotesList = useMemo(() => {
    return notes.filter((n) => bookmarks.includes(n.id));
  }, [notes, bookmarks]);

  // Handlers
  const handleToggleTag = (tag) => {
    setSelectedTags((prev) => {
      const exists = prev.includes(tag);
      return exists ? prev.filter((t) => t !== tag) : [...prev, tag];
    });
  };

  const handleClearTags = () => {
    setSelectedTags([]);
  };

  const handleToggleBookmark = (noteId) => {
    setBookmarks((prev) => {
      const exists = prev.includes(noteId);
      const updated = exists ? prev.filter((id) => id !== noteId) : [...prev, noteId];
      setToast({
        type: exists ? 'info' : 'success',
        title: exists ? 'Removed from Bookmarks' : 'Note Saved to Bookmarks',
        message: exists
          ? 'Resource was removed from your saved list.'
          : 'You can quickly access this note anytime from Saved Notes.',
      });
      return updated;
    });
  };

  const handleDownload = async (note) => {
    // 1. Immediately cache note metadata and attachment file for persistent offline access
    cacheNoteOffline(note);

    const updatedDownloads = (note.downloads || 0) + 1;

    setNotes((prevNotes) =>
      prevNotes.map((n) => (n.id === note.id ? { ...n, downloads: updatedDownloads } : n))
    );

    if (previewNote?.id === note.id) {
      setPreviewNote((prev) => (prev ? { ...prev, downloads: updatedDownloads } : prev));
    }

    if (isSupabaseConfigured && isOnline) {
      updateNoteDownloads(note.id, updatedDownloads);
    }

    // 2. If currently offline, check if we have a cached file Blob in IndexedDB/CacheStorage
    if (!isOnline) {
      try {
        const cachedFile = await getCachedNoteFile(note.id);
        if (cachedFile && cachedFile.blob) {
          const url = URL.createObjectURL(cachedFile.blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = cachedFile.fileName || `${note.courseCode || 'Note'}_Notes.pdf`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(url), 1500);

          setToast({
            type: 'success',
            title: 'Offline Download Ready',
            message: `Retrieved "${cachedFile.fileName}" from local offline cache. Accessible anytime!`,
          });
          return;
        }
      } catch (err) {
        console.warn('Offline file retrieval fallback:', err);
      }
    }

    // 3. Online download from Supabase Storage public URL
    if (note.file?.url && isOnline) {
      const fileName = note.file.name || `${note.courseCode || 'Note'}_Notes.pdf`;
      try {
        const response = await fetch(note.file.url);
        if (response.ok) {
          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = blobUrl;
          link.download = fileName;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          setTimeout(() => URL.revokeObjectURL(blobUrl), 2000);

          setToast({
            type: 'success',
            title: 'Download Complete',
            message: `Downloaded "${fileName}" directly from Supabase Storage.`,
          });
          return;
        }
      } catch (fetchErr) {
        console.warn('Blob fetch failed, falling back to direct anchor download:', fetchErr);
      }

      // Fallback: direct anchor download attribute
      const link = document.createElement('a');
      link.href = note.file.url;
      link.target = '_blank';
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setToast({
        type: 'success',
        title: 'Downloading Cloud Resource',
        message: `Retrieving "${fileName}" from Supabase Cloud Storage bucket...`,
      });
      return;
    }

    // 4. Fallback text synthesis
    const element = document.createElement('a');
    const fileContent = `NoteShare Academic Note\n================================\nTitle: ${note.title}\nCourse: ${note.courseCode} - ${note.courseName}\nUniversity: ${note.university}\nAuthor: ${note.author?.name}\nDate: ${note.uploadDate}\n\nSummary:\n${note.description}\n\nExcerpts:\n${note.pagesContent?.map((p) => `[Page ${p.pageNumber}: ${p.title}]\n${p.excerpt}\nKey Takeaway: ${p.keyTakeaway}\n`).join('\n') || ''}`;
    const file = new Blob([fileContent], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = note.file?.name?.replace('.pdf', '.txt') || `${note.courseCode}_Notes.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    setToast({
      type: 'success',
      title: 'Download Started',
      message: `Downloading "${note.file?.name || note.title}". Thank you for learning with NoteShare!`,
    });
  };

  const handleShare = (note) => {
    const shareUrl = `${window.location.origin}/#note=${note.id}`;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(shareUrl);
      setToast({
        type: 'info',
        title: 'Link Copied',
        message: `Shareable link for "${note.courseCode}: ${note.title}" copied to clipboard.`,
      });
    } else {
      setToast({
        type: 'info',
        title: 'Share Note',
        message: `Sharing ${note.title}`,
      });
    }
  };

  const handleUpvote = (noteId) => {
    if (upvotedNotes.has(noteId)) {
      setToast({
        type: 'info',
        title: 'Already Upvoted',
        message: 'You have already marked this note as helpful.',
      });
      return;
    }

    setUpvotedNotes((prev) => new Set(prev).add(noteId));

    let updatedRating = 5.0;
    let updatedReviews = 1;

    setNotes((prev) =>
      prev.map((n) => {
        if (n.id === noteId) {
          updatedReviews = (n.reviewsCount || 0) + 1;
          updatedRating = Math.min(5.0, Number((n.rating + 0.02).toFixed(2)));
          return { ...n, reviewsCount: updatedReviews, rating: updatedRating };
        }
        return n;
      })
    );

    if (isSupabaseConfigured) {
      updateNoteUpvotes(noteId, updatedRating, updatedReviews);
    }

    setToast({
      type: 'success',
      title: 'Upvoted!',
      message: 'Thanks for supporting peer contributors!',
    });
  };

  // Live count of notes contributed by the currently logged-in student
  const userNotesCount = useMemo(() => {
    if (!user?.id) return 0;
    return notes.filter((n) => n.author?.id === user.id || n.authorId === user.id || n.author_id === user.id).length;
  }, [notes, user]);

  const handleEditNote = (note) => {
    setEditingNote(note);
    setCurrentView('upload');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleUploadSuccess = (updatedOrNewNote, isEdit = false) => {
    if (isEdit) {
      setNotes((prev) => prev.map((n) => (n.id === updatedOrNewNote.id ? updatedOrNewNote : n)));
      if (previewNote?.id === updatedOrNewNote.id) {
        setPreviewNote(updatedOrNewNote);
      }
      window.dispatchEvent(new CustomEvent('noteshare:notes-updated', { detail: { action: 'update', note: updatedOrNewNote } }));
      setToast({
        type: 'success',
        title: 'Note Updated!',
        message: `Your changes to ${updatedOrNewNote.courseCode || 'the note'} were successfully saved.`,
      });
    } else {
      const incomingList = Array.isArray(updatedOrNewNote) ? updatedOrNewNote : [updatedOrNewNote];
      setNotes((prev) => [...incomingList, ...prev]);
      incomingList.forEach((n) => {
        window.dispatchEvent(new CustomEvent('noteshare:notes-updated', { detail: { action: 'upload', note: n } }));
      });
      const firstNote = incomingList[0];
      setToast({
        type: 'success',
        title: incomingList.length > 1 ? `${incomingList.length} Notes Published!` : 'Resource Published!',
        message: incomingList.length > 1
          ? `Successfully published ${incomingList.length} notes for ${firstNote?.courseCode || 'your course'}.`
          : `Your note for ${firstNote?.courseCode} is now live in the global catalog.`,
      });
    }
    setEditingNote(null);
  };

  const handleDeleteNote = async (noteId) => {
    try {
      if (isSupabaseConfigured) {
        await deleteNoteFromSupabase(noteId);
      }
      setNotes((prev) => prev.filter((n) => n.id !== noteId));
      setBookmarks((prev) => prev.filter((id) => id !== noteId));
      window.dispatchEvent(new CustomEvent('noteshare:notes-updated', { detail: { action: 'delete', noteId } }));
      if (previewNote?.id === noteId) {
        setPreviewNote(null);
      }
      setToast({
        type: 'info',
        title: 'Note Deleted',
        message: 'Your study note was permanently removed.',
      });
    } catch (err) {
      console.error('Delete error:', err);
      setToast({
        type: 'error',
        title: 'Delete Failed',
        message: err.message || 'Supabase RLS Policy: Only the author is permitted to delete this note.',
      });
    }
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setSelectedCategory('All Categories');
    setSelectedResourceType('All Types');
    setSelectedUniversity('All Universities');
    setSelectedTags([]);
    setSortBy('popular');
  };

  const hasActiveFilters =
    searchQuery !== '' ||
    selectedCategory !== 'All Categories' ||
    selectedResourceType !== 'All Types' ||
    selectedUniversity !== 'All Universities' ||
    selectedTags.length > 0 ||
    sortBy !== 'popular';

  return (
    <div
      className={`min-h-screen w-full overflow-x-hidden flex flex-col font-sans transition-colors duration-300 relative ${
        isAnime
          ? 'text-gray-100 selection:bg-pink-500 selection:text-white'
          : isDark
          ? 'bg-gray-950 text-gray-100 selection:bg-indigo-500 selection:text-white'
          : 'bg-white text-gray-900 selection:bg-indigo-500 selection:text-white'
      }`}
    >
      {/* Dynamic Smooth Anime Background Wallpaper Layer with Error Fallbacks */}
      <AnimeBackground />
      
      {/* Navigation Bar */}
      <Navbar
        currentView={currentView}
        setCurrentView={(view) => {
          if (view !== 'upload' || currentView !== 'upload') {
            setEditingNote(null);
          }
          setCurrentView(view);
        }}
        bookmarksCount={bookmarks.length}
        isBookmarksOpen={isBookmarksOpen}
        onOpenBookmarks={() => setIsBookmarksOpen(true)}
        onOpenAuth={() => setIsAuthOpen(true)}
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenConfig={() => setIsConfigOpen(true)}
        selectedCategory={selectedCategory}
        onSelectCategory={(cat) => {
          setSelectedCategory(cat);
          if (currentView !== 'home') setCurrentView('home');
        }}
        onFocusSearch={() => {
          if (currentView !== 'home') setCurrentView('home');
          setTimeout(() => searchInputRef.current?.focus(), 100);
        }}
        onOfflineActionAttempt={(msg) => {
          setToast({
            type: 'info',
            title: 'Offline Action Paused',
            message: msg || 'This feature requires an active internet connection. You can continue browsing cached study notes.',
          });
        }}
      />

      {/* Main Content Area */}
      <main className="flex-1 w-full relative z-10">
        {currentView === 'upload' ? (
          /* Dedicated Upload Form Page */
          <UploadPage
            onBackToHome={() => {
              setEditingNote(null);
              setCurrentView('home');
            }}
            onUploadSuccess={handleUploadSuccess}
            onOpenAuth={() => setIsAuthOpen(true)}
            onOpenConfig={() => setIsConfigOpen(true)}
            editingNote={editingNote}
            onCancelEdit={() => {
              setEditingNote(null);
              setCurrentView('home');
            }}
          />
        ) : (
          /* Clean Home Page */
          <div className="w-full">
            {/* Hero & Real-Time Search Bar */}
            <HeroSearch
              ref={searchInputRef}
              searchQuery={searchQuery}
              setSearchQuery={setSearchQuery}
              totalNotesCount={notes.length}
              matchingCount={filteredNotes.length}
              onSelectTag={(term) => setSearchQuery(term)}
              onToggleTag={handleToggleTag}
              selectedTags={selectedTags}
              notes={notes}
            />

            {/* Note Catalog Explorer */}
            <div className={`max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-5 sm:space-y-6 ${
              isAnime ? 'rounded-3xl my-6 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md shadow-xl border border-white/20 dark:border-gray-800/60' : ''
            }`}>
              
              {/* Category Filter Pills & Controls */}
              <CategoryFilters
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                selectedResourceType={selectedResourceType}
                setSelectedResourceType={setSelectedResourceType}
                selectedUniversity={selectedUniversity}
                setSelectedUniversity={setSelectedUniversity}
                sortBy={sortBy}
                setSortBy={setSortBy}
                viewMode={viewMode}
                setViewMode={setViewMode}
                countsByCategory={countsByCategory}
                onResetFilters={handleResetFilters}
                hasActiveFilters={hasActiveFilters}
                availableUniversities={availableUniversities}
              />

              {/* Real-Time Tag-Based Filtering Bar */}
              <TagFilterBar
                availableTagsWithCounts={availableTagsWithCounts}
                selectedTags={selectedTags}
                onToggleTag={handleToggleTag}
                onClearTags={handleClearTags}
                tagMatchMode={tagMatchMode}
                setTagMatchMode={setTagMatchMode}
              />

              {/* Uploaded Notes List View / Grid View */}
              <NoteListView
                notes={filteredNotes}
                isLoading={isLoadingNotes}
                totalNotesCount={notes.length}
                viewMode={viewMode}
                bookmarks={bookmarks}
                cachedNoteIds={cachedNoteIds}
                onToggleBookmark={handleToggleBookmark}
                onPreview={(note) => {
                  cacheNoteOffline(note);
                  setPreviewNote(note);
                }}
                onDownload={handleDownload}
                onShare={handleShare}
                onResetFilters={handleResetFilters}
                onGoToUpload={() => {
                  setEditingNote(null);
                  setCurrentView('upload');
                }}
                searchQuery={searchQuery}
                selectedCategory={selectedCategory}
                selectedUniversity={selectedUniversity}
                selectedTags={selectedTags}
                onToggleTag={handleToggleTag}
                currentUserId={user?.id}
                onDelete={handleDeleteNote}
                onEdit={handleEditNote}
              />
            </div>
          </div>
        )}
      </main>

      {/* Footer */}
      <div className="relative z-10">
        <Footer
          onSelectCategory={(cat) => {
            setSelectedCategory(cat);
            if (currentView !== 'home') {
              setCurrentView('home');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          }}
          onGoToUpload={() => {
            setEditingNote(null);
            setCurrentView('upload');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
        />
      </div>

      {/* Interactive Note Preview Modal */}
      {previewNote && (
        <NotePreviewModal
          note={previewNote}
          onClose={() => setPreviewNote(null)}
          isBookmarked={bookmarks.includes(previewNote.id)}
          onToggleBookmark={handleToggleBookmark}
          onDownload={handleDownload}
          onShare={handleShare}
          onUpvote={handleUpvote}
          hasUpvoted={upvotedNotes.has(previewNote.id)}
          onToggleTag={handleToggleTag}
          selectedTags={selectedTags}
          currentUserId={user?.id}
          onDelete={handleDeleteNote}
          onEdit={(note) => {
            setPreviewNote(null);
            handleEditNote(note);
          }}
        />
      )}

      {/* Saved Bookmarks Modal */}
      <BookmarksModal
        isOpen={isBookmarksOpen}
        onClose={() => setIsBookmarksOpen(false)}
        bookmarkedNotes={bookmarkedNotesList}
        onRemoveBookmark={handleToggleBookmark}
        onPreview={(note) => setPreviewNote(note)}
        onDownload={handleDownload}
      />

      {/* Supabase User Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onOpenConfig={() => setIsConfigOpen(true)}
        onToast={setToast}
      />

      {/* Student User Profile Management Modal */}
      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
        onToast={setToast}
        notesCount={userNotesCount}
      />

      {/* Supabase Connection Setup & SQL Schema Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
        onToast={setToast}
      />

      {/* Anime Theme Picker Modal / Studio */}
      <AnimeThemePicker />

      {/* Floating Feedback Toast */}
      <Toast toast={toast} onClose={() => setToast(null)} />

    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <NetworkProvider>
          <AuthGuard>
            <NoteShareApp />
          </AuthGuard>
        </NetworkProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
