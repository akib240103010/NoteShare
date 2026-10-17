import React, { useState } from 'react';
import { WifiOff, Wifi, HardDriveDownload, RefreshCw, AlertCircle } from 'lucide-react';
import { useNetwork } from '../context/NetworkContext';

export default function OfflineBanner() {
  const { isOnline, cachedNoteIds, cachedNotesOnly, setCachedNotesOnly, refreshCachedNotes } = useNetwork();
  const [isChecking, setIsChecking] = useState(false);

  const handleCheckConnection = async () => {
    setIsChecking(true);
    try {
      // Try to fetch a lightweight timestamp or favicon
      const res = await fetch('/favicon.svg?t=' + Date.now(), { method: 'HEAD', cache: 'no-store' });
      if (res.ok) {
        window.location.reload();
      }
    } catch {
      // Still offline
    } finally {
      setTimeout(() => setIsChecking(false), 800);
      refreshCachedNotes();
    }
  };

  if (isOnline) {
    return null;
  }

  return (
    <div
      role="status"
      aria-live="polite"
      className="w-full bg-linear-to-r from-amber-500/90 via-orange-500/90 to-amber-600/90 text-white backdrop-blur-md px-3 sm:px-6 py-2 shadow-sm border-b border-amber-600/40 animate-fadeIn text-xs z-30"
    >
      <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
        
        {/* Left: Offline Status & Message */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-6 h-6 rounded-lg bg-black/20 flex items-center justify-center shrink-0">
            <WifiOff className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5 leading-tight">
            <span className="font-extrabold tracking-wide uppercase text-[11px] bg-black/25 px-2 py-0.5 rounded-md">
              Offline Mode
            </span>
            <span className="font-semibold text-white">
              Viewing cached notes.
            </span>
            <span className="text-amber-100 hidden md:inline">
              Live actions like uploading or creating new accounts are temporarily disabled until connection is restored.
            </span>
          </div>
        </div>

        {/* Right: Cached Notes Filter Toggle & Retry Button */}
        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {cachedNoteIds.length > 0 && (
            <button
              type="button"
              onClick={() => setCachedNotesOnly(!cachedNotesOnly)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer ${
                cachedNotesOnly
                  ? 'bg-white text-amber-900 shadow-xs'
                  : 'bg-black/20 hover:bg-black/30 text-white border border-white/20'
              }`}
              title={cachedNotesOnly ? 'Show all notes' : 'Filter to show only cached offline notes'}
            >
              <HardDriveDownload className="w-3 h-3" />
              <span>
                {cachedNotesOnly
                  ? `Showing ${cachedNoteIds.length} Cached`
                  : `Filter Cached (${cachedNoteIds.length})`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={handleCheckConnection}
            disabled={isChecking}
            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-white/20 hover:bg-white/30 text-white border border-white/30 transition-all cursor-pointer disabled:opacity-60"
            title="Check if internet connection is restored"
          >
            <RefreshCw className={`w-3 h-3 ${isChecking ? 'animate-spin' : ''}`} />
            <span>{isChecking ? 'Checking...' : 'Check Status'}</span>
          </button>
        </div>

      </div>
    </div>
  );
}
