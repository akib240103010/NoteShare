import React, { useState } from 'react';
import {
  X,
  Database,
  CloudUpload,
  Key,
  ShieldCheck,
  CheckCircle2,
  Copy,
  Check,
  ExternalLink,
  HelpCircle,
  FileCode,
  Sparkles,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { createClient } from '@supabase/supabase-js';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseConfigured,
  setCustomSupabaseCredentials,
  sanitizeSupabaseUrl,
  sanitizeSupabaseKey,
  resetProfilesTableState,
} from '../lib/supabase';

export default function SupabaseConfigModal({ isOpen, onClose, onToast }) {
  const [urlInput, setUrlInput] = useState(SUPABASE_URL);
  const [keyInput, setKeyInput] = useState(SUPABASE_ANON_KEY);
  const [geminiKeyInput, setGeminiKeyInput] = useState(
    typeof window !== 'undefined'
      ? localStorage.getItem('noteshare_gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY || ''
      : ''
  );
  const [copiedSql, setCopiedSql] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [statusBanner, setStatusBanner] = useState(null);

  if (!isOpen) return null;

  const handleUrlChange = (e) => {
    const val = e.target.value;
    if (val.includes('[') || val.includes('(') || val.includes('"') || val.includes("'") || val.includes('<')) {
      setUrlInput(sanitizeSupabaseUrl(val));
    } else {
      setUrlInput(val);
    }
  };

  const handleUrlBlur = () => {
    if (urlInput) {
      setUrlInput(sanitizeSupabaseUrl(urlInput));
    }
  };

  const handleUrlPaste = (e) => {
    const text = e.clipboardData?.getData('text');
    if (text) {
      e.preventDefault();
      setUrlInput(sanitizeSupabaseUrl(text));
    }
  };

  const handleKeyChange = (e) => {
    const val = e.target.value;
    if (val.includes('[') || val.includes('(') || val.includes('"') || val.includes("'") || val.includes('Bearer ') || val.includes('key=')) {
      setKeyInput(sanitizeSupabaseKey(val));
    } else {
      setKeyInput(val);
    }
  };

  const handleKeyBlur = () => {
    if (keyInput) {
      setKeyInput(sanitizeSupabaseKey(keyInput));
    }
  };

  const handleKeyPaste = (e) => {
    const text = e.clipboardData?.getData('text');
    if (text) {
      e.preventDefault();
      setKeyInput(sanitizeSupabaseKey(text));
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setStatusBanner(null);

    const cleanUrl = sanitizeSupabaseUrl(urlInput);
    const cleanKey = sanitizeSupabaseKey(keyInput);

    setUrlInput(cleanUrl);
    setKeyInput(cleanKey);

    // Save Gemini key
    if (geminiKeyInput.trim()) {
      localStorage.setItem('noteshare_gemini_api_key', geminiKeyInput.trim());
    } else {
      localStorage.removeItem('noteshare_gemini_api_key');
    }

    // Case 1: Both fields are empty -> Revert to demo / local fallback mode
    if (!cleanUrl && !cleanKey) {
      setCustomSupabaseCredentials('', '', false);
      const toastData = {
        type: 'info',
        title: 'Local Fallback Mode',
        message: 'Reverted to demo / local fallback mode. Local storage is active.',
      };
      try {
        sessionStorage.setItem('noteshare_flash_toast', JSON.stringify(toastData));
      } catch (err) {}
      onToast?.(toastData);
      setStatusBanner({ type: 'info', message: 'Reverted to local demo mode. Refreshing...' });
      setTimeout(() => {
        window.location.reload();
      }, 700);
      return;
    }

    // Case 2: Incomplete credentials
    if (!cleanUrl || !cleanKey) {
      const toastData = {
        type: 'error',
        title: 'Incomplete Credentials',
        message: 'Please provide both the Supabase Project URL and Anon Public Key.',
      };
      onToast?.(toastData);
      setStatusBanner({ type: 'error', message: 'Both Supabase URL and Anon Key are required to connect.' });
      return;
    }

    // Case 3: Invalid URL format
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      const toastData = {
        type: 'error',
        title: 'Invalid Supabase URL',
        message: 'Project URL must begin with https:// (e.g., https://your-project.supabase.co).',
      };
      onToast?.(toastData);
      setStatusBanner({ type: 'error', message: 'Project URL must begin with https://.' });
      return;
    }

    // Case 4: Verify connection with Supabase Client
    setIsConnecting(true);
    setStatusBanner({ type: 'info', message: 'Verifying live connection to Supabase cloud...' });

    try {
      const testClient = createClient(cleanUrl, cleanKey, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      });

      // Quick 4.5s connectivity check
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timed out. Check your project status or network.')), 4500)
      );

      const checkPromise = testClient.from('notes').select('id', { count: 'exact', head: true });
      const { error } = await Promise.race([checkPromise, timeoutPromise]);

      if (
        error &&
        (error.code === 'PGRST301' ||
          error.message?.toLowerCase().includes('jwt') ||
          error.message?.toLowerCase().includes('apikey') ||
          error.message?.toLowerCase().includes('invalid api key'))
      ) {
        setIsConnecting(false);
        const toastData = {
          type: 'error',
          title: 'Invalid Supabase Anon Key',
          message: 'Supabase rejected the Anon API Key. Please verify your Project API Key from Settings > API.',
        };
        onToast?.(toastData);
        setStatusBanner({ type: 'error', message: 'Invalid Anon Key: rejected by Supabase.' });
        return;
      }

      // Live Supabase cloud connection established!
      resetProfilesTableState();
      setCustomSupabaseCredentials(cleanUrl, cleanKey, false);
      const toastData = {
        type: 'success',
        title: 'Supabase Connected!',
        message: `Connected to ${cleanUrl}. Live cloud database and storage are active.`,
      };
      try {
        sessionStorage.setItem('noteshare_flash_toast', JSON.stringify(toastData));
      } catch (err) {}
      onToast?.(toastData);
      setStatusBanner({
        type: 'success',
        message: 'Live connection verified! Refreshing application...',
      });

      setTimeout(() => {
        window.location.reload();
      }, 800);
    } catch (err) {
      console.warn('Supabase connection test error:', err);
      setIsConnecting(false);
      const toastData = {
        type: 'error',
        title: 'Supabase Connection Failed',
        message: `Could not reach ${cleanUrl}. Falling back to Demo/Local Mode. (${err.message || 'Network error'})`,
      };
      onToast?.(toastData);
      setStatusBanner({
        type: 'error',
        message: `Connection failed: ${err.message || 'Host unreachable'}. Falling back to Demo/Local Mode.`,
      });
    }
  };

  const handleReset = () => {
    resetProfilesTableState();
    setCustomSupabaseCredentials('', '', false);
    localStorage.removeItem('noteshare_gemini_api_key');
    setUrlInput('');
    setKeyInput('');
    const toastData = {
      type: 'info',
      title: 'Local Fallback Mode',
      message: 'Supabase credentials cleared. Switched to demo / local fallback mode.',
    };
    try {
      sessionStorage.setItem('noteshare_flash_toast', JSON.stringify(toastData));
    } catch (err) {}
    onToast?.(toastData);
    setStatusBanner({ type: 'info', message: 'Reverted to local demo mode. Reloading...' });
    setTimeout(() => {
      window.location.reload();
    }, 700);
  };

  const handleCopySql = () => {
    const sqlSnippet = `-- NoteShare Supabase Setup: Run in Supabase SQL Editor
-- 1. Create public.profiles linked directly to auth.users
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  university TEXT NOT NULL,
  degree TEXT,
  bio TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles are viewable by everyone" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Students can insert their own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Students can update their own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- 2. Trigger: Automatically creates a profile row when a new student signs up
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, university, created_at, updated_at)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'university', 'Global University'),
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    university = EXCLUDED.university,
    updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 3. Create notes metadata table
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL,
  author TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id),
  author_degree TEXT,
  author_avatar TEXT,
  university TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT,
  academic_level TEXT DEFAULT 'Undergraduate',
  resource_type TEXT DEFAULT 'Lecture Notes',
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  file_url TEXT,
  file_name TEXT,
  file_size TEXT,
  file_type TEXT,
  pages INT DEFAULT 1,
  rating NUMERIC DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  downloads INT DEFAULT 0,
  views INT DEFAULT 0,
  verified BOOLEAN DEFAULT true,
  pages_content JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure optional columns exist if table was already created
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS author_degree TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT true;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS pages_content JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Authenticated students can read and download notes" ON public.notes;
DROP POLICY IF EXISTS "Public can view all notes" ON public.notes;
DROP POLICY IF EXISTS "Anyone can read and download notes" ON public.notes;
CREATE POLICY "Anyone can read and download notes" ON public.notes FOR SELECT USING (true);
CREATE POLICY "Authenticated students can insert notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Students can only update their own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id);
CREATE POLICY "Students can only delete their own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- 4. RPC Functions for atomic download counter and community upvotes
CREATE OR REPLACE FUNCTION public.increment_note_downloads(target_note_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.notes
  SET downloads = COALESCE(downloads, 0) + 1
  WHERE id = target_note_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_note_upvotes(target_note_id UUID, new_rating NUMERIC)
RETURNS void LANGUAGE sql SECURITY DEFINER AS $$
  UPDATE public.notes
  SET rating = new_rating, reviews_count = COALESCE(reviews_count, 0) + 1
  WHERE id = target_note_id;
$$;

-- 5. Create cloud storage bucket for notes attachments
INSERT INTO storage.buckets (id, name, public) VALUES ('notes-files', 'notes-files', true)
ON CONFLICT (id) DO NOTHING;
CREATE POLICY "Public read files" ON storage.objects FOR SELECT USING (bucket_id = 'notes-files');
CREATE POLICY "Anyone upload files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'notes-files');`;

    navigator.clipboard.writeText(sqlSnippet);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="min-h-full flex items-center justify-center">
        <div
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-gray-800/80 overflow-hidden my-auto animate-scaleUp text-gray-900 dark:text-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header */}
        <div className="p-6 bg-slate-900 dark:bg-gray-950 text-white flex items-center justify-between border-b border-slate-800 dark:border-gray-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold">Supabase Cloud Integration</h3>
              <p className="text-xs text-slate-300 dark:text-gray-400">
                Auth, Notes Metadata, and Cloud Storage Bucket
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 dark:hover:bg-gray-800 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Status Highlight Banner */}
        <div className="p-6 border-b border-slate-100 dark:border-gray-800 bg-slate-50/90 dark:bg-gray-950/80">
          <div className="flex items-start gap-3">
            {isSupabaseConfigured ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
            ) : (
              <HelpCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
            )}
            <div>
              <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100">
                {isSupabaseConfigured
                  ? 'Connected to Live Supabase Backend'
                  : 'Currently in Demo / Local Fallback Mode'}
              </h4>
              <p className="text-xs text-slate-600 dark:text-gray-300 mt-1 leading-relaxed">
                {isSupabaseConfigured
                  ? `Active project URL: ${SUPABASE_URL}. All authentication, note metadata, and storage bucket uploads are synchronized with your Supabase cloud backend.`
                  : 'The frontend works seamlessly out of the box using local storage. To connect to your Supabase project for real cloud database persistence, user auth, and file uploads to the "notes-files" bucket, enter your credentials below.'}
              </p>
            </div>
          </div>
        </div>

        {/* Live Status / Error Notification Banner */}
        {statusBanner && (
          <div
            className={`px-6 py-3 border-b text-xs flex items-center gap-2.5 transition-all ${
              statusBanner.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/60'
                : statusBanner.type === 'error'
                ? 'bg-rose-50 dark:bg-rose-950/50 text-rose-800 dark:text-rose-300 border-rose-200 dark:border-rose-800/60'
                : 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-800 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/60'
            }`}
          >
            {statusBanner.type === 'success' && <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />}
            {statusBanner.type === 'error' && <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 dark:text-rose-400" />}
            {statusBanner.type === 'info' && <HelpCircle className="w-4 h-4 shrink-0 text-indigo-600 dark:text-indigo-400" />}
            <span className="font-medium leading-relaxed">{statusBanner.message}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Supabase Project URL
            </label>
            <div className="relative">
              <ExternalLink className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={urlInput}
                onChange={handleUrlChange}
                onBlur={handleUrlBlur}
                onPaste={handleUrlPaste}
                placeholder="https://xxxxxxxx.supabase.co"
                className="w-full text-xs font-mono rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Supports raw URLs or Markdown links (e.g. <code className="bg-slate-100 dark:bg-gray-800 px-1 py-0.5 rounded text-emerald-600 dark:text-emerald-400">https://xyz.supabase.co</code>) and auto-strips formatting.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Supabase Anon Public API Key
            </label>
            <div className="relative">
              <Key className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={keyInput}
                onChange={handleKeyChange}
                onBlur={handleKeyBlur}
                onPaste={handleKeyPaste}
                placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6..."
                className="w-full text-xs font-mono rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Public anon client key found in Supabase Project Settings &gt; API.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Google Gemini API Key (Note Verification)
              </label>
              <span className="text-[10px] text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200/50 dark:border-indigo-800/60 px-1.5 py-0.5 rounded font-medium">
                Gemini 2.5 Flash
              </span>
            </div>
            <div className="relative">
              <Sparkles className="w-4 h-4 text-indigo-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                value={geminiKeyInput}
                onChange={(e) => setGeminiKeyInput(e.target.value)}
                placeholder="AIzaSy... (or set GEMINI_API_KEY in .env)"
                className="w-full text-xs font-mono rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Powers the <code className="bg-slate-100 dark:bg-gray-800 px-1 py-0.5 rounded text-indigo-600 dark:text-indigo-400">/api/verify-note</code> endpoint to parse PDFs and validate note content against the declared topic/subject.
            </p>
          </div>

          {/* Quick SQL Schema Copy */}
          <div className="pt-2">
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-gray-800 border border-slate-200 dark:border-gray-700 flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs text-slate-700 dark:text-gray-300">
                <FileCode className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                <span className="font-semibold">Database & Storage SQL Setup:</span>
                <span className="text-slate-500 dark:text-gray-400 text-[11px]">(supabase_setup.sql)</span>
              </div>
              <button
                type="button"
                onClick={handleCopySql}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white dark:bg-gray-700 border border-slate-200 dark:border-gray-600 hover:bg-slate-100 dark:hover:bg-gray-600 text-xs font-semibold text-slate-700 dark:text-gray-200 transition-colors shadow-2xs cursor-pointer"
              >
                {copiedSql ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5 text-slate-500 dark:text-gray-400" />
                    <span>Copy SQL</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Email Confirmation Configuration Guide for Developers */}
          <div className="pt-1">
            <div className="p-3.5 rounded-2xl bg-amber-50/70 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-800/40 text-xs text-amber-900 dark:text-amber-200 space-y-2">
              <div className="flex items-center gap-1.5 font-bold text-amber-800 dark:text-amber-300">
                <Sparkles className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                <span>Fix "Site Can't Be Reached" &amp; Enable Instant Logins:</span>
              </div>
              <p className="text-[11px] text-slate-600 dark:text-gray-300 leading-relaxed">
                By default, Supabase sends confirmation links to <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300">http://localhost:3000</code>, causing <strong>"This site can't be reached"</strong>. Follow these quick steps to fix it:
              </p>
              <ol className="text-[11px] text-slate-700 dark:text-gray-300 list-decimal list-inside space-y-1">
                <li>
                  <strong>Fix Site URL / Redirects:</strong> In Supabase Dashboard, go to <strong>Authentication &gt; URL Configuration</strong>. Set <strong>Site URL</strong> to <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300 font-mono">http://localhost:5173</code> and add <code className="bg-amber-100 dark:bg-amber-900/60 px-1 py-0.5 rounded text-amber-800 dark:text-amber-300 font-mono">http://localhost:5173/**</code> under <strong>Redirect URLs</strong>.
                </li>
                <li>
                  <strong>Instant Sign-In without Email Links (Recommended):</strong> Under <strong>Authentication &gt; Providers &gt; Email</strong>, toggle <strong>"Confirm email"</strong> to <strong>OFF</strong>. Test accounts will sign in immediately.
                </li>
                <li>
                  <strong>Manually Verify Existing Account:</strong> In <strong>Authentication &gt; Users</strong>, click the <strong>...</strong> menu next to your email (<code className="font-mono text-indigo-600 dark:text-indigo-400">akib240103010@iiitmanipur.ac.in</code>) and select <strong>"Confirm email"</strong>.
                </li>
              </ol>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-3 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between">
            <button
              type="button"
              onClick={handleReset}
              className="text-xs text-slate-500 dark:text-gray-400 hover:text-rose-600 dark:hover:text-rose-400 font-medium transition-colors cursor-pointer"
            >
              Reset to Demo Mode
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-gray-300 hover:bg-slate-100 dark:hover:bg-gray-800 transition-colors cursor-pointer"
              >
                Close
              </button>
              <button
                type="submit"
                disabled={isConnecting}
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 disabled:cursor-not-allowed text-white transition-all shadow-md shadow-emerald-500/20 cursor-pointer"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Connecting...</span>
                  </>
                ) : (
                  <span>Save & Connect</span>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
