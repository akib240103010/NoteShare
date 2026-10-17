import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { getCachedNoteIds } from '../lib/offlineStorage';

const NetworkContext = createContext({
  isOnline: true,
  cachedNoteIds: [],
  cachedNotesOnly: false,
  setCachedNotesOnly: () => {},
  refreshCachedNotes: () => {},
});

export function NetworkProvider({ children }) {
  const [isOnline, setIsOnline] = useState(() => {
    return typeof navigator !== 'undefined' && typeof navigator.onLine === 'boolean'
      ? navigator.onLine
      : true;
  });

  const [cachedNoteIds, setCachedNoteIds] = useState([]);
  const [cachedNotesOnly, setCachedNotesOnly] = useState(false);

  const refreshCachedNotes = useCallback(async () => {
    try {
      const ids = await getCachedNoteIds();
      setCachedNoteIds(ids);
    } catch (e) {
      console.warn('Failed to load cached note IDs:', e);
    }
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      refreshCachedNotes();
    };

    const handleOffline = () => {
      setIsOnline(false);
      refreshCachedNotes();
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Listen to custom cache update events
    const handleCacheUpdate = () => {
      refreshCachedNotes();
    };
    window.addEventListener('noteshare:offline-cache-updated', handleCacheUpdate);

    // Initial load of cached notes
    refreshCachedNotes();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('noteshare:offline-cache-updated', handleCacheUpdate);
    };
  }, [refreshCachedNotes]);

  return (
    <NetworkContext.Provider
      value={{
        isOnline,
        cachedNoteIds,
        cachedNotesOnly,
        setCachedNotesOnly,
        refreshCachedNotes,
      }}
    >
      {children}
    </NetworkContext.Provider>
  );
}

export function useNetwork() {
  return useContext(NetworkContext);
}
