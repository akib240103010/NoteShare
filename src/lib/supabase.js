import { createClient } from '@supabase/supabase-js';

/**
 * Sanitizes Supabase Project URL:
 * - Strips accidental Markdown link syntax (e.g. [https://...](https://...))
 * - Extracts valid http/https URLs from bracketed or parenthesized text
 * - Strips quotes (", '), backticks, brackets (<>, [], ()), and trailing slashes
 * - Strips whitespace and invisible characters
 */
export function sanitizeSupabaseUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let str = rawUrl.trim();

  // If formatted as a markdown link: [label](https://...) or [https://...](https://...)
  const mdMatch = str.match(/\[.*?\]\((https?:\/\/[^\s)\]"']+)\)/i);
  if (mdMatch && mdMatch[1]) {
    str = mdMatch[1];
  } else {
    // If it has parens around a URL: (https://...)
    const parenMatch = str.match(/\((https?:\/\/[^\s)\]"']+)\)/i);
    if (parenMatch && parenMatch[1]) {
      str = parenMatch[1];
    } else {
      // Find any valid http/https URL in the string
      const urlMatch = str.match(/https?:\/\/[^\s)\]"']+/i);
      if (urlMatch) {
        str = urlMatch[0];
      }
    }
  }

  // Strip leading/trailing brackets, quotes, backticks, angle brackets
  str = str.replace(/^[<\[\("'`]+|[>\]\)"'`]+$/g, '');
  // Strip trailing slashes
  str = str.replace(/\/+$/, '');

  return str.trim();
}

/**
 * Sanitizes Supabase Anon Key:
 * - Strips accidental Markdown link syntax or brackets
 * - Strips common prefix noise ("Bearer ", "anon_key=", etc.)
 * - Strips quotes, backticks, brackets, whitespace, and newlines
 */
export function sanitizeSupabaseKey(rawKey) {
  if (!rawKey || typeof rawKey !== 'string') return '';
  let str = rawKey.trim();

  const mdMatch = str.match(/\[.*?\]\(([^)\s]+)\)/);
  if (mdMatch && mdMatch[1]) {
    str = mdMatch[1];
  } else {
    const parenMatch = str.match(/\(([^)\s]+)\)/);
    if (parenMatch && parenMatch[1] && parenMatch[1].length > 20) {
      str = parenMatch[1];
    }
  }

  str = str.replace(/^(bearer|anon_key|key|api_key)[:= ]+/i, '');
  str = str.replace(/[<\[\("'`\]\>\s]/g, '');

  return str.trim();
}

// Retrieve credentials from environment variables or custom localStorage override
const envUrl = import.meta.env.VITE_SUPABASE_URL || '';
const envKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

const localUrl = typeof window !== 'undefined' ? localStorage.getItem('noteshare_supabase_url') || '' : '';
const localKey = typeof window !== 'undefined' ? localStorage.getItem('noteshare_supabase_anon_key') || '' : '';

export const SUPABASE_URL = sanitizeSupabaseUrl(localUrl || envUrl);
export const SUPABASE_ANON_KEY = sanitizeSupabaseKey(localKey || envKey);

export const isSupabaseConfigured = Boolean(
  SUPABASE_URL &&
  SUPABASE_ANON_KEY &&
  !SUPABASE_URL.includes('your-project-id') &&
  SUPABASE_URL.startsWith('http')
);

// Initialize Supabase Client with persistent authentication session configuration
export const supabase = isSupabaseConfigured
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: 'noteshare_supabase_auth_token',
      },
    })
  : null;

/**
 * Configure Supabase dynamically from the in-app settings modal
 */
export function setCustomSupabaseCredentials(url, key, shouldReload = false) {
  const cleanUrl = sanitizeSupabaseUrl(url);
  const cleanKey = sanitizeSupabaseKey(key);

  if (cleanUrl && cleanKey) {
    localStorage.setItem('noteshare_supabase_url', cleanUrl);
    localStorage.setItem('noteshare_supabase_anon_key', cleanKey);
  } else {
    localStorage.removeItem('noteshare_supabase_url');
    localStorage.removeItem('noteshare_supabase_anon_key');
  }

  if (shouldReload) {
    window.location.reload();
  }
}

// -----------------------------------------------------------------------------
// AUTHENTICATION HELPERS
// -----------------------------------------------------------------------------

/**
 * Normalizes Supabase Auth errors into user-friendly diagnostic messages and types
 */
export function parseAuthError(err) {
  if (!err) return { message: 'An unknown error occurred.', type: 'unknown' };

  const rawMessage = (err.message || err.error_description || String(err)).trim();
  const code = (err.code || err.error || '').toLowerCase();
  const status = err.status || 0;

  // 1. Rate Limit detection (e.g. over_email_send_rate_limit, 429, security purposes)
  const isRateLimit =
    status === 429 ||
    code.includes('rate_limit') ||
    code.includes('over_email_send_rate_limit') ||
    /security purposes/i.test(rawMessage) ||
    /rate limit/i.test(rawMessage);

  if (isRateLimit) {
    const matchSeconds = rawMessage.match(/after\s+(\d+)\s+seconds/i);
    const waitSeconds = matchSeconds ? parseInt(matchSeconds[1], 10) : 60;

    return {
      type: 'rate_limit',
      waitSeconds,
      message: `Rate limit reached. For security purposes, please wait ${waitSeconds}s before trying again.`,
      raw: rawMessage,
    };
  }

  // 2. Unconfirmed Email detection
  const isUnconfirmed =
    code === 'email_not_confirmed' ||
    /email not confirmed/i.test(rawMessage) ||
    /unconfirmed email/i.test(rawMessage) ||
    /confirm your email/i.test(rawMessage) ||
    /email address has not been confirmed/i.test(rawMessage);

  if (isUnconfirmed) {
    const unconfirmedMessage =
      'Please check your email for the verification link or disable Email Confirmations in your Supabase dashboard.';
    return {
      type: 'email_not_confirmed',
      message: unconfirmedMessage,
      instructions: unconfirmedMessage,
      raw: rawMessage,
    };
  }

  // 3. User Not Found
  const isUserNotFound =
    code === 'user_not_found' ||
    /user not found|no user found|email not found/i.test(rawMessage);

  if (isUserNotFound) {
    return {
      type: 'user_not_found',
      message: 'No student account was found with this email.',
      hint: 'If you do not have an account yet, switch to Create Account to sign up.',
      raw: rawMessage,
    };
  }

  // 4. Invalid Password specifically
  const isInvalidPassword =
    /invalid password|wrong password|incorrect password/i.test(rawMessage);

  if (isInvalidPassword) {
    return {
      type: 'invalid_password',
      message: 'Incorrect password. Please verify your password and try again.',
      raw: rawMessage,
    };
  }

  // 5. Invalid credentials (general login failure)
  const isInvalidCredentials =
    code === 'invalid_credentials' ||
    code === 'invalid_grant' ||
    /invalid login credentials/i.test(rawMessage) ||
    /invalid email or password/i.test(rawMessage);

  if (isInvalidCredentials) {
    return {
      type: 'invalid_credentials',
      message: 'Invalid email or password. Please verify your credentials and try again.',
      hint: 'If you have not registered yet, you can create a new account.',
      raw: rawMessage,
    };
  }

  // 6. User already registered
  const isUserExists =
    code === 'user_already_exists' ||
    /user already registered/i.test(rawMessage) ||
    /already exists/i.test(rawMessage) ||
    /already in use/i.test(rawMessage);

  if (isUserExists) {
    return {
      type: 'user_already_exists',
      message: 'An account with this email already exists. Please switch to Sign In.',
      raw: rawMessage,
    };
  }

  // 7. Weak password
  const isWeakPassword =
    code === 'weak_password' ||
    /password.*should be at least/i.test(rawMessage) ||
    /password is too short/i.test(rawMessage);

  if (isWeakPassword) {
    return {
      type: 'weak_password',
      message: 'Password must be at least 6 characters long.',
      raw: rawMessage,
    };
  }

  // 8. Invalid email syntax
  const isInvalidEmail =
    code === 'validation_failed' ||
    /valid email/i.test(rawMessage) ||
    /invalid email/i.test(rawMessage);

  if (isInvalidEmail) {
    return {
      type: 'invalid_email',
      message: 'Please provide a valid email address (e.g. student@university.edu).',
      raw: rawMessage,
    };
  }

  return {
    type: 'general',
    message: rawMessage || 'Authentication failed. Please try again.',
    raw: rawMessage,
  };
}

export async function signUpWithEmail(email, password, metadata = {}) {
  if (!supabase) throw new Error('Supabase is not configured yet.');

  const cleanEmail = (email || '').trim().toLowerCase();
  const fullName = metadata.fullName || 'Student Scholar';
  const university = metadata.university || 'Global University';
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

  const { data, error } = await supabase.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        full_name: fullName,
        university: university,
        degree: metadata.degree || 'Undergraduate',
        avatar_url: metadata.avatarUrl || null,
      },
    },
  });

  if (error) throw error;

  // When "Confirm email" is disabled in Supabase, session is populated immediately.
  // When "Confirm email" is enabled, user is created but session is null until verified.
  const session = data?.session || null;
  const user = data?.user || null;
  const requiresEmailConfirmation = Boolean(user && !session);

  // Post-signup client-side verification/fallback (ensures row in public.profiles exists even if trigger delayed)
  if (user?.id && !isProfilesTableMissing) {
    try {
      await supabase.from('profiles').upsert(
        {
          id: user.id,
          full_name: fullName,
          email: user.email || cleanEmail,
          university: university,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );
    } catch (profileErr) {
      if (
        profileErr?.code === 'PGRST205' ||
        profileErr?.code === '42P01' ||
        profileErr?.status === 404 ||
        String(profileErr?.message || '').toLowerCase().includes('profiles')
      ) {
        markProfilesTableMissing();
      }
    }
  }

  return {
    ...data,
    requiresEmailConfirmation,
  };
}

export async function resendVerificationEmail(email) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const cleanEmail = (email || '').trim().toLowerCase();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { data, error } = await supabase.auth.resend({
    type: 'signup',
    email: cleanEmail,
    options: {
      emailRedirectTo: redirectTo,
    },
  });
  if (error) throw error;
  return data;
}

export async function sendPasswordResetEmail(email) {
  if (!supabase) throw new Error('Supabase is not configured yet.');
  const cleanEmail = (email || '').trim().toLowerCase();
  const redirectTo = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
  const { data, error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
    redirectTo,
  });
  if (error) throw error;
  return data;
}

export async function signInWithEmail(email, password) {
  if (!supabase) throw new Error('Supabase is not configured yet.');

  const cleanEmail = (email || '').trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: cleanEmail,
    password,
  });

  if (error) throw error;
  return data;
}

export async function signOutUser() {
  if (!supabase) return;
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

// Track whether public.profiles table is missing in the connected Supabase schema (PGRST205 or 404)
const PROFILES_TABLE_MISSING_KEY = 'noteshare_profiles_missing';
let isProfilesTableMissing =
  typeof window !== 'undefined' && sessionStorage.getItem(PROFILES_TABLE_MISSING_KEY) === 'true';

let inflightProfilePromise = null;

export function markProfilesTableMissing() {
  isProfilesTableMissing = true;
  try {
    sessionStorage.setItem(PROFILES_TABLE_MISSING_KEY, 'true');
  } catch (e) {}
}

export function resetProfilesTableState() {
  isProfilesTableMissing = false;
  inflightProfilePromise = null;
  try {
    sessionStorage.removeItem(PROFILES_TABLE_MISSING_KEY);
  } catch (e) {}
}

/**
 * Fetch a student's public profile from public.profiles.
 * In-flight deduplication and session storage caching prevent duplicate 404 console errors.
 */
export async function fetchUserProfile(userId) {
  if (!supabase || !userId || isProfilesTableMissing) return null;

  if (inflightProfilePromise) {
    return inflightProfilePromise;
  }

  inflightProfilePromise = (async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id, full_name, email, university, degree, bio, avatar_url, created_at, updated_at')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        // PGRST205, 42P01, or HTTP 404: table public.profiles does not exist in schema cache
        if (
          error.code === 'PGRST205' ||
          error.code === '42P01' ||
          error.status === 404 ||
          String(error.message || '').toLowerCase().includes('profiles')
        ) {
          markProfilesTableMissing();
          return null;
        }

        // If table exists but some columns differ, try select('*')
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (
          fallbackError &&
          (fallbackError.code === 'PGRST205' ||
            fallbackError.code === '42P01' ||
            fallbackError.status === 404 ||
            String(fallbackError.message || '').toLowerCase().includes('profiles'))
        ) {
          markProfilesTableMissing();
          return null;
        }
        return fallbackData || null;
      }
      return data;
    } catch (err) {
      if (
        err?.code === 'PGRST205' ||
        err?.code === '42P01' ||
        err?.status === 404 ||
        String(err?.message || '').toLowerCase().includes('profiles')
      ) {
        markProfilesTableMissing();
      }
      return null;
    }
  })().finally(() => {
    inflightProfilePromise = null;
  });

  return inflightProfilePromise;
}

/**
 * Update a student's profile in public.profiles (strictly respecting RLS auth.uid() = id)
 */
export async function updateUserProfile(userId, profileUpdates) {
  if (!supabase || !userId) return null;

  // Always sync user_metadata in Supabase Auth
  try {
    await supabase.auth.updateUser({
      data: {
        ...(profileUpdates.full_name !== undefined && { full_name: profileUpdates.full_name }),
        ...(profileUpdates.university !== undefined && { university: profileUpdates.university }),
        ...(profileUpdates.degree !== undefined && { degree: profileUpdates.degree }),
        ...(profileUpdates.bio !== undefined && { bio: profileUpdates.bio }),
        ...(profileUpdates.avatar_url !== undefined && { avatar_url: profileUpdates.avatar_url }),
      },
    });
  } catch (authMetaErr) {
    console.warn('Could not sync user_metadata in Supabase Auth:', authMetaErr);
  }

  if (isProfilesTableMissing) {
    return {
      id: userId,
      ...profileUpdates,
      updated_at: new Date().toISOString(),
    };
  }

  const payload = {
    id: userId,
    ...(profileUpdates.full_name !== undefined && { full_name: profileUpdates.full_name }),
    ...(profileUpdates.university !== undefined && { university: profileUpdates.university }),
    ...(profileUpdates.degree !== undefined && { degree: profileUpdates.degree }),
    ...(profileUpdates.bio !== undefined && { bio: profileUpdates.bio }),
    ...(profileUpdates.avatar_url !== undefined && { avatar_url: profileUpdates.avatar_url }),
    updated_at: new Date().toISOString(),
  };

  let updatedRecord = null;

  try {
    const { data, error } = await supabase
      .from('profiles')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      if (
        error.code === 'PGRST205' ||
        error.code === '42P01' ||
        error.status === 404 ||
        String(error.message || '').toLowerCase().includes('profiles')
      ) {
        markProfilesTableMissing();
        return { id: userId, ...profileUpdates, updated_at: new Date().toISOString() };
      }
      const { data: updateData, error: updateErr } = await supabase
        .from('profiles')
        .update(payload)
        .eq('id', userId)
        .select()
        .single();
      if (updateErr) {
        if (
          updateErr.code === 'PGRST205' ||
          updateErr.code === '42P01' ||
          updateErr.status === 404 ||
          String(updateErr.message || '').toLowerCase().includes('profiles')
        ) {
          markProfilesTableMissing();
          return { id: userId, ...profileUpdates, updated_at: new Date().toISOString() };
        }
        throw updateErr;
      }
      updatedRecord = updateData;
    } else {
      updatedRecord = data;
    }
  } catch (dbErr) {
    if (
      dbErr?.code === 'PGRST205' ||
      dbErr?.code === '42P01' ||
      dbErr?.status === 404 ||
      String(dbErr?.message || '').toLowerCase().includes('profiles')
    ) {
      markProfilesTableMissing();
      return { id: userId, ...profileUpdates, updated_at: new Date().toISOString() };
    }
    console.warn('Database profile update notice:', dbErr);
    return { id: userId, ...profileUpdates, updated_at: new Date().toISOString() };
  }

  return updatedRecord;
}

// -----------------------------------------------------------------------------
// DATABASE (METADATA STORAGE FOR NOTES)
// -----------------------------------------------------------------------------

export function mapSupabaseNoteToFrontend(row) {
  return {
    id: row.id,
    title: row.title,
    courseCode: row.course_code,
    courseName: row.course_name || row.course_code,
    subject: row.subject, // explicitly expose subject field
    category: row.subject, // metadata storage for subject / category
    university: row.university,
    academicLevel: row.academic_level || 'Undergraduate',
    resourceType: row.resource_type || 'Lecture Notes',
    description: row.description,
    tags: Array.isArray(row.tags) ? row.tags : [],
    author: {
      name: row.author,
      degree: row.author_degree || 'Student',
      year: 'Class of 2026',
      avatar: row.author_avatar || null,
      id: row.author_id || null,
    },
    file: {
      name: row.file_name || 'Note_Attachment.pdf',
      size: row.file_size || '2.5 MB',
      pages: Number(row.pages) || 1,
      format: (row.file_name?.split('.').pop() || 'PDF').toUpperCase(),
      url: row.file_url || row.fileUrl || null, // Cloud storage bucket attachment URL
      type: row.file_type || 'application/pdf',
    },
    rating: Number(row.rating || 5.0),
    reviewsCount: Number(row.reviews_count || 0),
    downloads: Number(row.downloads || 0),
    views: Number(row.views || 0),
    uploadDate: row.created_at ? row.created_at.split('T')[0] : new Date().toISOString().split('T')[0],
    verified: row.verified ?? true,
    pagesContent: Array.isArray(row.pages_content) ? row.pages_content : [],
  };
}

export async function fetchNotesFromSupabase() {
  if (!supabase) return [];

  try {
    // Ensure persisted auth session is synchronized if available before reading
    try {
      await supabase.auth.getSession();
    } catch (sessionErr) {
      console.warn('Session sync note in fetchNotesFromSupabase:', sessionErr);
    }

    const { data, error } = await supabase
      .from('notes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetch error:', error);
      return [];
    }

    if (!data || data.length === 0) return [];
    return data.map(mapSupabaseNoteToFrontend);
  } catch (err) {
    console.warn('Network error fetching from Supabase:', err);
    return [];
  }
}

/**
 * Count the total number of notes uploaded by a specific user.
 * Queries Supabase using exact count with head: true.
 */
export async function fetchUserNotesCount(userId) {
  if (!supabase || !userId) return 0;

  try {
    // 1. Primary check: author_id column (NoteShare standard schema)
    const { count, error } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('author_id', userId);

    if (!error && typeof count === 'number') {
      return count;
    }

    // 2. Secondary fallback: user_id column
    const { count: fallbackCount, error: fallbackError } = await supabase
      .from('notes')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (!fallbackError && typeof fallbackCount === 'number') {
      return fallbackCount;
    }

    return 0;
  } catch (err) {
    console.warn('Failed to query user notes count from Supabase:', err);
    return 0;
  }
}

// Persistent memory of missing columns in public.notes to avoid repeating 400 Bad Request attempts
const KNOWN_MISSING_COLS_STORAGE_KEY = 'noteshare_missing_notes_cols';
const knownMissingNoteColumns = new Set();
try {
  const cachedCols = typeof localStorage !== 'undefined' ? localStorage.getItem(KNOWN_MISSING_COLS_STORAGE_KEY) : null;
  if (cachedCols) {
    JSON.parse(cachedCols).forEach((col) => knownMissingNoteColumns.add(col));
  }
} catch (e) {}

function rememberMissingNoteColumn(col) {
  if (!col) return;
  knownMissingNoteColumns.add(col);
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(KNOWN_MISSING_COLS_STORAGE_KEY, JSON.stringify(Array.from(knownMissingNoteColumns)));
    }
  } catch (e) {}
}

export async function insertNoteMetadata(noteData, user = null) {
  if (!supabase) return null;

  // Retrieve active session to ensure author_id matches current auth.uid()
  let authorId = user?.id;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user?.id) {
      authorId = session.user.id;
    }
  } catch (sessErr) {
    console.warn('Session verification notice:', sessErr);
  }

  if (!authorId) {
    throw new Error('Authentication required: You must be signed in with an active account to publish notes.');
  }

  const baseRow = {
    title: noteData.title,
    subject: noteData.category || noteData.subject,
    author: noteData.author?.name || 'Student Contributor',
    author_id: authorId,
    author_degree: noteData.author?.degree || '',
    author_avatar: noteData.author?.avatar || null,
    university: noteData.university,
    course_code: noteData.courseCode,
    course_name: noteData.courseName || noteData.courseCode,
    academic_level: noteData.academicLevel || 'Undergraduate',
    resource_type: noteData.resourceType || 'Lecture Notes',
    description: noteData.description,
    tags: Array.isArray(noteData.tags) ? noteData.tags : [],
    file_url: noteData.file?.url || null, // attachment URL in cloud storage bucket
    file_name: noteData.file?.name || null,
    file_size: noteData.file?.size || null,
    file_type: noteData.file?.type || 'application/pdf',
    pages: Number(noteData.file?.pages) || 1,
    rating: 5.0,
    reviews_count: 1,
    downloads: 0,
    views: 1,
    verified: true,
    pages_content: noteData.pagesContent || [],
  };

  let currentRow = { ...baseRow };

  // 1. Pre-strip any columns known to be missing from previous runs to prevent 400 Bad Request
  for (const col of knownMissingNoteColumns) {
    if (currentRow[col] !== undefined) {
      delete currentRow[col];
    }
  }

  // 2. Pre-probe table schema by inspecting columns of a sample row if available
  try {
    const { data: sampleRows } = await supabase
      .from('notes')
      .select('*')
      .limit(1);

    if (sampleRows && sampleRows.length > 0 && sampleRows[0]) {
      const existingDbColumns = new Set(Object.keys(sampleRows[0]));
      for (const key of Object.keys(currentRow)) {
        if (!existingDbColumns.has(key)) {
          rememberMissingNoteColumn(key);
          delete currentRow[key];
        }
      }
    }
  } catch (probeErr) {
    // Continue with resilient insert loop
  }

  // Resilient retry loop: dynamically strips any remaining columns missing from the user's Supabase schema
  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .insert([currentRow])
        .select()
        .single();

      if (!error && data) {
        return mapSupabaseNoteToFrontend(data);
      }

      if (!error) break;

      const errMsg = (error.message || '').toLowerCase();

      // Extract any missing column mentioned by PostgREST schema cache
      const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/i);
      if (missingColMatch && missingColMatch[1] && currentRow[missingColMatch[1]] !== undefined) {
        const col = missingColMatch[1];
        rememberMissingNoteColumn(col);
        delete currentRow[col];
        continue;
      }

      // Explicit fallbacks for known optional columns
      if (errMsg.includes('author_avatar') && currentRow.author_avatar !== undefined) {
        delete currentRow.author_avatar;
        continue;
      }
      if (errMsg.includes('pages_content') && currentRow.pages_content !== undefined) {
        delete currentRow.pages_content;
        continue;
      }
      if (errMsg.includes('verified') && currentRow.verified !== undefined) {
        delete currentRow.verified;
        continue;
      }
      if (errMsg.includes('author_degree') && currentRow.author_degree !== undefined) {
        delete currentRow.author_degree;
        continue;
      }
      if (errMsg.includes('course_name') && currentRow.course_name !== undefined) {
        delete currentRow.course_name;
        continue;
      }
      if (errMsg.includes('pages') && currentRow.pages !== undefined) {
        delete currentRow.pages;
        continue;
      }

      // If it's another error (such as RLS violation or network error), rethrow
      console.error('Fatal Supabase insertNoteMetadata error:', error);
      throw error;
    } catch (err) {
      if (attempt === 5) {
        console.error('Fatal Supabase insertNoteMetadata error:', err);
        throw err;
      }
    }
  }
}

/**
 * Updates a note's content in Supabase. Restricted by RLS to author_id = auth.uid()
 * Supports re-uploaded file attachment updates and resiliently handles schema columns.
 */
export async function updateNoteMetadataInSupabase(noteId, updates) {
  if (!supabase || !noteId) return null;

  const baseUpdates = {
    ...(updates.title !== undefined && { title: updates.title }),
    ...(updates.category !== undefined && { subject: updates.category }),
    ...(updates.subject !== undefined && { subject: updates.subject }),
    ...(updates.university !== undefined && { university: updates.university }),
    ...(updates.courseCode !== undefined && { course_code: updates.courseCode }),
    ...(updates.courseName !== undefined && { course_name: updates.courseName }),
    ...(updates.academicLevel !== undefined && { academic_level: updates.academicLevel }),
    ...(updates.resourceType !== undefined && { resource_type: updates.resourceType }),
    ...(updates.description !== undefined && { description: updates.description }),
    ...(updates.tags !== undefined && { tags: updates.tags }),
    ...(updates.author?.name !== undefined && { author: updates.author.name }),
    ...(updates.author?.degree !== undefined && { author_degree: updates.author.degree }),
    ...(updates.author?.avatar !== undefined && { author_avatar: updates.author.avatar }),
    // Re-uploaded file attachment fields
    ...(updates.file?.url !== undefined && { file_url: updates.file.url }),
    ...(updates.file?.name !== undefined && { file_name: updates.file.name }),
    ...(updates.file?.size !== undefined && { file_size: updates.file.size }),
    ...(updates.file?.type !== undefined && { file_type: updates.file.type }),
    ...(updates.file?.pages !== undefined && { pages: Number(updates.file.pages) || 1 }),
    ...(updates.pagesContent !== undefined && { pages_content: updates.pagesContent }),
    updated_at: new Date().toISOString(),
  };

  let currentUpdates = { ...baseUpdates };

  // 1. Pre-strip any columns known to be missing from previous schema checks
  for (const col of knownMissingNoteColumns) {
    if (currentUpdates[col] !== undefined) {
      delete currentUpdates[col];
    }
  }

  // 2. Pre-probe table schema by inspecting columns of a sample row if available
  try {
    const { data: sampleRows } = await supabase
      .from('notes')
      .select('*')
      .limit(1);

    if (sampleRows && sampleRows.length > 0 && sampleRows[0]) {
      const existingDbColumns = new Set(Object.keys(sampleRows[0]));
      for (const key of Object.keys(currentUpdates)) {
        if (!existingDbColumns.has(key)) {
          rememberMissingNoteColumn(key);
          delete currentUpdates[key];
        }
      }
    }
  } catch (probeErr) {
    // Continue with resilient update
  }

  // Resilient update loop
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const { data, error } = await supabase
        .from('notes')
        .update(currentUpdates)
        .eq('id', noteId)
        .select()
        .single();

      if (!error && data) {
        return mapSupabaseNoteToFrontend(data);
      }

      if (!error) break;

      const missingColMatch = error.message?.match(/Could not find the '([^']+)' column/i);
      if (missingColMatch && missingColMatch[1] && currentUpdates[missingColMatch[1]] !== undefined) {
        const col = missingColMatch[1];
        rememberMissingNoteColumn(col);
        delete currentUpdates[col];
        continue;
      }

      throw error;
    } catch (err) {
      if (attempt === 4) {
        console.error('Fatal Supabase updateNoteMetadataInSupabase error:', err);
        throw err;
      }
    }
  }
}

/**
 * Deletes a note from Supabase. Strictly restricted by RLS to author_id = auth.uid()
 */
export async function deleteNoteFromSupabase(noteId) {
  if (!supabase) return;
  const { error } = await supabase
    .from('notes')
    .delete()
    .eq('id', noteId);

  if (error) throw error;
}

export async function updateNoteDownloads(noteId, newCount) {
  if (!supabase) return;
  try {
    // Try secure RPC first
    const { error: rpcError } = await supabase.rpc('increment_note_downloads', {
      target_note_id: noteId,
    });

    if (rpcError) {
      // Fallback to direct update if caller is owner or RPC not yet deployed
      await supabase
        .from('notes')
        .update({ downloads: newCount })
        .eq('id', noteId);
    }
  } catch (err) {
    console.warn('Failed to update downloads in Supabase:', err);
  }
}

export async function updateNoteUpvotes(noteId, newRating, newReviewsCount) {
  if (!supabase) return;
  try {
    // Try secure RPC first
    const { error: rpcError } = await supabase.rpc('increment_note_upvotes', {
      target_note_id: noteId,
      new_rating: newRating,
    });

    if (rpcError) {
      // Fallback to direct update
      await supabase
        .from('notes')
        .update({ rating: newRating, reviews_count: newReviewsCount })
        .eq('id', noteId);
    }
  } catch (err) {
    console.warn('Failed to update rating in Supabase:', err);
  }
}

// -----------------------------------------------------------------------------
// CLOUD STORAGE BUCKET UPLOADS (PDF & IMAGE ATTACHMENTS)
// -----------------------------------------------------------------------------

/**
 * Uploads a PDF or Image attachment file to Supabase Cloud Storage bucket 'notes-files'
 * @param {File} file - Browser File object
 * @param {string} courseCode - Course code for organizing folder paths
 * @returns {Promise<{ publicUrl: string, filePath: string, fileName: string, fileSize: string, fileType: string }>}
 */
export async function uploadNoteAttachment(file, courseCode = 'GENERAL') {
  if (!supabase) {
    throw new Error('Supabase Cloud Storage is not configured. Falling back to local storage.');
  }

  const cleanCourse = courseCode.replace(/[^a-zA-Z0-9]/g, '_').toUpperCase();
  const fileExt = file.name.split('.').pop()?.toLowerCase() || 'pdf';
  const cleanBaseName = file.name
    .replace(/\.[^/.]+$/, '')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .slice(0, 32);

  const uniqueFileName = `${Date.now()}_${cleanBaseName}.${fileExt}`;
  const filePath = `${cleanCourse}/${uniqueFileName}`;

  // Upload to Supabase Storage bucket 'notes-files'
  const { data, error } = await supabase.storage
    .from('notes-files')
    .upload(filePath, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
    });

  if (error) {
    console.error('Supabase Storage bucket upload error:', error);
    throw error;
  }

  // Retrieve the public URL for the uploaded cloud attachment
  const { data: publicUrlData } = supabase.storage
    .from('notes-files')
    .getPublicUrl(filePath);

  return {
    publicUrl: publicUrlData.publicUrl,
    filePath: data.path,
    fileName: file.name,
    fileSize: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
    fileType: file.type || (fileExt === 'pdf' ? 'application/pdf' : 'image/jpeg'),
  };
}
