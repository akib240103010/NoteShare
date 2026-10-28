import React, { useState, useEffect } from 'react';
import {
  GraduationCap,
  Mail,
  Lock,
  User,
  School,
  BookOpen,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Search,
  Database,
  Layers,
  FileText,
  Users,
  WifiOff,
  HardDriveDownload,
  Send,
  KeyRound,
  UserPlus,
  MailCheck,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNetwork } from '../context/NetworkContext';
import { parseAuthError } from '../lib/supabase';
import ThemeToggle from './ThemeToggle';
import SupabaseConfigModal from './SupabaseConfigModal';
import AnimeBackground from './AnimeBackground';

/**
 * AuthGuard Component
 *
 * Checks the active Supabase session state on initial app load.
 * - If session is loading: Displays a clean verification screen with animated loader.
 * - If unauthenticated: Completely blocks access to dashboard, search, categories, and note viewer,
 *   displaying a full-page auth screen with the message:
 *   "Please sign up or log in to access global student notes."
 * - If offline: Provides an instant offline mode bypass to access cached notes.
 * - If authenticated: Smoothly renders children (the main platform).
 */
export default function AuthGuard({ children }) {
  const {
    user,
    loading,
    login,
    register,
    loginAsDemo,
    resendConfirmation,
    resetPassword,
    isConfigured,
  } = useAuth();
  const { isAnime, isDark, animeWallpaper } = useTheme();
  const { isOnline, cachedNoteIds } = useNetwork();
  const [allowOfflineBypass, setAllowOfflineBypass] = useState(false);

  const [tab, setTab] = useState('login'); // 'login' | 'signup'
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authErrorDetails, setAuthErrorDetails] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [isConfigOpen, setIsConfigOpen] = useState(false);

  // Password reset state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Resend email confirmation state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');

  // 1. Initial Session Checking State
  if (loading) {
    return (
      <div
        className={`min-h-screen w-full flex flex-col items-center justify-center p-4 transition-colors duration-300 relative ${
          isAnime
            ? 'text-gray-100'
            : isDark
            ? 'bg-gray-950 text-gray-100'
            : 'bg-white text-gray-900'
        }`}
      >
        <AnimeBackground />
        <div className="relative z-10 flex flex-col items-center text-center space-y-4 max-w-sm animate-scaleUp">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-xl shadow-indigo-500/30 animate-pulse">
              <GraduationCap className="w-9 h-9" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white dark:border-gray-900">
              <Sparkles className="w-3.5 h-3.5" />
            </div>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">
              NoteShare
            </h2>
            <p className="text-xs text-slate-500 dark:text-gray-400 mt-1">
              Verifying student credentials & active session...
            </p>
          </div>

          {/* Animated Loading Bar */}
          <div className="w-48 h-1.5 bg-slate-200 dark:bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-linear-to-r from-indigo-500 to-pink-500 rounded-full animate-pulse w-3/4" />
          </div>
        </div>
      </div>
    );
  }

  // 2. Authenticated State (or Offline Bypass): Smoothly Render Children
  if (user || (!isOnline && allowOfflineBypass)) {
    return (
      <div className="w-full min-h-screen animate-fadeIn">
        {children}
      </div>
    );
  }

  // 3. Unauthenticated State: Completely Block Dashboard and Display Auth Screen
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) {
      setErrorMsg('You are currently offline. Connecting to Supabase requires an active network connection.');
      return;
    }
    setErrorMsg('');
    setAuthErrorDetails(null);
    setSuccessMsg('');
    setSubmitting(true);

    try {
      const cleanEmail = email.trim().toLowerCase();
      if (tab === 'login') {
        if (!cleanEmail || !password.trim()) {
          throw new Error('Please enter both your email address and password.');
        }
        await login(cleanEmail, password);
        setSuccessMsg('Welcome back! Signed in successfully.');
      } else {
        if (!cleanEmail || !password.trim()) {
          throw new Error('Email and password are required.');
        }
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters long.');
        }
        await register(cleanEmail, password, {
          fullName: fullName.trim() || 'Student Scholar',
          university: university.trim() || 'Global University',
          degree: degree.trim() || 'Undergraduate',
        });
        setSuccessMsg('Student account created successfully! Access granted.');
      }
    } catch (err) {
      console.error(err);
      const parsed = err.parsed || parseAuthError(err);
      setAuthErrorDetails(parsed);
      setErrorMsg(parsed.message || err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = async () => {
    setErrorMsg('');
    setAuthErrorDetails(null);
    setSuccessMsg('');
    setSubmitting(true);
    try {
      if (loginAsDemo) {
        loginAsDemo('alex.scholar@mit.edu');
      } else {
        await login('alex.scholar@mit.edu', 'demo123456');
      }
      setSuccessMsg('Logged in as Demo Student Scholar!');
    } catch (err) {
      setErrorMsg(err.message || 'Demo login failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email above to receive a password reset link.');
      return;
    }
    setResetLoading(true);
    setResetSuccess(false);
    try {
      await resetPassword(cleanEmail);
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 5000);
    } catch (err) {
      const parsed = err.parsed || parseAuthError(err);
      setErrorMsg(parsed.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email above to receive the confirmation link.');
      return;
    }
    setResendLoading(true);
    setResendSent(false);
    try {
      await resendConfirmation(cleanEmail);
      setResendSent(true);
      setSuccessMsg(`Confirmation email sent to ${cleanEmail}! Please check your inbox and verify your email.`);
    } catch (err) {
      const parsed = err.parsed || parseAuthError(err);
      setErrorMsg(parsed.message || 'Failed to resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div
      className={`min-h-screen w-full flex flex-col font-sans transition-colors duration-300 relative overflow-x-hidden ${
        isAnime
          ? 'text-gray-100 selection:bg-pink-500 selection:text-white'
          : isDark
          ? 'bg-gray-950 text-gray-100 selection:bg-indigo-500 selection:text-white'
          : 'bg-white text-gray-900 selection:bg-indigo-500 selection:text-white'
      }`}
    >
      <AnimeBackground />
      {/* Top Navigation Bar on Auth Screen */}
      <header className="relative z-20 w-full border-b border-slate-200/80 dark:border-gray-800/80 bg-white/80 dark:bg-gray-900/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-linear-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-md shadow-indigo-500/20">
            <GraduationCap className="w-5 h-5" />
          </div>
          <div>
            <span className="text-base sm:text-lg font-bold bg-linear-to-r from-indigo-600 to-violet-600 dark:from-indigo-400 dark:to-violet-400 bg-clip-text text-transparent">
              NoteShare
            </span>
            <span className="hidden sm:inline-block ml-2 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/50 dark:border-indigo-800/50">
              Student Platform
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {/* Backend Status Badge */}
          <button
            type="button"
            onClick={() => setIsConfigOpen(true)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-[11px] font-medium transition-colors cursor-pointer bg-slate-50 dark:bg-gray-800 hover:bg-slate-100 dark:hover:bg-gray-700 border-slate-200 dark:border-gray-700 text-slate-600 dark:text-gray-300"
            title="Supabase Backend Configuration"
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isConfigured ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <Database className="w-3.5 h-3.5 text-slate-400 dark:text-gray-500" />
            <span className="hidden md:inline">
              {isConfigured ? 'Supabase Connected' : 'Demo Mode'}
            </span>
          </button>

          {/* Theme Toggle (Light, Dark, Anime, Auto) */}
          <ThemeToggle size="sm" />
        </div>
      </header>

      {/* Main Auth Hero & Guard Container */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-10">
        <div className="w-full max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          
          {/* Left Column: Platform Mission & Required Message Announcement */}
          <div className="lg:col-span-5 space-y-6 text-left">
            
            {/* Required Clear Access Message Callout */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/70 border border-indigo-200 dark:border-indigo-800/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold shadow-xs">
              <Sparkles className="w-4 h-4 text-indigo-500" />
              <span>Restricted Student Portal</span>
            </div>

            <div className="space-y-3">
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight leading-tight">
                Please sign up or log in to access global student notes.
              </h1>
              <p className="text-sm sm:text-base text-slate-600 dark:text-gray-300 leading-relaxed">
                Connect with thousands of students worldwide sharing peer-reviewed lecture summaries, revision flashcards, and exam solutions across 9 academic disciplines.
              </p>
            </div>

            {/* Feature Highlights Grid */}
            <div className="space-y-3 pt-2">
              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-slate-200/80 dark:border-gray-800/80 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                  <Search className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200">
                    Real-Time Course Search & Filtering
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    Filter by university, course code, instructor, semester, and resource type.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-slate-200/80 dark:border-gray-800/80 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400 flex items-center justify-center shrink-0">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200">
                    Full-Screen PDF Reader & Previews
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    Touch pinch-to-zoom on mobile and full-screen navigation for distraction-free study.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-2xl bg-white/70 dark:bg-gray-900/70 border border-slate-200/80 dark:border-gray-800/80 shadow-2xs">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-800 dark:text-gray-200">
                    Verified University Scholar Profiles
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-gray-400">
                    Automatic Supabase database profile sync with college badges and contributor recognition.
                  </p>
                </div>
              </div>
            </div>

            {/* Community Stats */}
            <div className="pt-2 flex items-center gap-4 text-xs font-semibold text-slate-500 dark:text-gray-400">
              <span className="flex items-center gap-1.5">
                <Users className="w-4 h-4 text-indigo-500" />
                8,500+ Active Students
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-pink-500" />
                12,000+ Verified Notes
              </span>
            </div>

          </div>

          {/* Right Column: High-Contrast Auth Card Form */}
          <div className="lg:col-span-7">
            <div className="w-full max-w-lg mx-auto bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-slate-200/90 dark:border-gray-800/80 overflow-hidden text-gray-900 dark:text-gray-100 animate-scaleUp">
              
              {/* Card Header with Tabs */}
              <div className="p-6 sm:p-7 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-gray-950 dark:via-indigo-950 dark:to-gray-950 text-white">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-10 h-10 rounded-2xl bg-linear-to-tr from-indigo-500 to-violet-500 flex items-center justify-center shadow-md">
                      <GraduationCap className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-white">
                        Student Authentication
                      </h3>
                      <p className="text-xs text-indigo-300">
                        {tab === 'login'
                          ? 'Log in to continue to your study materials'
                          : 'Sign up to unlock all global student notes'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Tab Switcher */}
                <div className="grid grid-cols-2 p-1 rounded-xl bg-slate-800/80 dark:bg-gray-800/90 border border-slate-700/60 dark:border-gray-700/60">
                  <button
                    type="button"
                    onClick={() => {
                      setTab('login');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`min-h-[44px] py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      tab === 'login'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Log In
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setTab('signup');
                      setErrorMsg('');
                      setSuccessMsg('');
                    }}
                    className={`min-h-[44px] py-2 rounded-lg text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                      tab === 'signup'
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Create Account
                  </button>
                </div>
              </div>

              {/* Form Content */}
              <form onSubmit={handleSubmit} className="p-6 sm:p-7 space-y-4">
                
                {/* Offline Warning & Bypass Option */}
                {!isOnline && (
                  <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 text-xs flex flex-col gap-2.5 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <WifiOff className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-bold text-sm block">Offline Mode Detected</span>
                        <p className="mt-0.5 text-amber-800 dark:text-amber-300">
                          Cloud registration is unavailable without internet, but NoteShare lets you access your locally cached study notes and PDFs offline.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setAllowOfflineBypass(true)}
                      className="w-full min-h-[44px] py-2 px-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                    >
                      <HardDriveDownload className="w-4 h-4" />
                      <span>Browse Cached Notes Offline {cachedNoteIds.length > 0 ? `(${cachedNoteIds.length} Available)` : ''}</span>
                    </button>
                  </div>
                )}


                {/* Unconfirmed Email Special Action Banner */}
                {(authErrorDetails?.type === 'email_not_confirmed' ||
                  /email.*not.*confirmed/i.test(errorMsg)) && (
                  <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-3 animate-fadeIn">
                    <div className="flex items-start gap-2.5">
                      <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold text-sm block">Account Pending Email Confirmation</span>
                        <p className="text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                          Your account ({email.trim() || 'this email'}) was created with email confirmation enabled in Supabase, but the email has not been confirmed yet.
                        </p>
                      </div>
                    </div>

                    {resendSent ? (
                      <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/60 text-emerald-800 dark:text-emerald-200 text-xs flex items-center gap-2">
                        <CheckCircle className="w-4 h-4 text-emerald-600 shrink-0" />
                        <span>Confirmation email resent! Please check your student inbox (and Spam folder) to verify.</span>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={handleResendConfirmation}
                          disabled={resendLoading}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs transition-colors cursor-pointer shadow-xs"
                        >
                          <Mail className="w-3.5 h-3.5" />
                          <span>{resendLoading ? 'Sending Link...' : 'Resend Confirmation Email'}</span>
                        </button>

                        <button
                          type="button"
                          onClick={handleDemoLogin}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-bold text-xs transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                          <span>Enter in Instant Guest Mode</span>
                        </button>
                      </div>
                    )}

                    {/* Supabase Dashboard 1-Click Fix Instructions */}
                    <div className="p-3 rounded-xl bg-white/90 dark:bg-gray-800/90 border border-amber-200/80 dark:border-amber-800/40 text-[11px] space-y-1.5">
                      <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                        <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                        <span>Admin Fix (Enable 1-Click Instant Sign-In for all users):</span>
                      </div>
                      <div className="text-slate-700 dark:text-gray-300 space-y-1 pt-0.5">
                        <p>
                          <strong>1. Turn OFF Email Confirmation:</strong> In <strong>Supabase Dashboard &gt; Authentication &gt; Providers &gt; Email</strong>, toggle <strong>"Confirm email"</strong> to <strong>OFF</strong>. Users can log in immediately with their password without email codes.
                        </p>
                        <p>
                          <strong>2. Confirm Existing Account:</strong> In <strong>Authentication &gt; Users</strong>, click the <strong>...</strong> menu next to <strong>{email.trim() || 'your email'}</strong> and select <strong>"Confirm email"</strong>.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMsg('');
                          setAuthErrorDetails(null);
                        }}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline font-semibold cursor-pointer"
                      >
                        Try Logging In Again
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsConfigOpen(true)}
                        className="text-xs text-amber-800 dark:text-amber-300 underline font-semibold cursor-pointer"
                      >
                        Supabase Config
                      </button>
                    </div>
                  </div>
                )}

                {/* Standard Feedback Alert (if not email confirmation error) */}
                {errorMsg &&
                  authErrorDetails?.type !== 'email_not_confirmed' &&
                  !/email.*not.*confirmed/i.test(errorMsg) && (
                    <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/70 border border-rose-200 dark:border-rose-900/60 space-y-2 text-xs text-rose-700 dark:text-rose-300 animate-fadeIn">
                      <div className="flex items-start gap-2.5">
                        <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{errorMsg}</span>
                      </div>
                      {authErrorDetails?.type === 'rate_limit' && (
                        <div className="pt-1">
                          <button
                            type="button"
                            onClick={handleDemoLogin}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/50 dark:hover:bg-amber-900/70 text-amber-900 dark:text-amber-200 font-bold text-xs transition-colors cursor-pointer shadow-xs"
                          >
                            <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                            <span>Enter in Instant Guest Mode</span>
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                {/* Helpful Inline Options on Login Failure */}
                {tab === 'login' &&
                  (authErrorDetails?.type === 'invalid_credentials' ||
                    authErrorDetails?.type === 'user_not_found' ||
                    authErrorDetails?.type === 'invalid_password' ||
                    Boolean(
                      errorMsg &&
                        authErrorDetails?.type !== 'email_not_confirmed' &&
                        !/email.*not.*confirmed/i.test(errorMsg) &&
                        authErrorDetails?.type !== 'rate_limit'
                    )) && (
                    <div className="p-3.5 rounded-2xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200/80 dark:border-indigo-800/60 text-xs space-y-2.5 animate-fadeIn">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5 font-semibold text-indigo-900 dark:text-indigo-200">
                          <UserPlus className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span>
                            {authErrorDetails?.type === 'user_not_found'
                              ? "Don't have an account yet?"
                              : "Haven't signed up yet?"}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setTab('signup');
                            setErrorMsg('');
                            setAuthErrorDetails(null);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] shadow-2xs transition-colors cursor-pointer"
                        >
                          <span>Create Account</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Password Reset Action */}
                      <div className="pt-2 border-t border-indigo-100 dark:border-indigo-900/50 flex items-center justify-between text-[11px]">
                        <div className="flex items-center gap-1 text-slate-600 dark:text-gray-300">
                          <KeyRound className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>Forgot password?</span>
                        </div>
                        <button
                          type="button"
                          onClick={handleForgotPassword}
                          disabled={resetLoading}
                          className="font-semibold text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 dark:hover:text-indigo-200 underline cursor-pointer disabled:opacity-50"
                        >
                          {resetLoading ? 'Sending link...' : 'Send Password Reset Link'}
                        </button>
                      </div>

                      {resetSuccess && (
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle className="w-3.5 h-3.5" />
                          <span>Password reset email dispatched! Please check your inbox.</span>
                        </p>
                      )}
                    </div>
                  )}

                {successMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/70 border border-emerald-200 dark:border-emerald-900/60 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300 animate-fadeIn">
                    <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{successMsg}</span>
                  </div>
                )}

                {/* Sign-Up Additional Fields */}
                {tab === 'signup' && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                        Full Name
                      </label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                          <User className="w-4 h-4" />
                        </div>
                        <input
                          type="text"
                          required
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          placeholder="e.g. Sarah Jenkins"
                          className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                          University / College
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <School className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            required
                            value={university}
                            onChange={(e) => setUniversity(e.target.value)}
                            placeholder="e.g. MIT, Stanford, Oxford"
                            className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                          Major / Degree
                        </label>
                        <div className="relative">
                          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                            <GraduationCap className="w-4 h-4" />
                          </div>
                          <input
                            type="text"
                            value={degree}
                            onChange={(e) => setDegree(e.target.value)}
                            placeholder="e.g. B.S. Computer Science"
                            className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                          />
                        </div>
                      </div>
                    </div>
                  </>
                )}

                {/* Email Address */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300 mb-1.5">
                    Student Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="student@university.edu"
                      className="w-full min-h-[44px] pl-10 pr-3.5 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field with Show/Hide toggle */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-slate-700 dark:text-gray-300">
                      Password
                    </label>
                    {tab === 'login' && (
                      <span className="text-[11px] text-indigo-600 dark:text-indigo-400">
                        Min. 6 characters
                      </span>
                    )}
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full min-h-[44px] pl-10 pr-11 py-2.5 rounded-xl border text-xs sm:text-sm bg-slate-50 dark:bg-gray-800 border-slate-200 dark:border-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-400 dark:placeholder-gray-500 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-600 dark:hover:text-gray-200 cursor-pointer"
                      title={showPassword ? 'Hide password' : 'Show password'}
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Primary Submit Button */}
                <button
                  type="submit"
                  disabled={submitting || !isOnline}
                  className="w-full min-h-[44px] py-3 px-4 rounded-xl font-bold text-xs sm:text-sm text-white bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed transition-all shadow-md shadow-indigo-500/25 flex items-center justify-center gap-2 cursor-pointer mt-2"
                >
                  {submitting ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : !isOnline ? (
                    <>
                      <WifiOff className="w-4 h-4" />
                      <span>Offline — Sign In Unavailable</span>
                    </>
                  ) : (
                    <>
                      <span>
                        {tab === 'login'
                          ? 'Sign In to Access Notes'
                          : 'Create Account & Unlock Platform'}
                      </span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                {/* Instant 1-Click Demo Login */}
                <div className="pt-2 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between gap-2">
                  <span className="text-[11px] text-slate-500 dark:text-gray-400">
                    Want to test without registering?
                  </span>
                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    disabled={submitting}
                    className="min-h-[40px] px-3 py-1.5 rounded-lg text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 transition-colors cursor-pointer"
                  >
                    1-Click Demo Student
                  </button>
                </div>
              </form>

              {/* Card Footer: Supabase Settings Option */}
              <div className="px-6 py-3.5 bg-slate-50/90 dark:bg-gray-950/80 border-t border-slate-100 dark:border-gray-800 flex items-center justify-between text-xs text-slate-500 dark:text-gray-400">
                <span className="flex items-center gap-1.5 text-[11px]">
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>{isConfigured ? 'Live Supabase Cloud' : 'Local Demo Storage'}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setIsConfigOpen(true)}
                  className="text-xs font-semibold text-slate-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 cursor-pointer"
                >
                  Configure Backend
                </button>
              </div>

            </div>
          </div>

        </div>
      </main>

      {/* Supabase Connection Setup & SQL Schema Modal */}
      <SupabaseConfigModal
        isOpen={isConfigOpen}
        onClose={() => setIsConfigOpen(false)}
      />
    </div>
  );
}
