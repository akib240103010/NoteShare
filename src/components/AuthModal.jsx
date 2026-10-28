import React, { useState, useEffect } from 'react';
import {
  X,
  GraduationCap,
  Mail,
  Lock,
  User,
  School,
  Sparkles,
  AlertCircle,
  CheckCircle,
  Database,
  WifiOff,
  Clock,
  Send,
  HelpCircle,
  MailCheck,
  ArrowRight,
  KeyRound,
  UserPlus,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import { parseAuthError } from '../lib/supabase';

export default function AuthModal({ isOpen, onClose, onOpenConfig, onToast }) {
  const { login, register, resetPassword, resendConfirmation, loginAsDemo, isConfigured } = useAuth();
  const { isOnline } = useNetwork();
  const [tab, setTab] = useState('login'); // 'login' | 'signup'

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [university, setUniversity] = useState('');
  const [degree, setDegree] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [authErrorDetails, setAuthErrorDetails] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');
  const [requiresConfirmationNotice, setRequiresConfirmationNotice] = useState(null);

  // Rate limit cooldown timer in seconds
  const [rateLimitTimer, setRateLimitTimer] = useState(0);

  // Password reset state
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  // Email confirmation resend state
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSent, setResendSent] = useState(false);

  // Active interval countdown for rate limit cooldown
  useEffect(() => {
    if (rateLimitTimer <= 0) return;
    const interval = setInterval(() => {
      setRateLimitTimer((prev) => {
        if (prev <= 1) {
          setErrorMsg('');
          setAuthErrorDetails(null);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitTimer]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) {
      setErrorMsg('You are currently offline. Authentication requires an active internet connection.');
      return;
    }
    if (rateLimitTimer > 0) {
      setErrorMsg(`Rate limit active. Please wait ${rateLimitTimer} seconds.`);
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    setEmail(cleanEmail);

    setErrorMsg('');
    setAuthErrorDetails(null);
    setSuccessMsg('');
    setRequiresConfirmationNotice(null);
    setResetSuccess(false);
    setLoading(true);

    try {
      if (!cleanEmail) {
        throw new Error('Please enter your email address.');
      }
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        throw new Error('Please enter a valid email address (e.g., student@university.edu).');
      }

      if (tab === 'login') {
        if (!password.trim()) {
          throw new Error('Please enter your password.');
        }
        await login(cleanEmail, password);
        setSuccessMsg('Signed in successfully! Welcome back.');
        onToast?.({
          type: 'success',
          title: 'Welcome Back!',
          message: 'Signed in successfully to NoteShare.',
        });
        setTimeout(() => {
          onClose();
        }, 800);
      } else {
        if (password.length < 6) {
          throw new Error('Password must be at least 6 characters.');
        }
        const res = await register(cleanEmail, password, {
          fullName: fullName.trim() || 'Student Scholar',
          university: university.trim() || 'Global University',
          degree: degree.trim() || 'Undergraduate',
        });

        if (res?.requiresEmailConfirmation) {
          // Supabase project requires email confirmation in backend
          setRequiresConfirmationNotice({
            email: cleanEmail,
            message: 'Account registered! To sign in directly without email verification codes, turn OFF "Confirm email" in Supabase Auth.',
          });
          onToast?.({
            type: 'info',
            title: 'Account Registered',
            message: 'Account created. Turn OFF "Confirm email" in Supabase for instant sign-in.',
          });
        } else {
          setSuccessMsg('Account created & signed in! Welcome to NoteShare.');
          onToast?.({
            type: 'success',
            title: 'Account Created',
            message: 'Welcome to NoteShare! You are now signed in.',
          });
          setTimeout(() => {
            onClose();
          }, 1000);
        }
      }
    } catch (err) {
      console.error('Authentication error:', err);
      const parsed = err.parsed || parseAuthError(err);
      setAuthErrorDetails(parsed);
      setErrorMsg(parsed.message);

      if (parsed.type === 'rate_limit') {
        const seconds = parsed.waitSeconds || 60;
        setRateLimitTimer(seconds);
        onToast?.({
          type: 'error',
          title: 'Rate Limit Reached',
          message: `Please wait ${seconds} seconds before attempting another request.`,
        });
      } else if (parsed.type === 'email_not_confirmed') {
        onToast?.({
          type: 'warning',
          title: 'Instant Sign-In Setup',
          message:
            'Email verification is not needed. Disable "Confirm email" in your Supabase dashboard for instant login.',
        });
      } else if (parsed.type === 'invalid_password') {
        onToast?.({
          type: 'error',
          title: 'Invalid Password',
          message: 'Incorrect password for this student account. Try again or reset password.',
        });
      } else if (parsed.type === 'user_not_found') {
        onToast?.({
          type: 'error',
          title: 'User Not Found',
          message: 'No student account was found with this email. Switch to Create Account.',
        });
      } else if (parsed.type === 'invalid_credentials') {
        onToast?.({
          type: 'error',
          title: 'Invalid Credentials',
          message: 'Incorrect email or password. Verify credentials or switch to Create Account.',
        });
      } else {
        onToast?.({
          type: 'error',
          title: tab === 'login' ? 'Sign In Failed' : 'Registration Failed',
          message: parsed.message,
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail) {
      setErrorMsg('Please enter your email above to receive a password reset link.');
      onToast?.({
        type: 'error',
        title: 'Email Required',
        message: 'Please enter your email address to receive a password reset link.',
      });
      return;
    }
    setResetLoading(true);
    setResetSuccess(false);

    try {
      await resetPassword(cleanEmail);
      setResetSuccess(true);
      onToast?.({
        type: 'success',
        title: 'Reset Link Sent',
        message: `Password reset instructions sent to ${cleanEmail}. Check your inbox!`,
      });
      setTimeout(() => setResetSuccess(false), 7000);
    } catch (err) {
      const parsed = err.parsed || parseAuthError(err);
      if (parsed.type === 'rate_limit') {
        setRateLimitTimer(parsed.waitSeconds || 60);
      }
      setErrorMsg(parsed.message);
      onToast?.({
        type: 'error',
        title: 'Password Reset Failed',
        message: parsed.message,
      });
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
      onToast?.({
        type: 'success',
        title: 'Confirmation Email Sent',
        message: `Verification link sent to ${cleanEmail}. Please check your inbox!`,
      });
      setSuccessMsg(`Confirmation email sent to ${cleanEmail}! Please check your inbox and verify your email.`);
    } catch (err) {
      const parsed = err.parsed || parseAuthError(err);
      setErrorMsg(parsed.message || 'Failed to resend confirmation email.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemo?.('alex.scholar@mit.edu');
    onClose?.();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="min-h-full flex items-center justify-center">
        {/* Form Background Container with High Contrast Against Page/Backdrop */}
        <div
          className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl w-full max-w-md rounded-3xl shadow-2xl border border-slate-200/90 dark:border-gray-800/80 overflow-hidden my-auto animate-scaleUp text-gray-900 dark:text-gray-100"
          onClick={(e) => e.stopPropagation()}
        >
        {/* Header Banner */}
        <div className="p-6 bg-linear-to-r from-slate-900 via-indigo-950 to-slate-900 dark:from-gray-950 dark:via-indigo-950/80 dark:to-gray-950 text-white relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 min-w-[36px] min-h-[36px] flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            aria-label="Close modal"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-2.5 mb-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-600 flex items-center justify-center text-white shadow-md shadow-indigo-500/20">
              <GraduationCap className="w-5 h-5" />
            </div>
            <div>
              <span className="text-lg font-bold">NoteShare Auth</span>
              <span className="block text-[11px] text-indigo-300">
                {isConfigured ? 'Connected to Supabase' : 'Local Demo Mode'}
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-300 dark:text-gray-300 leading-relaxed">
            {tab === 'login'
              ? 'Sign in to publish lecture notes, save bookmarks, and participate in peer discussions.'
              : 'Join the global network of student scholars sharing verified course notes.'}
          </p>
        </div>

        {/* Supabase Connection Status Pill */}
        <div className="px-6 pt-4">
          <div className="flex items-center justify-between text-xs px-3.5 py-2.5 rounded-xl bg-slate-50 dark:bg-gray-800/90 border border-slate-200 dark:border-gray-700">
            <div className="flex items-center gap-1.5 text-gray-700 dark:text-gray-300 font-medium">
              <Database className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              <span>Backend:</span>
              <span className={`font-semibold ${isConfigured ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'}`}>
                {isConfigured ? 'Live Supabase' : 'Demo / Local Cache'}
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenConfig();
              }}
              className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 font-semibold text-[11px] hover:underline cursor-pointer"
            >
              Config Setup
            </button>
          </div>
        </div>

        {/* Fast Development Mode Notice */}
        {isConfigured && (
          <div className="px-6 pt-3">
            <div className="flex items-start gap-2 p-2.5 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/40 text-[11px] text-indigo-800 dark:text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold block">Dev Tip (Instant Student Login):</span>
                <span>In Supabase Dashboard &gt; Auth &gt; Providers &gt; Email, turn <strong>"Confirm email"</strong> to <strong>OFF</strong> to log in without email links.</span>
              </div>
            </div>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="px-6 pt-4">
          <div className="flex p-1 bg-slate-100 dark:bg-gray-800 border border-slate-200/80 dark:border-gray-700 rounded-xl">
            <button
              type="button"
              onClick={() => {
                setTab('login');
                setErrorMsg('');
                setAuthErrorDetails(null);
                setSuccessMsg('');
                setRequiresConfirmationNotice(null);
              }}
              className={`flex-1 min-h-[40px] py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                tab === 'login'
                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setTab('signup');
                setErrorMsg('');
                setAuthErrorDetails(null);
                setSuccessMsg('');
                setRequiresConfirmationNotice(null);
              }}
              className={`flex-1 min-h-[40px] py-2 text-xs font-semibold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                tab === 'signup'
                  ? 'bg-white dark:bg-gray-700 text-indigo-700 dark:text-indigo-300 shadow-xs font-bold'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              Create Account
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!isOnline && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5 animate-fadeIn">
              <WifiOff className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block">Offline Mode Active</span>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                  Authentication requires an active internet connection. You can close this modal and continue reading your cached study notes offline.
                </p>
              </div>
            </div>
          )}

          {/* Rate Limit Active Cooldown Banner */}
          {rateLimitTimer > 0 && (
            <div className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 text-xs text-amber-800 dark:text-amber-200 flex items-start gap-2.5 animate-fadeIn">
              <Clock className="w-4 h-4 text-amber-500 shrink-0 mt-0.5 animate-pulse" />
              <div className="flex-1">
                <span className="font-bold block">Rate Limit Active — Cooldown Timer</span>
                <p className="mt-0.5 text-amber-700 dark:text-amber-300">
                  Supabase limits authentication requests to prevent spam. Please wait before requesting another action.
                </p>
                <div className="mt-2 flex items-center gap-2">
                  <div className="h-2 flex-1 bg-amber-200 dark:bg-amber-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-amber-500 transition-all duration-1000 ease-linear rounded-full"
                      style={{ width: `${Math.min(100, (rateLimitTimer / 60) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[11px] font-mono font-bold text-amber-700 dark:text-amber-300">
                    {rateLimitTimer}s
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Unconfirmed Email Special Action Banner */}
          {authErrorDetails?.type === 'email_not_confirmed' && (
            <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200 space-y-2.5 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-sm">Account Pending Email Confirmation</span>
                  <p className="text-amber-700 dark:text-amber-300 mt-0.5 leading-relaxed">
                    This account ({email.trim() || 'this email'}) was created with email confirmation enabled in Supabase, but the email address has not been verified yet.
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
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>{resendLoading ? 'Sending...' : 'Resend Confirmation Email'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleDemoLogin}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-200 font-semibold text-xs transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    <span>Instant Guest Access</span>
                  </button>
                </div>
              )}

              {/* Fast-Track Advice */}
              <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/90 border border-amber-200/80 dark:border-amber-800/40 text-[11px] space-y-1.5">
                <div className="flex items-center gap-1 font-bold text-amber-800 dark:text-amber-300">
                  <Sparkles className="w-3 h-3 text-amber-600" />
                  <span>Admin Fix (Enable 1-Click Instant Sign-In for all users):</span>
                </div>
                <p className="text-slate-600 dark:text-gray-300 leading-relaxed">
                  1. In <strong>Supabase Dashboard &gt; Authentication &gt; Providers &gt; Email</strong>, switch <strong>"Confirm email"</strong> to <strong>OFF</strong>.
                </p>
                <p className="text-slate-600 dark:text-gray-300 leading-relaxed">
                  2. To activate this account immediately without creating a new one: In <strong>Authentication &gt; Users</strong>, click <strong>...</strong> next to your user and click <strong>"Confirm email"</strong>.
                </p>
              </div>

              <div className="flex items-center justify-between pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setErrorMsg('');
                    setAuthErrorDetails(null);
                  }}
                  className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Try Signing In Again
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenConfig();
                  }}
                  className="text-xs text-amber-800 dark:text-amber-300 underline font-semibold cursor-pointer"
                >
                  Supabase Config
                </button>
              </div>
            </div>
          )}

          {/* Post-Signup Requires Email Confirmation Notice */}
          {requiresConfirmationNotice && (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 text-xs text-indigo-900 dark:text-indigo-200 space-y-2.5 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <MailCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-sm block">Account Created Successfully</span>
                  <p className="text-indigo-700 dark:text-indigo-300 mt-0.5 leading-relaxed">
                    Student account created for <strong>{requiresConfirmationNotice.email}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/80 dark:bg-gray-800/90 border border-indigo-200/80 dark:border-indigo-800/40 text-[11px] space-y-1">
                <div className="flex items-center gap-1 font-bold text-indigo-800 dark:text-indigo-300">
                  <Sparkles className="w-3 h-3 text-indigo-600" />
                  <span>Instant Sign-In Setup:</span>
                </div>
                <p className="text-slate-600 dark:text-gray-300 leading-relaxed">
                  To log in directly without waiting for email verification codes, disable <strong>"Confirm email"</strong> in your Supabase Dashboard under <strong>Authentication &gt; Providers &gt; Email</strong>.
                </p>
              </div>

              <div className="pt-1 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setTab('login');
                    setRequiresConfirmationNotice(null);
                    setErrorMsg('');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition-colors cursor-pointer shadow-xs"
                >
                  Switch to Sign In
                </button>
              </div>
            </div>
          )}

          {/* Standard Error Notice (if not email unconfirmed or rate limited) */}
          {errorMsg && authErrorDetails?.type !== 'email_not_confirmed' && (
            <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-xs text-rose-700 dark:text-rose-300 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-medium leading-relaxed">{errorMsg}</span>
              </div>
            </div>
          )}

          {/* Helpful Inline Switch & Password Reset Prompts on Login Failures */}
          {tab === 'login' &&
            (authErrorDetails?.type === 'invalid_credentials' ||
              authErrorDetails?.type === 'user_not_found' ||
              authErrorDetails?.type === 'invalid_password' ||
              Boolean(errorMsg && authErrorDetails?.type !== 'email_not_confirmed' && authErrorDetails?.type !== 'rate_limit')) && (
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
                    disabled={resetLoading || rateLimitTimer > 0}
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
            <div className="p-3.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/60 text-xs text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-500 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {tab === 'signup' && (
            <>
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Full Name
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Maya Chen"
                    className="w-full min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    University
                  </label>
                  <div className="relative">
                    <School className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={university}
                      onChange={(e) => setUniversity(e.target.value)}
                      placeholder="e.g. Stanford"
                      className="w-full min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                    Major / Degree
                  </label>
                  <input
                    type="text"
                    value={degree}
                    onChange={(e) => setDegree(e.target.value)}
                    placeholder="e.g. CS & Math"
                    className="w-full min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
              Student Email
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value.toLowerCase())}
                onBlur={() => setEmail((prev) => prev.trim().toLowerCase())}
                placeholder="student@university.edu"
                className="w-full min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
              />
            </div>
            <p className="text-[11px] text-slate-500 dark:text-gray-400 mt-1">
              Emails are automatically trimmed and normalized to lowercase.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300">
                Password
              </label>
              {tab === 'login' && (
                <button
                  type="button"
                  onClick={handleForgotPassword}
                  className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline font-medium cursor-pointer"
                >
                  Forgot password?
                </button>
              )}
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full min-h-[44px] text-xs sm:text-sm rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3 py-2.5 bg-slate-50/80 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !isOnline || rateLimitTimer > 0}
            className="w-full min-h-[44px] mt-2 py-2.5 px-4 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white font-semibold text-xs sm:text-sm shadow-md shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {loading ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : !isOnline ? (
              <>
                <WifiOff className="w-4 h-4" />
                <span>Offline — Authentication Disabled</span>
              </>
            ) : rateLimitTimer > 0 ? (
              <>
                <Clock className="w-4 h-4 animate-pulse" />
                <span>Rate Limited — Wait {rateLimitTimer}s</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>{tab === 'login' ? 'Sign In to NoteShare' : 'Create Student Account'}</span>
              </>
            )}
          </button>

          <div className="text-center pt-2">
            <button
              type="button"
              onClick={onClose}
              className="min-h-[44px] inline-flex items-center justify-center text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors cursor-pointer"
            >
              Continue as Guest Scholar
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
);
}
