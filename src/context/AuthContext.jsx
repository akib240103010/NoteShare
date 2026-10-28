import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  supabase,
  isSupabaseConfigured,
  signInWithEmail,
  signUpWithEmail,
  signOutUser,
  fetchUserProfile,
  parseAuthError,
  resendVerificationEmail,
  sendPasswordResetEmail,
} from '../lib/supabase';

const AuthContext = createContext(null);

function getProfileFromUser(user) {
  if (!user) return null;
  const meta = user.user_metadata || {};
  return {
    id: user.id,
    full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'Student Contributor',
    email: user.email,
    university: meta.university || 'Global University',
    degree: meta.degree || 'Undergraduate Student',
    bio: meta.bio || '',
    avatar_url: meta.avatar_url || null,
    created_at: user.created_at || new Date().toISOString(),
    updated_at: user.updated_at || new Date().toISOString(),
  };
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [unconfirmedEmail, setUnconfirmedEmail] = useState(null);
  const [authNotification, setAuthNotification] = useState(null);

  // Initialize auth state and persist sessions across browser refreshes and app restarts
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) {
      // Check for local demo session if offline or in local fallback mode
      const localDemoUser = localStorage.getItem('noteshare_demo_user');
      if (localDemoUser) {
        try {
          const parsed = JSON.parse(localDemoUser);
          setUser(parsed);
          setProfile({
            id: parsed.id,
            full_name: parsed.user_metadata?.full_name || 'Student Scholar',
            email: parsed.email,
            university: parsed.user_metadata?.university || 'Global University',
            created_at: new Date().toISOString(),
          });
        } catch {
          // Ignore parse errors
        }
      }
      setLoading(false);
      return;
    }

    // Retrieve active persisted session from Supabase client (persistSession: true)
    supabase.auth
      .getSession()
      .then(({ data: { session }, error }) => {
        if (error) {
          console.warn('Error fetching persisted Supabase session:', error);
        }
        setSession(session ?? null);
        const currentUser = session?.user ?? null;
        setUser(currentUser);
        if (currentUser?.id) {
          setProfile((prev) => prev || getProfileFromUser(currentUser));
          fetchUserProfile(currentUser.id).then((prof) => {
            if (prof) setProfile(prof);
          });
        }
      })
      .catch((err) => {
        console.warn('Failed to retrieve persisted session:', err);
      })
      .finally(() => {
        setLoading(false);
      });

    // Listen to Supabase auth events (including autoRefreshToken: true token refreshes)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      setSession(currentSession ?? null);
      const currentUser = currentSession?.user ?? null;
      setUser(currentUser);
      if (currentUser?.id) {
        setUnconfirmedEmail(null);
        if (event === 'SIGNED_IN') {
          setAuthNotification({
            type: 'success',
            title: 'Account Verified!',
            message: `Welcome to NoteShare! Successfully verified and signed in.`,
          });
        }
        setProfile((prev) => prev || getProfileFromUser(currentUser));
        fetchUserProfile(currentUser.id).then((prof) => {
          if (prof) setProfile(prof);
        });
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    // Check URL hash for auth confirmation tokens or errors
    if (typeof window !== 'undefined' && window.location.hash) {
      try {
        const hash = window.location.hash.substring(1);
        const params = new URLSearchParams(hash);
        const errorDesc = params.get('error_description');
        if (errorDesc) {
          setAuthNotification({
            type: 'error',
            title: 'Verification Link Issue',
            message: decodeURIComponent(errorDesc).replace(/\+/g, ' '),
          });
          window.history.replaceState(null, '', window.location.pathname);
        } else if (params.get('access_token')) {
          setUnconfirmedEmail(null);
          setTimeout(() => {
            window.history.replaceState(null, '', window.location.pathname);
          }, 1500);
        }
      } catch (e) {
        // ignore hash parse errors
      }
    }

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  // Sign In
  const login = async (email, password) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isSupabaseConfigured) {
      // Demo login
      const demoUser = {
        id: 'demo-student-id',
        email: cleanEmail,
        user_metadata: {
          full_name: cleanEmail.split('@')[0].replace(/[._]/g, ' ').toUpperCase(),
          university: 'Global Scholar Network',
          degree: 'Computer Science & Engineering',
        },
      };
      setUser(demoUser);
      const demoProfile = {
        id: demoUser.id,
        full_name: demoUser.user_metadata.full_name,
        email: demoUser.email,
        university: demoUser.user_metadata.university,
        created_at: new Date().toISOString(),
      };
      setProfile(demoProfile);
      localStorage.setItem('noteshare_demo_user', JSON.stringify(demoUser));
      return { user: demoUser, profile: demoProfile };
    }

    try {
      const res = await signInWithEmail(cleanEmail, password);
      setUnconfirmedEmail(null);
      setAuthNotification(null);
      if (res?.session?.user) {
        setUser(res.session.user);
        setSession(res.session);
        setProfile(getProfileFromUser(res.session.user));
        fetchUserProfile(res.session.user.id).then((prof) => {
          if (prof) setProfile(prof);
        });
      }
      return res;
    } catch (err) {
      const parsed = parseAuthError(err);

      // Specifically catch Email Confirmation Error
      if (parsed.type === 'email_not_confirmed') {
        const unconfirmedMessage =
          'Email confirmation is not required on NoteShare. In your Supabase Dashboard under Authentication > Providers > Email, please turn "Confirm email" OFF for instant sign-in.';
        setUnconfirmedEmail(cleanEmail);
        setAuthNotification({
          type: 'warning',
          title: 'Instant Sign-In Setup',
          message: unconfirmedMessage,
          email: cleanEmail,
        });

        const enhancedErr = new Error(unconfirmedMessage);
        enhancedErr.parsed = {
          ...parsed,
          type: 'email_not_confirmed',
          message: unconfirmedMessage,
          instructions: unconfirmedMessage,
          email: cleanEmail,
        };
        enhancedErr.raw = err;
        throw enhancedErr;
      }

      setAuthNotification({
        type: 'error',
        title: 'Sign In Failed',
        message: parsed.message,
      });

      const enhancedErr = new Error(parsed.message);
      enhancedErr.parsed = parsed;
      enhancedErr.raw = err;
      throw enhancedErr;
    }
  };

  // Sign Up
  const register = async (email, password, metadata) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!isSupabaseConfigured) {
      // Demo signup
      const demoUser = {
        id: `user-${Date.now()}`,
        email: cleanEmail,
        user_metadata: {
          full_name: metadata.fullName || 'Student Contributor',
          university: metadata.university || 'Global University',
          degree: metadata.degree || 'B.S. Student',
        },
      };
      setUser(demoUser);
      const demoProfile = {
        id: demoUser.id,
        full_name: demoUser.user_metadata.full_name,
        email: demoUser.email,
        university: demoUser.user_metadata.university,
        created_at: new Date().toISOString(),
      };
      setProfile(demoProfile);
      localStorage.setItem('noteshare_demo_user', JSON.stringify(demoUser));
      return { user: demoUser, profile: demoProfile, requiresEmailConfirmation: false };
    }

    try {
      const res = await signUpWithEmail(cleanEmail, password, metadata);
      // If "Confirm email" is turned off in Supabase, session is active immediately (instant auto-login)
      if (res?.session?.user) {
        setUser(res.session.user);
        setSession(res.session);
        setProfile(getProfileFromUser(res.session.user));
        fetchUserProfile(res.session.user.id).then((prof) => {
          if (prof) setProfile(prof);
        });
      }
      return res;
    } catch (err) {
      const parsed = parseAuthError(err);
      const enhancedErr = new Error(parsed.message);
      enhancedErr.parsed = parsed;
      enhancedErr.raw = err;
      throw enhancedErr;
    }
  };

  // Resend verification confirmation email
  const resendConfirmation = async (targetEmail) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!isSupabaseConfigured) return;
    try {
      return await resendVerificationEmail(cleanEmail);
    } catch (err) {
      const parsed = parseAuthError(err);
      const enhancedErr = new Error(parsed.message);
      enhancedErr.parsed = parsed;
      enhancedErr.raw = err;
      throw enhancedErr;
    }
  };

  // Send password reset email
  const resetPassword = async (targetEmail) => {
    const cleanEmail = (targetEmail || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Please enter your email address to receive a password reset link.');
    }
    if (!isSupabaseConfigured) {
      return { message: 'Demo mode: Password reset email simulated.' };
    }
    try {
      return await sendPasswordResetEmail(cleanEmail);
    } catch (err) {
      const parsed = parseAuthError(err);
      const enhancedErr = new Error(parsed.message);
      enhancedErr.parsed = parsed;
      enhancedErr.raw = err;
      throw enhancedErr;
    }
  };

  // Instant Demo / Direct Access Mode Login
  const loginAsDemo = (demoEmail = 'student@iiitmanipur.ac.in', customName = null) => {
    const cleanEmail = (demoEmail || '').trim().toLowerCase();
    const rawName = cleanEmail.split('@')[0].replace(/[._]/g, ' ');
    const formattedName =
      customName ||
      (rawName ? rawName.charAt(0).toUpperCase() + rawName.slice(1) : 'Student Scholar');
    const isIIIT = cleanEmail.includes('iiitmanipur');
    const demoUser = {
      id: `student-${cleanEmail.replace(/[^a-zA-Z0-9]/g, '_')}`,
      email: cleanEmail,
      user_metadata: {
        full_name: formattedName,
        university: isIIIT ? 'IIIT Manipur' : 'Student Scholar Network',
        degree: isIIIT ? 'Computer Science & Engineering' : 'Undergraduate Student',
      },
    };
    setUser(demoUser);
    const demoProfile = {
      id: demoUser.id,
      full_name: demoUser.user_metadata.full_name,
      email: demoUser.email,
      university: demoUser.user_metadata.university,
      degree: demoUser.user_metadata.degree,
      bio: 'Verified student contributor.',
      created_at: new Date().toISOString(),
    };
    setProfile(demoProfile);
    localStorage.setItem('noteshare_demo_user', JSON.stringify(demoUser));
    return { user: demoUser, profile: demoProfile };
  };

  // Explicit Sign Out (clears persisted tokens from storage until next login)
  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await signOutUser();
      }
    } catch (err) {
      console.warn('Error during Supabase signOut:', err);
    } finally {
      localStorage.removeItem('noteshare_demo_user');
      setUser(null);
      setProfile(null);
      setSession(null);
    }
  };

  // Re-fetch profile and synchronize state
  const refreshProfile = async (explicitUserId) => {
    const targetId = explicitUserId || user?.id;
    if (!targetId) return null;

    if (!isSupabaseConfigured || !supabase) {
      const localDemoUser = localStorage.getItem('noteshare_demo_user');
      if (localDemoUser) {
        try {
          const parsed = JSON.parse(localDemoUser);
          setUser(parsed);
          const p = {
            id: parsed.id,
            full_name: parsed.user_metadata?.full_name || 'Student Scholar',
            email: parsed.email,
            university: parsed.user_metadata?.university || 'Global University',
            degree: parsed.user_metadata?.degree || '',
            bio: parsed.user_metadata?.bio || '',
            avatar_url: parsed.user_metadata?.avatar_url || '',
            created_at: new Date().toISOString(),
          };
          setProfile(p);
          return p;
        } catch {}
      }
      return profile;
    }

    try {
      const prof = await fetchUserProfile(targetId);
      if (prof) {
        setProfile(prof);
        return prof;
      }
    } catch (err) {
      console.warn('Failed refreshing user profile:', err);
    }
    return null;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        setProfile,
        setUser,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        login,
        register,
        loginAsDemo,
        resendConfirmation,
        resetPassword,
        unconfirmedEmail,
        setUnconfirmedEmail,
        authNotification,
        setAuthNotification,
        logout,
        refreshProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
