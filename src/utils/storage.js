const NOTES_STORAGE_KEY = 'noteshare_uploaded_notes_v1';
const BOOKMARKS_STORAGE_KEY = 'noteshare_saved_bookmarks_v1';

// Purge any legacy notes cache from localStorage
if (typeof window !== 'undefined') {
  try {
    localStorage.removeItem(NOTES_STORAGE_KEY);
  } catch (e) {
    // Ignore in non-browser environments
  }
}

/**
 * Returns empty array. Notes are strictly managed by Supabase.
 */
export function getStoredNotes() {
  return [];
}

/**
 * Saves notes to local cache
 */
export function saveStoredNotes(notes) {
  try {
    localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(notes || []));
  } catch (err) {
    console.error('Failed to save notes to localStorage:', err);
  }
}

/**
 * Retrieves bookmarked note IDs from storage
 */
export function getSavedBookmarks() {
  try {
    const raw = localStorage.getItem(BOOKMARKS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error('Failed to load bookmarks:', err);
    return [];
  }
}

/**
 * Saves bookmarked note IDs to storage
 */
export function saveBookmarks(bookmarkIds) {
  try {
    localStorage.setItem(BOOKMARKS_STORAGE_KEY, JSON.stringify(bookmarkIds || []));
  } catch (err) {
    console.error('Failed to save bookmarks:', err);
  }
}
