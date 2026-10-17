# NoteShare 🎓 — Global Student Academic Notes Sharing Platform

A modern, responsive, high-performance web frontend for **NoteShare**, a global student academic notes-sharing platform. Built with React 19, Vite, Tailwind CSS v4, Lucide Icons, and **Supabase** for Authentication, Cloud Database Metadata, and Cloud Storage Bucket uploads.

---

## ⚡ Supabase Cloud Integration

NoteShare includes first-class integration with [Supabase](https://supabase.com/):

### 1. 🔐 User Authentication (`supabase.auth`)
- **Email & Password Authentication**: Full user signup and signin flows.
- **Student Profile Metadata**: Stores student full name, university affiliation, and major/degree.
- **Session Management**: Automatically persists sessions with auto-refresh tokens.
- **Demo Mode Fallback**: If Supabase credentials are not configured yet, NoteShare seamlessly operates in demo/local mode so you can test all features without interruption.

### 2. 🗄️ Notes Metadata Storage & Row Level Security (RLS)
- **Live Cloud Database**: Synchronizes notes with the Supabase PostgreSQL `notes` table.
- **Strict Row Level Security (RLS) Policies**:
  - **SELECT**: Anyone (public anon & authenticated) can read and download notes (`USING (true)`).
  - **INSERT**: Any authenticated student can insert notes, strictly enforced so that `author_id` equals `auth.uid()`.
  - **UPDATE**: Strictly restricted to the authenticated student who created the note (`USING (auth.uid() = author_id) WITH CHECK (auth.uid() = author_id)`).
  - **DELETE**: Strictly restricted to the student author (`USING (auth.uid() = author_id)`).
- **Security Definer RPCs**: `increment_note_downloads` and `increment_note_upvotes` allow public counter updates safely without giving arbitrary update permissions to non-authors.

### 3. ☁️ Cloud Storage Bucket (`notes-files`)
- **Multi-Format Attachments**: Uploads both **PDFs** and **Image attachments** (PNG, JPG, WEBP, GIF, DOCX).
- **Public CDN URLs**: Stores uploaded attachments in the Supabase Storage bucket `notes-files` and links the public URL to the note's database record.
- **In-App Reader**: Displays image attachments directly inside the reader modal and lets users download original cloud files with one click.

### 4. 🤖 Gemini AI PDF Verification API (`/api/verify-note`)
- **Endpoint**: `POST /api/verify-note` (served by Vite server middleware & Supabase Edge Function).
- **PDF Text Parsing**: Temporarily extracts text from the first few pages of uploaded PDFs in memory using `pdf-parse`.
- **Strict Gemini Evaluation**: Submits extracted text + student-declared title & subject to Gemini 2.5 Flash with the prompt:
  > *"Determine if this PDF content reasonably matches the stated topic/subject. Return a JSON response with `{ "isValid": true/false, "reason": "..." }`."*
- **Rejection Protection**: If `isValid` is false, halts the submission pipeline, displays the reason in a prominent red alert banner, and rejects uploading to cloud storage or database.
- **Smart Heuristic Fallback**: Includes a semantic domain heuristic engine when testing offline or without an active API key.

---

## ⚙️ Quick Supabase Setup

### Step 1: Create a Supabase Project
1. Go to [supabase.com](https://supabase.com/) and create a free project.
2. Navigate to **Project Settings > API** to get your **Project URL** and **anon public API key**.

### Step 2: Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Add your credentials:
```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```
*(Alternatively, you can click the **Supabase Setup** badge directly in the running app's navbar to input your credentials in the UI without restarting!)*

### Step 3: Run Database & Storage SQL Setup
Open your Supabase Dashboard, go to **SQL Editor**, and run the SQL script provided in [`supabase_setup.sql`](./supabase_setup.sql).
This automatically creates:
- The `public.notes` table with Row Level Security (RLS) policies.
- The `notes-files` public Cloud Storage bucket with upload & read policies.
- Initial seed notes from MIT, Stanford, Harvard, and Oxford.

---

## 🌟 Key Features

### 1. 🔍 Real-Time Multi-Field Search & Suggestion Engine
- **Instant Tokenized Search**: Search across course codes (e.g. `CS229`, `6.006`), note titles, subjects, university names, author names, descriptions, and custom tags.
- **Smart Auto-Suggestions**: Live suggestion panel displaying instant matching courses, topic tags, and global universities as students type.
- **Visual Match Highlighting**: Search terms are automatically highlighted with `<mark>` badges within titles, course codes, universities, and descriptions.
- **Live Results Counter**: Real-time counter badge inside the search bar indicating the exact number of matching study resources.
- **Keyboard Shortcut**: Press `/` from anywhere on the home page to immediately focus the search input.

### 2. 🏷️ Multi-Select Tag-Based Filtering Bar
- **Dynamic Tag Discovery**: Automatically aggregates all tags across the global catalog with live frequency counts (e.g. `#Algorithms (4)`, `#Machine Learning (3)`).
- **Multi-Select Filtering**: Students can combine multiple tags simultaneously.
- **Match Mode Toggle**: Switch between **Match ANY (OR)** and **Match ALL (AND)** for flexible or precision discovery.
- **Internal Tag Search**: Dedicated tag search box to find specific topics instantly from extensive lists.
- **Click-to-Filter Everywhere**: Click any `#tag` on note cards or inside the preview modal to immediately filter the catalog.
- **University Filter**: Dedicated dropdown to filter resources from specific global universities (MIT, Stanford, Oxford, Harvard, Cambridge, ETH Zürich, IIT Bombay, NUS, etc.).

### 3. 📄 Rich List & Grid Views for Uploaded Notes
- **Course & Institution Badges**: Clear course code tags and university affiliations (MIT, Stanford, Harvard, Oxford, Cambridge, ETH Zürich, IIT Bombay, NUS).
- **Academic Specifications**: Page count, file format (PDF, IMAGE, DOCX), file size, and upload date.
- **Engagement Metrics**: Average rating with review counts and download volume.
- **Quick Action Bar**:
  - 👁️ **Preview Note**: Opens an interactive multi-page document reader modal.
  - 📥 **Download**: Initiates an instant download with dynamic download count updates.
  - 🔖 **Bookmark / Save**: Saves notes locally for fast revision during study sessions.
  - 🔗 **Share**: Copies shareable links to the clipboard with toast notifications.

### 4. 🚀 Dedicated Upload Form Page
- **Dedicated Route / View**: Accessible with one click from the top navigation bar.
- **4-Step Structured Form**:
  1. **Course & Subject Metadata**: Title, Course Code, Subject Category, and University.
  2. **Summary & Topic Keywords**: Comprehensive topic description and custom tag creator with add/remove badges.
  3. **Cloud Storage Attachment**: Drag-and-drop file upload for **PDF documents** or **Images** with image preview and Supabase Storage bucket synchronization.
  4. **Contributor Identity & Honor Code**: Contributor details (autofilled when signed in), optional anonymous publication, plus an explicit Academic Integrity & Copyright pledge.

### 5. 📖 Interactive Multi-Page Document Reader Modal
- **Simulated Academic Reader**: Paginated view of key theorems, derivations, and practice problems.
- **Native Image Attachment Viewer**: Renders uploaded whiteboard photos, diagrams, and formula sheets directly in the reader canvas.
- **Live Upvoting**: Real-time upvoting system that updates note ratings and prevents duplicate votes.
- **Student Discussion**: Community comments section with an interactive input to post new reviews or questions.

---

## 🛠️ Tech Stack

- **Framework**: [React 19](https://react.dev/)
- **Backend / BaaS**: [@supabase/supabase-js](https://supabase.com/docs/reference/javascript/introduction)
  - Supabase Auth
  - Supabase Database (PostgreSQL)
  - Supabase Cloud Storage Buckets (`notes-files`)
- **Bundler**: [Vite 8](https://vite.dev/)
- **Styling**: [Tailwind CSS v4](https://tailwindcss.com/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Typography**: [Plus Jakarta Sans](https://fonts.google.com/specimen/Plus+Jakarta+Sans)

---

## 🚀 Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Run the development server
npm run dev

# 3. Build for production
npm run build
```
Navigate to `http://localhost:5173/` in your browser.

---

## 📁 Project Architecture

```
NoteShare/
├── supabase_setup.sql         # SQL schema script (tables, storage bucket, RLS, seed data)
├── supabase/
│   └── functions/
│       └── verify-note/
│           └── index.ts       # Supabase Edge Function for /functions/v1/verify-note
├── .env.example               # Template for Supabase credentials & Gemini API keys
├── .env                       # Local environment configuration
├── src/
│   ├── api/
│   │   ├── verifyNoteHandler.js     # PDF text extraction & Gemini 2.5 Flash validation
│   │   └── verifyNoteMiddleware.js  # Connect/Express middleware for /api/verify-note
│   ├── components/
│   │   ├── Navbar.jsx               # Navigation bar with auth & Supabase status badge
│   │   ├── HeroSearch.jsx           # Hero banner, stats, real-time search bar
│   │   ├── CategoryFilters.jsx      # Category pills, resource types, sorting, view toggle
│   │   ├── NoteCard.jsx             # Card component supporting both Grid and List views
│   │   ├── NoteListView.jsx         # Notes list container and empty state handler
│   │   ├── NotePreviewModal.jsx     # Document/Image reader, cloud link, upvoting, comments
│   │   ├── UploadPage.jsx           # Dedicated 4-step note upload form with Gemini AI verification
│   │   ├── BookmarksModal.jsx       # Saved notes drawer / modal
│   │   ├── AuthModal.jsx            # Supabase sign-in and sign-up modal
│   │   ├── SupabaseConfigModal.jsx  # In-app credentials configuration & SQL schema copy
│   │   ├── Toast.jsx                # Animated feedback toast notifications
│   │   └── Footer.jsx               # Global academic links, honor code pledge, copyright
│   ├── context/
│   │   └── AuthContext.jsx          # React context for Supabase auth and session state
│   ├── lib/
│   │   └── supabase.js              # Supabase client, auth helpers, DB CRUD, and storage uploads
│   ├── data/
│   │   └── initialNotes.js          # Seed dataset from world-class universities
│   ├── utils/
│   │   └── storage.js               # LocalStorage synchronization utilities
│   ├── App.jsx                      # Main application controller and state orchestrator
│   ├── main.jsx                     # React root DOM mounting
│   └── index.css                    # Tailwind CSS v4 styling & animations
├── package.json
└── vite.config.js                   # Vite config with /api/verify-note API plugin
```
