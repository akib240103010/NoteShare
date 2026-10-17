/**
 * offlineStorage.js
 * Comprehensive Offline Note Caching System using IndexedDB and the Cache API.
 * Ensures all note metadata and PDF/attachment files are persistent and available
 * even when the student has zero internet connectivity.
 */

const DB_NAME = 'noteshare_offline_db';
const DB_VERSION = 1;
const NOTES_STORE = 'notes';
const FILES_STORE = 'files';
const CACHE_NAME = 'noteshare-notes-v1';

let dbPromise = null;

/**
 * Open or upgrade the IndexedDB database
 */
function getDB() {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !window.indexedDB) {
      resolve(null);
      return;
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains(NOTES_STORE)) {
        db.createObjectStore(NOTES_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(FILES_STORE)) {
        db.createObjectStore(FILES_STORE, { keyPath: 'noteId' });
      }
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => {
      console.warn('Failed to open IndexedDB:', request.error);
      resolve(null);
    };
  });

  return dbPromise;
}

/**
 * Cache note metadata and its attachment file (PDF/Image/Text) locally.
 * Uses both IndexedDB and the Cache Storage API for maximum offline compatibility.
 * 
 * @param {Object} note - The full note object
 * @param {Blob|null} [fileBlob] - Optional pre-existing blob (e.g. from local file picker or previewer)
 */
export async function cacheNoteOffline(note, fileBlob = null) {
  if (!note || !note.id) return false;

  try {
    const db = await getDB();

    // 1. Save metadata to IndexedDB
    if (db) {
      const tx = db.transaction([NOTES_STORE, FILES_STORE], 'readwrite');
      const notesStore = tx.objectStore(NOTES_STORE);
      const filesStore = tx.objectStore(FILES_STORE);

      const noteToSave = {
        ...note,
        cachedAt: Date.now(),
        isCachedOffline: true,
      };

      notesStore.put(noteToSave);

      // 2. Handle File Attachment Caching
      let blobToSave = fileBlob;

      const fileUrl = note.file?.url || note.file_url || note.fileUrl;

      // If no blob is supplied but there is a file URL or base64 data URI
      if (!blobToSave && fileUrl) {
        if (typeof fileUrl === 'string' && fileUrl.startsWith('data:')) {
          try {
            const parts = fileUrl.split(',');
            const mimeMatch = parts[0]?.match(/:(.*?);/);
            const mime = (mimeMatch && mimeMatch[1]) || note.file?.type || 'application/pdf';
            const bstr = atob(parts[1] || '');
            let n = bstr.length;
            const u8arr = new Uint8Array(n);
            while (n--) {
              u8arr[n] = bstr.charCodeAt(n);
            }
            blobToSave = new Blob([u8arr], { type: mime });
          } catch (dataErr) {
            console.warn('Could not parse data URI to Blob in offline cache:', dataErr);
          }
        } else if (typeof fileUrl === 'string' && (fileUrl.startsWith('http://') || fileUrl.startsWith('https://'))) {
          try {
            // Check Cache API first
            if ('caches' in window) {
              const cache = await caches.open(CACHE_NAME);
              const cachedRes = await cache.match(fileUrl);
              if (cachedRes) {
                blobToSave = await cachedRes.blob();
              } else {
                // Fetch from network with cache storage fallback
                const netRes = await fetch(fileUrl, { mode: 'cors' });
                if (netRes.ok) {
                  await cache.put(fileUrl, netRes.clone());
                  blobToSave = await netRes.blob();
                }
              }
            }
          } catch (fetchErr) {
            // Network fetch failure is expected if offline or CORS-restricted
          }
        }
      }

      // If still no blob, generate synthetic reading blob from pagesContent/description
      if (!blobToSave) {
        const textContent = `NoteShare Academic Note\n================================\nTitle: ${note.title}\nCourse: ${note.courseCode} - ${note.courseName}\nUniversity: ${note.university}\nAuthor: ${note.author?.name}\nDate: ${note.uploadDate}\n\nSummary:\n${note.description}\n\nExcerpts:\n${note.pagesContent?.map((p) => `[Page ${p.pageNumber}: ${p.title}]\n${p.excerpt}\nKey Takeaway: ${p.keyTakeaway}\n`).join('\n') || ''}`;
        blobToSave = new Blob([textContent], { type: 'text/plain;charset=utf-8' });
      }

      if (blobToSave) {
        const isPdfBlob = blobToSave.type.includes('pdf');
        const isImgBlob = blobToSave.type.startsWith('image/');
        filesStore.put({
          noteId: note.id,
          fileName: note.file?.name || `${note.courseCode}_Notes.pdf`,
          fileFormat: isPdfBlob ? 'PDF' : (isImgBlob ? 'IMAGE' : 'TEXT'),
          fileType: blobToSave.type,
          blob: blobToSave,
          cachedAt: Date.now(),
        });

        // Also put in Cache API under a synthetic key
        if ('caches' in window) {
          try {
            const cache = await caches.open(CACHE_NAME);
            const cacheKey = `/offline-notes/${note.id}/${encodeURIComponent(note.file?.name || 'document.pdf')}`;
            const syntheticResponse = new Response(blobToSave, {
              headers: {
                'Content-Type': blobToSave.type || 'application/pdf',
                'Content-Length': blobToSave.size.toString(),
                'X-NoteShare-Offline': 'true',
              },
            });
            await cache.put(cacheKey, syntheticResponse);
          } catch (cErr) {
            console.warn('Cache API put failed:', cErr);
          }
        }
      }

      await new Promise((resolve) => {
        tx.oncomplete = resolve;
        tx.onerror = resolve;
      });
    }

    // Dispatch event to notify UI components that offline store was updated
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noteshare:offline-cache-updated', {
        detail: { noteId: note.id },
      }));
    }

    return true;
  } catch (err) {
    console.warn('Error caching note offline:', err);
    return false;
  }
}

/**
 * Retrieve cached note metadata by ID
 */
export async function getCachedNote(noteId) {
  const db = await getDB();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const store = tx.objectStore(NOTES_STORE);
    const req = store.get(noteId);

    req.onsuccess = () => resolve(req.result || null);
    req.onerror = () => resolve(null);
  });
}

/**
 * Retrieve cached note file (Blob) by note ID
 */
export async function getCachedNoteFile(noteId) {
  const db = await getDB();
  if (!db) return null;

  return new Promise((resolve) => {
    const tx = db.transaction(FILES_STORE, 'readonly');
    const store = tx.objectStore(FILES_STORE);
    const req = store.get(noteId);

    req.onsuccess = () => {
      if (req.result && req.result.blob) {
        resolve(req.result);
      } else {
        resolve(null);
      }
    };
    req.onerror = () => resolve(null);
  });
}

/**
 * Returns an object URL for the cached note file, or null if not cached or non-binary
 */
export async function getCachedNoteFileUrl(noteId) {
  const cachedFile = await getCachedNoteFile(noteId);
  if (cachedFile && cachedFile.blob) {
    const isBinaryMedia =
      cachedFile.blob.type?.includes('pdf') ||
      cachedFile.blob.type?.startsWith('image/') ||
      cachedFile.fileFormat === 'PDF' ||
      cachedFile.fileFormat === 'IMAGE';

    if (isBinaryMedia) {
      return URL.createObjectURL(cachedFile.blob);
    }
  }
  return null;
}

/**
 * Retrieve all notes cached in local offline storage
 */
export async function getAllCachedNotes() {
  const db = await getDB();
  if (!db) return [];

  return new Promise((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const store = tx.objectStore(NOTES_STORE);
    const req = store.getAll();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Get array of note IDs currently stored in offline cache
 */
export async function getCachedNoteIds() {
  const db = await getDB();
  if (!db) return [];

  return new Promise((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const store = tx.objectStore(NOTES_STORE);
    const req = store.getAllKeys();

    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => resolve([]);
  });
}

/**
 * Check if a specific note is cached offline
 */
export async function isNoteCachedOffline(noteId) {
  if (!noteId) return false;
  const db = await getDB();
  if (!db) return false;

  return new Promise((resolve) => {
    const tx = db.transaction(NOTES_STORE, 'readonly');
    const store = tx.objectStore(NOTES_STORE);
    const req = store.getKey(noteId);

    req.onsuccess = () => resolve(Boolean(req.result));
    req.onerror = () => resolve(false);
  });
}

/**
 * Remove a note and its file from offline storage
 */
export async function removeCachedNote(noteId) {
  const db = await getDB();
  if (!db) return false;

  try {
    const tx = db.transaction([NOTES_STORE, FILES_STORE], 'readwrite');
    tx.objectStore(NOTES_STORE).delete(noteId);
    tx.objectStore(FILES_STORE).delete(noteId);

    await new Promise((resolve) => {
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });

    if ('caches' in window) {
      try {
        const cache = await caches.open(CACHE_NAME);
        const keys = await cache.keys();
        for (const req of keys) {
          if (req.url.includes(`/offline-notes/${noteId}/`)) {
            await cache.delete(req);
          }
        }
      } catch (cErr) {
        console.warn('Error deleting from cache storage:', cErr);
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('noteshare:offline-cache-updated', {
        detail: { noteId, deleted: true },
      }));
    }

    return true;
  } catch (err) {
    console.warn('Error removing note from offline store:', err);
    return false;
  }
}
