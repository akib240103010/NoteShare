-- ==============================================================================
-- NoteShare — Supabase Row Level Security (RLS) Policies for `notes` Table
-- Run this in your Supabase SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- 1. Ensure Row Level Security (RLS) is enabled on the notes table
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 2. SELECT Policy: Strictly restricted to authenticated users only (no anonymous public read)
DROP POLICY IF EXISTS "Anyone can read and download notes" ON public.notes;
DROP POLICY IF EXISTS "Public can view all notes" ON public.notes;
DROP POLICY IF EXISTS "Public read notes" ON public.notes;
DROP POLICY IF EXISTS "Public read access to notes" ON public.notes;
DROP POLICY IF EXISTS "Authenticated students can read and download notes" ON public.notes;

CREATE POLICY "Authenticated students can read and download notes"
  ON public.notes
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. INSERT Policy: Any authenticated student can insert a new note,
-- strictly ensuring author_id is set to their own authenticated user ID (auth.uid())
DROP POLICY IF EXISTS "Authenticated students can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Anyone can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Authenticated students can insert their own notes" ON public.notes;

CREATE POLICY "Authenticated students can insert notes"
  ON public.notes
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 4. UPDATE Policy: Strictly restricted to the user whose ID matches author_id of that note
DROP POLICY IF EXISTS "Students can only update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Anyone can update note statistics" ON public.notes;

CREATE POLICY "Students can only update their own notes"
  ON public.notes
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 5. DELETE Policy: Strictly restricted to the user whose ID matches author_id of that note
DROP POLICY IF EXISTS "Students can only delete their own notes" ON public.notes;

CREATE POLICY "Students can only delete their own notes"
  ON public.notes
  FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ------------------------------------------------------------------------------
-- 6. Helper Security Definer RPC Functions
-- Allows safe counter increments (downloads, reviews/upvotes) without exposing
-- arbitrary update access to non-author users.
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.increment_note_downloads(target_note_id UUID)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.notes
  SET downloads = downloads + 1
  WHERE id = target_note_id;
$$;

CREATE OR REPLACE FUNCTION public.increment_note_upvotes(target_note_id UUID, new_rating NUMERIC)
RETURNS VOID
LANGUAGE sql
SECURITY DEFINER
AS $$
  UPDATE public.notes
  SET reviews_count = reviews_count + 1,
      rating = new_rating
  WHERE id = target_note_id;
$$;
