-- ==============================================================================
-- NoteShare — Supabase Database & Storage Setup SQL
-- Run this in your Supabase Project's SQL Editor (Dashboard > SQL Editor)
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. Create the `profiles` table for student users (linked directly to auth.users)
-- ------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  university TEXT NOT NULL,
  degree TEXT DEFAULT '',
  bio TEXT DEFAULT '',
  avatar_url TEXT DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Ensure optional columns exist if table already existed
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS degree TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio TEXT DEFAULT '';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT DEFAULT '';

-- Enable Row Level Security (RLS) on profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Anyone can view student profiles
DROP POLICY IF EXISTS "Public profiles are viewable by everyone" ON public.profiles;
CREATE POLICY "Public profiles are viewable by everyone"
  ON public.profiles FOR SELECT
  USING (true);

-- 2. INSERT Policy: Students can insert their own profile
DROP POLICY IF EXISTS "Students can insert their own profile" ON public.profiles;
CREATE POLICY "Students can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- 3. UPDATE Policy: Students can update their own profile
DROP POLICY IF EXISTS "Students can update their own profile" ON public.profiles;
CREATE POLICY "Students can update their own profile"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- 4. DELETE Policy: Students can delete their own profile
DROP POLICY IF EXISTS "Students can delete their own profile" ON public.profiles;
CREATE POLICY "Students can delete their own profile"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (auth.uid() = id);

-- ------------------------------------------------------------------------------
-- PostgreSQL Trigger: Automatically create public profile on new student signup
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (
    id,
    full_name,
    email,
    university,
    created_at,
    updated_at
  )
  VALUES (
    NEW.id,
    COALESCE(
      NEW.raw_user_meta_data->>'full_name',
      NEW.raw_user_meta_data->>'name',
      split_part(NEW.email, '@', 1)
    ),
    NEW.email,
    COALESCE(
      NEW.raw_user_meta_data->>'university',
      'Global University'
    ),
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

-- Drop trigger if existing and bind to auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- 2. Create the `notes` metadata table
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  subject TEXT NOT NULL, -- e.g., 'Computer Science', 'Mathematics', 'Physics'
  author TEXT NOT NULL,
  author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  author_degree TEXT,
  author_avatar TEXT,
  university TEXT NOT NULL,
  course_code TEXT NOT NULL,
  course_name TEXT,
  academic_level TEXT DEFAULT 'Undergraduate',
  resource_type TEXT DEFAULT 'Lecture Notes',
  description TEXT NOT NULL,
  tags TEXT[] DEFAULT '{}',
  file_url TEXT, -- Cloud storage bucket attachment URL (PDF or Image)
  file_name TEXT,
  file_size TEXT,
  file_type TEXT DEFAULT 'application/pdf',
  pages INT DEFAULT 1,
  rating NUMERIC DEFAULT 5.0,
  reviews_count INT DEFAULT 0,
  downloads INT DEFAULT 0,
  views INT DEFAULT 0,
  verified BOOLEAN DEFAULT true,
  pages_content JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Ensure optional columns exist if table was already created
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS author_avatar TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS author_degree TEXT;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT true;
ALTER TABLE public.notes ADD COLUMN IF NOT EXISTS pages_content JSONB DEFAULT '[]'::jsonb;

-- Enable Row Level Security (RLS)
ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

-- 1. SELECT Policy: Strictly restricted to authenticated users only (anonymous public read removed)
DROP POLICY IF EXISTS "Anyone can read and download notes" ON public.notes;
DROP POLICY IF EXISTS "Public can view all notes" ON public.notes;
DROP POLICY IF EXISTS "Public read notes" ON public.notes;
DROP POLICY IF EXISTS "Public read access to notes" ON public.notes;
DROP POLICY IF EXISTS "Authenticated students can read and download notes" ON public.notes;
CREATE POLICY "Authenticated students can read and download notes"
  ON public.notes FOR SELECT
  TO authenticated
  USING (true);

-- 2. INSERT Policy: Any authenticated student can insert notes (author_id must equal their own user ID)
DROP POLICY IF EXISTS "Authenticated students can insert notes" ON public.notes;
DROP POLICY IF EXISTS "Anyone can insert notes" ON public.notes;
CREATE POLICY "Authenticated students can insert notes"
  ON public.notes FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = author_id);

-- 3. UPDATE Policy: Strictly restricted to the user whose ID matches the author_id of that note
DROP POLICY IF EXISTS "Students can only update their own notes" ON public.notes;
DROP POLICY IF EXISTS "Anyone can update note statistics" ON public.notes;
CREATE POLICY "Students can only update their own notes"
  ON public.notes FOR UPDATE
  TO authenticated
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

-- 4. DELETE Policy: Strictly restricted to the user whose ID matches the author_id of that note
DROP POLICY IF EXISTS "Students can only delete their own notes" ON public.notes;
CREATE POLICY "Students can only delete their own notes"
  ON public.notes FOR DELETE
  TO authenticated
  USING (auth.uid() = author_id);

-- ------------------------------------------------------------------------------
-- Helper Functions (RPC): Allow public counter increments without granting arbitrary UPDATE access
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

-- ------------------------------------------------------------------------------
-- 2. Setup Cloud Storage Bucket for PDF and Image Attachments
-- ------------------------------------------------------------------------------

-- Create the public bucket 'notes-files' if it doesn't already exist
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'notes-files',
  'notes-files',
  true,
  52428800, -- 50MB limit
  ARRAY['application/pdf', 'image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Storage Policy: Public access to read all files in 'notes-files' bucket
DROP POLICY IF EXISTS "Public read access for note attachments" ON storage.objects;
CREATE POLICY "Public read access for note attachments"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'notes-files');

-- Storage Policy: Allow authenticated and anon users to upload files to 'notes-files'
DROP POLICY IF EXISTS "Allow uploads to notes-files" ON storage.objects;
CREATE POLICY "Allow uploads to notes-files"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'notes-files');

-- ------------------------------------------------------------------------------
-- 3. Initial Seed Notes (MIT, Stanford, Harvard, Oxford, etc.)
-- ------------------------------------------------------------------------------

INSERT INTO public.notes (
  title, subject, author, author_degree, author_avatar, university, course_code, course_name, academic_level, resource_type, description, tags, file_name, file_size, pages, rating, reviews_count, downloads, views, pages_content
) VALUES 
(
  'Complete Algorithms & Data Structures Master Notes',
  'Computer Science',
  'Alexander Chen',
  'B.S. Computer Science & Math',
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80',
  'MIT (Massachusetts Institute of Technology)',
  '6.006',
  'Introduction to Algorithms',
  'Undergraduate',
  'Lecture Notes',
  'Comprehensive handwritten & typed lecture notes covering asymptotic analysis, balanced BSTs (AVL, Red-Black), hashing, Dijkstra, Bellman-Ford, and dynamic programming with full recurrence proofs.',
  ARRAY['Algorithms', 'Dynamic Programming', 'Graph Theory', 'Data Structures', 'MIT'],
  'MIT_6006_Algorithms_FullNotes_2025.pdf',
  '8.4 MB',
  48,
  4.95,
  342,
  5120,
  14200,
  '[
    {"pageNumber": 1, "title": "Asymptotic Notations & Recurrence Relations", "excerpt": "Formal definitions of Big-O, Omega, and Theta bounds. Master Theorem reference sheet with all 3 cases and substitution examples: T(n) = 2T(n/2) + O(n) yields O(n log n).", "keyTakeaway": "Always verify base cases and check regularity conditions for Case 3 of the Master Method."},
    {"pageNumber": 2, "title": "Balanced Binary Search Trees & AVL Rotations", "excerpt": "Detailed visualization of Single Left/Right Rotations and Double Left-Right (LR) / Right-Left (RL) rotations. Height balance invariant: |h_L - h_R| <= 1 maintained in O(log n) time.", "keyTakeaway": "Rotations preserve the inorder traversal order while restoring the O(log n) tree height."}
  ]'::jsonb
),
(
  'Machine Learning & Deep Learning Mathematical Foundations',
  'Computer Science',
  'Elena Rostova',
  'M.S. Artificial Intelligence',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=120&h=120&q=80',
  'Stanford University',
  'CS229',
  'Machine Learning',
  'Graduate',
  'Study Guide',
  'Clean mathematical derivations for linear regression, logistic regression, SVMs with Mercer kernels, EM algorithm, Gaussian Mixture Models, and backpropagation with matrix calculus notation.',
  ARRAY['Machine Learning', 'Gradient Descent', 'SVM', 'Probability', 'Stanford'],
  'Stanford_CS229_ML_Derivations_Guide.pdf',
  '6.2 MB',
  36,
  4.92,
  289,
  4380,
  11950,
  '[
    {"pageNumber": 1, "title": "Supervised Learning & Normal Equations", "excerpt": "Derivation of the closed-form solution theta = (X^T X)^{-1} X^T y via matrix gradients. Comparison against Stochastic Gradient Descent (SGD) computational complexity.", "keyTakeaway": "Normal equations scale as O(d^3), so use gradient descent when feature dimension d > 10,000."}
  ]'::jsonb
),
(
  'Honors Advanced Calculus & Linear Algebra (Proof Portfolio)',
  'Mathematics',
  'Julian Vance',
  'A.B. Mathematics',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&w=120&h=120&q=80',
  'Harvard University',
  'MATH 55a',
  'Honors Abstract Algebra & Analysis',
  'Undergraduate',
  'Lecture Notes',
  'Rigorous proof-based notes on finite-dimensional vector spaces, spectral theorem, Jordan canonical form, metric space topology, compactness, and multivariable differential forms.',
  ARRAY['Abstract Algebra', 'Linear Algebra', 'Real Analysis', 'Proofs', 'Harvard'],
  'Harvard_Math55a_Complete_Theorems.pdf',
  '12.1 MB',
  64,
  4.88,
  198,
  2980,
  8400,
  '[
    {"pageNumber": 1, "title": "Metric Spaces and Heine-Borel Theorem", "excerpt": "Equivalence of sequential compactness and topological compactness in Euclidean space R^n. Detailed proofs of open covers and finite subcovers.", "keyTakeaway": "In R^n, a subset is compact if and only if it is closed and bounded."}
  ]'::jsonb
),
(
  'Quantum Mechanics & Wave Equations Cheatsheet',
  'Physics',
  'Sophie Montgomery',
  'MPhys Physics',
  'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=120&h=120&q=80',
  'University of Oxford',
  'PHYS 301',
  'Quantum Mechanics II',
  'Undergraduate',
  'Formula Sheet',
  'High-yield exam review sheet covering time-independent perturbation theory, fine structure splitting, angular momentum addition, Clebsch-Gordan coefficients, and variational method.',
  ARRAY['Quantum Mechanics', 'Perturbation Theory', 'Schrodinger Equation', 'Oxford', 'Physics'],
  'Oxford_PHYS301_Quantum_Formulas.pdf',
  '3.8 MB',
  14,
  4.96,
  410,
  6300,
  18200,
  '[
    {"pageNumber": 1, "title": "Time-Independent Perturbation Theory (Non-Degenerate)", "excerpt": "First-order energy correction E_n^{(1)} = <n^{(0)}|H''|n^{(0)}>. Second-order energy correction and first-order state corrections sum over unperturbed states.", "keyTakeaway": "Second-order energy shifts always push levels apart unless matrix elements vanish due to parity selection rules."}
  ]'::jsonb
);
