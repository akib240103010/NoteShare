import React, { useState, useEffect } from 'react';
import {
  X,
  User,
  School,
  GraduationCap,
  Mail,
  FileText,
  Camera,
  Check,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Save,
  Sparkles,
  BookOpen,
  Award,
  Link as LinkIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import {
  supabase,
  updateUserProfile,
  fetchUserProfile,
  fetchUserNotesCount,
  isSupabaseConfigured,
} from '../lib/supabase';
import { UNIVERSITIES } from '../data/initialNotes';

// Curated high quality student avatar presets
const PRESET_AVATARS = [
  {
    id: 'avatar-1',
    label: 'Scholar 1',
    url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-2',
    label: 'Scholar 2',
    url: 'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-3',
    label: 'Scholar 3',
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-4',
    label: 'Scholar 4',
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-5',
    label: 'Scholar 5',
    url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150&auto=format&fit=crop&q=80',
  },
  {
    id: 'avatar-6',
    label: 'Scholar 6',
    url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80',
  },
];

export default function UserProfileModal({ isOpen, onClose, onToast, notesCount: propNotesCount = 0 }) {
  const { user, profile, refreshProfile, setProfile, setUser } = useAuth();
  const { isOnline } = useNetwork();

  // Form states
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [showCustomAvatarInput, setShowCustomAvatarInput] = useState(false);

  // User uploaded notes counter states
  const [uploadedCount, setUploadedCount] = useState(propNotesCount || 0);
  const [isCountLoading, setIsCountLoading] = useState(false);

  // Status states
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState({ type: '', text: '' });

  // Sync external notes count prop
  useEffect(() => {
    if (typeof propNotesCount === 'number') {
      setUploadedCount(propNotesCount);
    }
  }, [propNotesCount]);

  // Query exact count of notes uploaded by this user from Supabase
  const refreshUserNotesCount = async () => {
    if (!user?.id) return;
    if (isSupabaseConfigured) {
      try {
        setIsCountLoading(true);
        const exactCount = await fetchUserNotesCount(user.id);
        setUploadedCount(exactCount);
      } catch (err) {
        console.warn('Could not query exact notes count:', err);
      } finally {
        setIsCountLoading(false);
      }
    }
  };

  // Re-fetch notes count when modal opens or user changes
  useEffect(() => {
    if (isOpen && user?.id) {
      refreshUserNotesCount();
    }
  }, [isOpen, user?.id]);

  // Real-time counter updates: listen for app events & Supabase Postgres changes
  useEffect(() => {
    if (!user?.id) return;

    // 1. Intra-app event listener (fired immediately upon upload or delete in App.jsx)
    const handleLocalNoteUpdate = () => {
      refreshUserNotesCount();
    };
    window.addEventListener('noteshare:notes-updated', handleLocalNoteUpdate);

    // 2. Supabase Realtime channel subscription (cross-device/cross-tab CDC)
    let channel = null;
    if (isSupabaseConfigured && supabase) {
      channel = supabase
        .channel(`public:notes:user_count_${user.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'notes',
          },
          () => {
            refreshUserNotesCount();
          }
        )
        .subscribe();
    }

    return () => {
      window.removeEventListener('noteshare:notes-updated', handleLocalNoteUpdate);
      if (channel && supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [user?.id]);

  // Sync profile data when modal opens or user/profile changes
  useEffect(() => {
    if (!isOpen || !user) return;

    setStatusMsg({ type: '', text: '' });
    setIsLoading(true);

    const initData = async () => {
      let currentProf = profile;
      if (isSupabaseConfigured && user.id) {
        try {
          const fetched = await fetchUserProfile(user.id);
          if (fetched) currentProf = fetched;
        } catch (err) {
          console.warn('Could not re-fetch profile on modal open:', err);
        }
      }

      setFullName(
        currentProf?.full_name ||
          user.user_metadata?.full_name ||
          user.email?.split('@')[0] ||
          ''
      );
      setUniversity(
        currentProf?.university ||
          user.user_metadata?.university ||
          'Stanford University'
      );
      setDegree(
        currentProf?.degree ||
          user.user_metadata?.degree ||
          'B.S. Computer Science'
      );
      setBio(
        currentProf?.bio ||
          user.user_metadata?.bio ||
          'Undergraduate student sharing study guides, class notes, and exam summaries.'
      );
      setAvatarUrl(
        currentProf?.avatar_url ||
          user.user_metadata?.avatar_url ||
          ''
      );
      setIsLoading(false);
    };

    initData();
  }, [isOpen, user]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !user) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setStatusMsg({ type: 'error', text: 'Full Name is required.' });
      return;
    }

    if (!isOnline && isSupabaseConfigured) {
      setStatusMsg({
        type: 'error',
        text: 'You are currently offline. Profile updates require an active network connection.',
      });
      return;
    }

    setIsSaving(true);
    setStatusMsg({ type: '', text: '' });

    const updates = {
      full_name: fullName.trim(),
      university: university.trim(),
      degree: degree.trim(),
      bio: bio.trim(),
      avatar_url: avatarUrl.trim(),
    };

    try {
      if (isSupabaseConfigured) {
        // Save to Supabase DB and auth metadata respecting RLS auth.uid() = id
        await updateUserProfile(user.id, updates);
        await refreshProfile(user.id);
      } else {
        // Local Demo Mode
        const localUser = {
          ...user,
          user_metadata: {
            ...user.user_metadata,
            ...updates,
          },
        };
        localStorage.setItem('noteshare_demo_user', JSON.stringify(localUser));
        if (setUser) setUser(localUser);
        if (setProfile) {
          setProfile((prev) => ({
            ...prev,
            ...updates,
          }));
        }
      }

      setStatusMsg({
        type: 'success',
        text: 'Profile changes saved successfully!',
      });

      if (onToast) {
        onToast({
          type: 'success',
          title: 'Profile Updated',
          message: 'Your student profile information has been saved.',
        });
      }

      setTimeout(() => {
        onClose();
      }, 900);
    } catch (err) {
      console.error('Error updating user profile:', err);
      setStatusMsg({
        type: 'error',
        text: err.message || 'Failed to update profile. Please verify your Supabase permissions.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-fadeIn"
      onClick={onClose}
    >
      <div
        className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-gray-800/80 overflow-hidden animate-scaleUp text-gray-900 dark:text-gray-100 my-4"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Banner */}
        <div className="p-5 sm:p-6 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-gray-950 dark:via-indigo-950/80 dark:to-gray-950 text-white relative">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
                <User className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-xl font-bold tracking-tight">Student Profile</h2>
                <p className="text-xs text-indigo-200/80">
                  Manage your public scholar details and author identity
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Header Notes Counter Pill */}
              <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-xs font-semibold text-indigo-100 shadow-xs">
                <BookOpen className="w-3.5 h-3.5 text-indigo-300" />
                <span>{uploadedCount} {uploadedCount === 1 ? 'Note' : 'Notes'} Shared</span>
              </div>

              <button
                type="button"
                onClick={onClose}
                className="min-w-[38px] min-h-[38px] flex items-center justify-center rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* Modal Body Form */}
        <form onSubmit={handleSave} className="p-5 sm:p-6 space-y-5">
          {/* Status Message Notification */}
          {statusMsg.text && (
            <div
              className={`p-3.5 rounded-xl text-xs flex items-center gap-2.5 transition-all ${
                statusMsg.type === 'error'
                  ? 'bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 text-rose-700 dark:text-rose-300'
                  : 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 text-emerald-700 dark:text-emerald-300'
              }`}
            >
              {statusMsg.type === 'error' ? (
                <AlertCircle className="w-4 h-4 shrink-0" />
              ) : (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          {/* Prominent Notes Contribution Stat Counter */}
          <div className="p-4 rounded-2xl bg-linear-to-r from-indigo-50/90 via-violet-50/60 to-indigo-50/40 dark:from-indigo-950/50 dark:via-purple-950/30 dark:to-indigo-950/40 border border-indigo-100/90 dark:border-indigo-900/60 flex items-center justify-between gap-3 shadow-2xs">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20 shrink-0">
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-gray-200 uppercase tracking-wider">
                    Notes Uploaded
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                    Live Counter
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 dark:text-gray-400 truncate">
                  Total study documents contributed to the global library
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <div className="px-3.5 py-1.5 rounded-xl bg-white dark:bg-gray-800 border border-indigo-200/80 dark:border-indigo-800/80 shadow-xs flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="text-xl sm:text-2xl font-black text-indigo-600 dark:text-indigo-400 tracking-tight">
                  {isCountLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    uploadedCount
                  )}
                </span>
                <span className="text-xs font-semibold text-slate-500 dark:text-gray-400">
                  {uploadedCount === 1 ? 'Note' : 'Notes'}
                </span>
              </div>
            </div>
          </div>

          {/* Avatar Selection Section */}
          <div className="p-4 rounded-2xl bg-slate-50 dark:bg-gray-800/50 border border-slate-200/70 dark:border-gray-700/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-indigo-500" />
                <span>Profile Avatar</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCustomAvatarInput(!showCustomAvatarInput)}
                className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 cursor-pointer"
              >
                <LinkIcon className="w-3 h-3" />
                <span>{showCustomAvatarInput ? 'Hide Custom URL' : 'Use Custom Image URL'}</span>
              </button>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              {/* Active Avatar Preview */}
              <div className="relative group shrink-0">
                <div className="w-18 h-18 sm:w-20 sm:h-20 rounded-2xl bg-linear-to-tr from-indigo-500 to-violet-600 text-white flex items-center justify-center font-bold text-2xl shadow-md overflow-hidden ring-4 ring-indigo-500/20">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={fullName || 'Avatar'}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        e.target.style.display = 'none';
                      }}
                    />
                  ) : (
                    <span>{(fullName?.[0] || user.email?.[0] || 'S').toUpperCase()}</span>
                  )}
                </div>
              </div>

              {/* Avatar Presets Grid */}
              <div className="flex-1 w-full">
                <span className="block text-[11px] text-slate-500 dark:text-gray-400 mb-1.5">
                  Choose a student avatar preset or keep your initials:
                </span>
                <div className="flex items-center gap-2 flex-wrap">
                  {/* Reset to Initials Option */}
                  <button
                    type="button"
                    onClick={() => setAvatarUrl('')}
                    className={`w-9 h-9 rounded-xl border flex items-center justify-center text-xs font-bold transition-all cursor-pointer ${
                      !avatarUrl
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 ring-2 ring-indigo-500/30'
                        : 'border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-slate-600 dark:text-gray-300 hover:border-slate-400'
                    }`}
                    title="Use Initials Avatar"
                  >
                    {(fullName?.[0] || 'S').toUpperCase()}
                  </button>

                  {/* Preset Avatars */}
                  {PRESET_AVATARS.map((preset) => {
                    const isSelected = avatarUrl === preset.url;
                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => setAvatarUrl(preset.url)}
                        className={`relative w-9 h-9 rounded-xl overflow-hidden border transition-all cursor-pointer shrink-0 ${
                          isSelected
                            ? 'border-indigo-600 ring-2 ring-indigo-500/40 scale-105'
                            : 'border-slate-200 dark:border-gray-700 opacity-80 hover:opacity-100 hover:scale-105'
                        }`}
                        title={preset.label}
                      >
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover"
                        />
                        {isSelected && (
                          <div className="absolute inset-0 bg-indigo-600/30 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5 drop-shadow-md stroke-[3]" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Custom Image URL Input (collapsible) */}
            {showCustomAvatarInput && (
              <div className="pt-2 border-t border-slate-200/60 dark:border-gray-700/60">
                <input
                  type="url"
                  value={avatarUrl}
                  onChange={(e) => setAvatarUrl(e.target.value)}
                  placeholder="https://example.com/avatar.jpg"
                  className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
              </div>
            )}
          </div>

          {/* Grid of Inputs: Full Name & University */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Alex Morgan"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
                <User className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              </div>
            </div>

            {/* University / College */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                University / Institution
              </label>
              <div className="relative">
                <input
                  type="text"
                  list="university-suggestions"
                  value={university}
                  onChange={(e) => setUniversity(e.target.value)}
                  placeholder="e.g. Stanford University"
                  className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
                />
                <School className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <datalist id="university-suggestions">
                  {UNIVERSITIES.map((u) => (
                    <option key={u} value={u} />
                  ))}
                </datalist>
              </div>
            </div>
          </div>

          {/* Degree / Program & Academic Field */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
              Major / Degree Program
            </label>
            <div className="relative">
              <input
                type="text"
                value={degree}
                onChange={(e) => setDegree(e.target.value)}
                placeholder="e.g. B.S. Computer Science & AI"
                className="w-full pl-9 pr-3 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40"
              />
              <GraduationCap className="w-4 h-4 text-slate-400 absolute left-3 top-3 pointer-events-none" />
            </div>
          </div>

          {/* Student Bio */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-semibold text-slate-700 dark:text-gray-300 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
                <span>Student Bio & Academic Focus</span>
              </label>
              <span className="text-[10px] text-slate-400 dark:text-gray-500">
                {bio.length}/240
              </span>
            </div>
            <textarea
              rows={3}
              maxLength={240}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell other students about your courses, research focus, or study group interests..."
              className="w-full p-3 text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/40 resize-none leading-relaxed"
            />
          </div>

          {/* Read-Only Account Security & Email Badge */}
          <div className="p-3.5 rounded-2xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/80 dark:border-indigo-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs">
            <div className="flex items-center gap-2 text-slate-600 dark:text-gray-300 min-w-0">
              <Mail className="w-4 h-4 text-indigo-500 shrink-0" />
              <span className="truncate font-mono">{user.email}</span>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>RLS Protected (Owner Only)</span>
            </div>
          </div>

          {/* Modal Footer Actions */}
          <div className="pt-2 flex items-center justify-end gap-3 border-t border-slate-100 dark:border-gray-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer min-h-[44px]"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white text-xs sm:text-sm font-semibold shadow-md shadow-indigo-500/20 hover:shadow-lg transition-all cursor-pointer min-h-[44px] disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Saving Changes...</span>
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>Save Changes</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
