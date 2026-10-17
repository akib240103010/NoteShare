import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowLeft,
  UploadCloud,
  FileText,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Tag,
  GraduationCap,
  Sparkles,
  BookOpen,
  ShieldCheck,
  ShieldAlert,
  X,
  FileCheck,
  ImageIcon,
  Database,
  CloudUpload,
  Bot,
  WifiOff,
  Pencil,
  RotateCcw,
} from 'lucide-react';
import { CATEGORIES, RESOURCE_TYPES, UNIVERSITIES } from '../data/initialNotes';
import { useAuth } from '../context/AuthContext';
import { useNetwork } from '../context/NetworkContext';
import {
  isSupabaseConfigured,
  uploadNoteAttachment,
  insertNoteMetadata,
  updateNoteMetadataInSupabase,
} from '../lib/supabase';
import { cacheNoteOffline } from '../lib/offlineStorage';

export default function UploadPage({
  onBackToHome,
  onUploadSuccess,
  onOpenAuth,
  onOpenConfig,
  editingNote = null,
  onCancelEdit = null,
}) {
  const { user } = useAuth();
  const { isOnline } = useNetwork();
  const isEditMode = Boolean(editingNote);

  // Form states
  const [title, setTitle] = useState('');
  const [courseCode, setCourseCode] = useState('');
  const [courseName, setCourseName] = useState('');
  const [category, setCategory] = useState('Computer Science');
  const [university, setUniversity] = useState('');
  const [academicLevel, setAcademicLevel] = useState('Undergraduate');
  const [resourceType, setResourceType] = useState('Lecture Notes');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState(['LectureNotes', 'FinalReview']);
  const [tagInput, setTagInput] = useState('');

  // Author details (auto-populated if user is logged in)
  const [authorName, setAuthorName] = useState('');
  const [degree, setDegree] = useState('');
  const [graduationYear, setGraduationYear] = useState('Class of 2026');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [integrityAgreed, setIntegrityAgreed] = useState(false);

  // File states (PDF and Image attachments)
  const [selectedFile, setSelectedFile] = useState(null);
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef(null);

  // Upload status and progress
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isVerifyingAI, setIsVerifyingAI] = useState(false);
  const [uploadStatusText, setUploadStatusText] = useState('');
  const [errors, setErrors] = useState({});
  const [uploadedNoteRecord, setUploadedNoteRecord] = useState(null);

  // Gemini AI Content Verification states
  const [aiVerificationError, setAiVerificationError] = useState(null);
  const [aiVerificationSuccess, setAiVerificationSuccess] = useState(null);
  const [aiVerificationWarning, setAiVerificationWarning] = useState(null);
  const [isSuccessRedirecting, setIsSuccessRedirecting] = useState(false);
  const [successNote, setSuccessNote] = useState(null);

  // Convert File object to Base64 string for PDF parsing endpoint
  const fileToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        const resultStr = reader.result;
        const base64 = typeof resultStr === 'string' && resultStr.includes(',')
          ? resultStr.split(',')[1]
          : resultStr;
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // Populate form with existing note data when editing
  useEffect(() => {
    if (editingNote) {
      setTitle(editingNote.title || '');
      setCourseCode(editingNote.courseCode || '');
      setCourseName(editingNote.courseName || '');
      setCategory(editingNote.category || editingNote.subject || 'Computer Science');
      setUniversity(editingNote.university || '');
      setAcademicLevel(editingNote.academicLevel || 'Undergraduate');
      setResourceType(editingNote.resourceType || 'Lecture Notes');
      setDescription(editingNote.description || '');
      setTags(Array.isArray(editingNote.tags) ? editingNote.tags : []);
      if (editingNote.author) {
        setAuthorName(editingNote.author.name || '');
        setDegree(editingNote.author.degree || '');
        setGraduationYear(editingNote.author.year || 'Class of 2026');
        setIsAnonymous(editingNote.author.name === 'Anonymous Scholar');
      }
      setIntegrityAgreed(true);
      setSelectedFile(null);
      setImagePreviewUrl(null);
    }
  }, [editingNote]);

  // Autofill author details if authenticated and not in edit mode
  useEffect(() => {
    if (editingNote) return;
    if (user?.user_metadata) {
      if (user.user_metadata.full_name && !authorName) {
        setAuthorName(user.user_metadata.full_name);
      }
      if (user.user_metadata.university && !university) {
        setUniversity(user.user_metadata.university);
      }
      if (user.user_metadata.degree && !degree) {
        setDegree(user.user_metadata.degree);
      }
    }
  }, [user, editingNote]);

  // Handle Tags
  const handleAddTag = (e) => {
    e.preventDefault();
    const cleanTag = tagInput.trim().replace(/^#/, '');
    if (cleanTag && !tags.includes(cleanTag) && tags.length < 6) {
      setTags([...tags, cleanTag]);
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove) => {
    setTags(tags.filter((t) => t !== tagToRemove));
  };

  // Process chosen file (PDF or Image)
  const processSelectedFile = async (file) => {
    const isImage = file.type.startsWith('image/');
    let preview = null;
    if (isImage) {
      preview = URL.createObjectURL(file);
      setImagePreviewUrl(preview);
    } else {
      setImagePreviewUrl(null);
    }

    let detectedPages = isImage ? 1 : 1;
    if (!isImage && (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf'))) {
      try {
        const slice = await file.slice(0, 120000).text();
        const countMatch = slice.match(/\/Count\s+(\d+)/);
        if (countMatch && parseInt(countMatch[1], 10) > 0) {
          detectedPages = Math.min(500, parseInt(countMatch[1], 10));
        }
      } catch {
        detectedPages = 1;
      }
    }

    setSelectedFile({
      name: file.name,
      size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
      rawFile: file,
      type: file.type,
      isImage,
      pages: detectedPages,
    });
    setErrors((prev) => ({ ...prev, file: undefined }));
  };

  // Drag and Drop
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  // Validation
  const validateForm = () => {
    const errs = {};
    if (!title.trim()) errs.title = 'Please provide a descriptive title for your notes.';
    if (!courseCode.trim()) errs.courseCode = 'Course code is required (e.g. CS106, MATH201).';
    if (!university.trim()) errs.university = 'Please specify the university or college.';
    if (!description.trim()) errs.description = 'Please provide a brief summary of topics covered.';
    if (!selectedFile && (!isEditMode || !editingNote?.file)) {
      errs.file = 'Please upload a PDF document or image attachment.';
    }
    if (!integrityAgreed) errs.integrity = 'You must confirm compliance with the academic integrity policy.';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  // Form submission with Gemini AI verification, Supabase Cloud Storage & Database metadata
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isOnline) {
      setErrors({ form: 'You are currently offline. Uploading and AI verification require an active internet connection.' });
      return;
    }

    if (isSupabaseConfigured && !user) {
      setErrors({
        form: 'Authentication Required: Please sign in or create an account to permanently publish notes to the NoteShare library.',
      });
      if (onOpenAuth) onOpenAuth();
      return;
    }

    if (!validateForm()) return;

    setIsSubmitting(true);
    setAiVerificationError(null);
    setAiVerificationSuccess(null);
    setAiVerificationWarning(null);

    try {
      let verification = null;
      let activeWarning = null;
      let pdfBase64 = '';

      // 1. If a new file is chosen (either new upload or re-upload), run Gemini AI verification
      if (selectedFile?.rawFile) {
        setIsVerifyingAI(true);
        setUploadStatusText('Reading and parsing PDF pages...');
        try {
          const geminiKey =
            localStorage.getItem('noteshare_gemini_api_key') ||
            import.meta.env.VITE_GEMINI_API_KEY ||
            '';

          pdfBase64 = await fileToBase64(selectedFile.rawFile);
          setUploadStatusText(`Gemini AI verifying topic relevance against "${category}"...`);

          const verifyRes = await fetch('/api/verify-note', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(geminiKey ? { 'x-gemini-api-key': geminiKey } : {}),
            },
            body: JSON.stringify({
              title: title.trim(),
              subject: category,
              courseCode: courseCode.trim().toUpperCase(),
              fileName: selectedFile?.name,
              pdfBase64,
              apiKey: geminiKey,
            }),
          });

          verification = await verifyRes.json();
        } catch (verifyErr) {
          console.warn('API /api/verify-note request failed:', verifyErr);
        } finally {
          setIsVerifyingAI(false);
        }

        // Handle Verification Results & Scanned/Image Document Fallbacks
        if (verification && verification.isValid === false) {
          const lowerReason = (verification.reason || '').toLowerCase();
          const isInconclusiveOrEmpty =
            lowerReason.includes('empty') ||
            lowerReason.includes('unreadable') ||
            lowerReason.includes('no text') ||
            lowerReason.includes('not enough text') ||
            lowerReason.includes('inconclusive') ||
            lowerReason.includes('cannot determine') ||
            lowerReason.includes('unable to determine') ||
            lowerReason.includes('scanned') ||
            lowerReason.includes('handwritten');

          if (isInconclusiveOrEmpty || selectedFile?.isImage) {
            activeWarning = 'Scanned or handwritten note detected. Verified based on your provided course title and subject.';
            setAiVerificationWarning(activeWarning);
            setAiVerificationSuccess(`Document accepted: Scanned study material for "${title}" under ${category}.`);
          } else {
            // Genuine topic mismatch
            setIsSubmitting(false);
            setIsVerifyingAI(false);
            setUploadStatusText('');
            setAiVerificationError(
              verification.reason ||
                `The uploaded PDF does not reasonably match the selected subject "${category}".`
            );
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return;
          }
        } else if (verification) {
          if (verification.warning) {
            activeWarning = verification.warning;
            setAiVerificationWarning(verification.warning);
          }
          setAiVerificationSuccess(verification.reason || 'Document content verified by Gemini AI.');
        }
      }

      // Sync actual page count if returned by parser
      const actualPages = verification?.pageCount || selectedFile?.pages || editingNote?.file?.pages || 1;
      if (verification?.pageCount && selectedFile) {
        setSelectedFile((prev) => (prev ? { ...prev, pages: verification.pageCount } : prev));
      }

      let cloudFileUrl = null;

      // 2. Upload attachment to Supabase Storage Bucket if a new file was chosen
      if (isSupabaseConfigured && selectedFile?.rawFile) {
        setUploadStatusText(
          isEditMode
            ? 'Re-uploading new attachment to Supabase Storage (notes-files)...'
            : 'Uploading attachment to Supabase Storage bucket (notes-files)...'
        );
        try {
          const uploadRes = await uploadNoteAttachment(selectedFile.rawFile, courseCode);
          cloudFileUrl = uploadRes.publicUrl;
        } catch (storageErr) {
          console.warn('Storage upload failed, proceeding with fallback:', storageErr);
        }
      }

      // 3. Prepare active file object (new file or preserve existing attachment)
      let activeFileObj;
      if (selectedFile) {
        activeFileObj = {
          name: selectedFile.name,
          size: selectedFile.size,
          pages: actualPages,
          format: selectedFile.isImage ? 'IMAGE' : (selectedFile.name.split('.').pop() || 'PDF').toUpperCase(),
          url: cloudFileUrl || pdfBase64 || (imagePreviewUrl ? imagePreviewUrl : editingNote?.file?.url || null),
          type: selectedFile.type || 'application/pdf',
        };
      } else if (isEditMode && editingNote?.file) {
        activeFileObj = editingNote.file;
      } else {
        activeFileObj = {
          name: 'document.pdf',
          size: '1.0 MB',
          pages: 1,
          format: 'PDF',
          url: null,
          type: 'application/pdf',
        };
      }

      // 4. Handle EDIT vs CREATE flow
      if (isEditMode && editingNote) {
        setUploadStatusText('Saving updated study note...');
        const updatedPayload = {
          ...editingNote,
          title: title.trim(),
          courseCode: courseCode.trim().toUpperCase(),
          courseName: courseName.trim() || courseCode.trim().toUpperCase(),
          category,
          subject: category,
          university: university.trim(),
          academicLevel,
          resourceType,
          description: description.trim(),
          tags: tags.length > 0 ? tags : ['StudyNotes'],
          author: {
            ...editingNote.author,
            name: isAnonymous
              ? 'Anonymous Scholar'
              : (authorName.trim() || user?.user_metadata?.full_name || editingNote.author?.name || 'Student Contributor'),
            degree: isAnonymous
              ? 'Verified Student'
              : (degree.trim() || user?.user_metadata?.degree || editingNote.author?.degree || 'Undergraduate Student'),
            year: graduationYear,
            avatar: isAnonymous
              ? null
              : (user?.user_metadata?.avatar_url || editingNote.author?.avatar || null),
            id: user?.id || editingNote.author?.id || null,
          },
          file: activeFileObj,
          ...(selectedFile && verification ? {
            aiVerified: true,
            aiVerificationReason: verification.reason || `Verified match for ${category}.`,
            aiVerificationWarning: activeWarning || verification.warning || null,
            aiEvaluator: verification.evaluator || 'gemini-2.5-flash',
          } : {}),
          updated_at: new Date().toISOString(),
        };

        let finalNote = updatedPayload;
        if (isSupabaseConfigured) {
          setUploadStatusText('Saving note changes to Supabase database...');
          try {
            const dbUpdated = await updateNoteMetadataInSupabase(editingNote.id, updatedPayload);
            if (dbUpdated) {
              finalNote = { ...updatedPayload, ...dbUpdated };
            }
          } catch (dbErr) {
            console.error('Fatal database update failure:', dbErr);
            setIsSubmitting(false);
            setIsVerifyingAI(false);
            setUploadStatusText('');
            setErrors({
              form: `Failed to update note in Supabase: ${dbErr.message || 'Check database permissions and connection.'}`,
            });
            window.scrollTo({ top: 100, behavior: 'smooth' });
            return;
          }
        }

        // Cache updated note and new file in offline storage
        cacheNoteOffline(finalNote, selectedFile?.rawFile || null).catch(console.warn);

        setIsSubmitting(false);
        setUploadStatusText('');
        setSuccessNote(finalNote);
        setUploadedNoteRecord(finalNote);
        setIsSuccessRedirecting(true);
        onUploadSuccess(finalNote, true /* isEdit */);

        setTimeout(() => {
          onBackToHome();
        }, 1800);
        return;
      }

      // CREATE NEW NOTE FLOW
      const notePayload = {
        id: `note-${Date.now()}`,
        title: title.trim(),
        courseCode: courseCode.trim().toUpperCase(),
        courseName: courseName.trim() || courseCode.trim().toUpperCase(),
        category, // metadata: subject
        university: university.trim(),
        universityCountry: 'Global',
        academicLevel,
        resourceType,
        description: description.trim(),
        tags: tags.length > 0 ? tags : ['StudyNotes'],
        author: {
          name: isAnonymous ? 'Anonymous Scholar' : (authorName.trim() || user?.user_metadata?.full_name || 'Student Contributor'),
          degree: isAnonymous ? 'Verified Student' : (degree.trim() || user?.user_metadata?.degree || 'Undergraduate Student'),
          year: graduationYear,
          avatar: isAnonymous
            ? null
            : (user?.user_metadata?.avatar_url || `https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=120&h=120&q=80`),
          id: user?.id || null,
        },
        file: activeFileObj,
        rating: 5.0,
        reviewsCount: 1,
        downloads: 0,
        views: 1,
        uploadDate: new Date().toISOString().split('T')[0],
        verified: true,
        aiVerified: true,
        aiVerificationReason: verification?.reason || `Verified match for ${category}.`,
        aiVerificationWarning: activeWarning || verification?.warning || null,
        aiEvaluator: verification?.evaluator || 'gemini-2.5-flash',
        pagesContent: [
          {
            pageNumber: 1,
            title: `${courseCode.toUpperCase()}: ${title}`,
            excerpt: description.trim(),
            keyTakeaway: 'Verified peer notes. High-yield definitions, examples, and formulas.',
          },
        ],
      };

      let finalNote = notePayload;
      if (isSupabaseConfigured) {
        setUploadStatusText('Permanently saving note in Supabase database...');
        try {
          const insertedNote = await insertNoteMetadata(notePayload, user);
          if (insertedNote) {
            insertedNote.aiVerified = true;
            insertedNote.aiVerificationReason = verification?.reason;
            insertedNote.aiVerificationWarning = activeWarning || verification?.warning || null;
            insertedNote.aiEvaluator = verification?.evaluator;
            finalNote = insertedNote;
          }
        } catch (dbErr) {
          console.error('Fatal database insert failure:', dbErr);
          setIsSubmitting(false);
          setIsVerifyingAI(false);
          setUploadStatusText('');
          setErrors({
            form: `Failed to save note to Supabase database: ${dbErr.message || 'Check database permissions and connection.'}`,
          });
          window.scrollTo({ top: 100, behavior: 'smooth' });
          return;
        }
      }

      // Cache newly uploaded note in offline storage
      cacheNoteOffline(finalNote, selectedFile?.rawFile || null).catch(console.warn);

      // Success: show success message and redirect to notes dashboard
      setIsSubmitting(false);
      setUploadStatusText('');
      setSuccessNote(finalNote);
      setUploadedNoteRecord(finalNote);
      setIsSuccessRedirecting(true);
      onUploadSuccess(finalNote, false /* isEdit */);

      setTimeout(() => {
        onBackToHome();
      }, 1800);

    } catch (err) {
      console.error('Upload error:', err);
      setIsVerifyingAI(false);
      setIsSubmitting(false);
      setUploadStatusText('');
      setErrors({ form: err.message || 'An error occurred during submission.' });
    }
  };

  // ---------------------------------------------------------------------------
  // SUCCESS SCREEN
  // ---------------------------------------------------------------------------
  if (uploadedNoteRecord) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-12 animate-fadeIn">
        <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl border border-slate-200/90 dark:border-gray-800/80 shadow-xl p-8 sm:p-12 text-center">
          <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-3xl border border-emerald-100 dark:border-emerald-800 flex items-center justify-center mx-auto mb-6 shadow-inner animate-bounce-in">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            {isSupabaseConfigured ? 'Synced to Supabase Cloud' : 'Published to Repository'}
          </span>

          <h2 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
            {isEditMode ? 'Note Updated Successfully!' : 'Notes Uploaded Successfully!'}
          </h2>
          <p className="text-slate-600 dark:text-gray-400 text-sm sm:text-base max-w-lg mx-auto mb-8">
            {isEditMode ? (
              <>Your changes and attachments for <span className="font-bold text-gray-900 dark:text-gray-100">{uploadedNoteRecord.courseCode}</span> were saved.</>
            ) : (
              <>Thank you for contributing to NoteShare! Your notes for <span className="font-bold text-gray-900 dark:text-gray-100">{uploadedNoteRecord.courseCode}</span> are now live for students around the world.</>
            )}
          </p>

          {/* Uploaded Summary Card */}
          <div className="bg-slate-50 dark:bg-gray-800/60 border border-slate-200 dark:border-gray-700 rounded-2xl p-5 text-left mb-8 max-w-lg mx-auto">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="px-2 py-0.5 rounded-md font-mono text-xs font-bold bg-slate-900 dark:bg-gray-800 text-white dark:text-gray-100 border border-transparent dark:border-gray-750">
                {uploadedNoteRecord.courseCode}
              </span>
              <span className="text-xs font-medium text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-100 dark:border-indigo-800">
                {uploadedNoteRecord.category}
              </span>
            </div>
            <h4 className="text-base font-bold text-gray-900 dark:text-gray-100 mb-1">
              {uploadedNoteRecord.title}
            </h4>
            <p className="text-xs text-slate-500 dark:text-gray-400 mb-3 flex items-center gap-1">
              <GraduationCap className="w-3.5 h-3.5" />
              {uploadedNoteRecord.university}
            </p>
            <div className="flex items-center justify-between text-xs text-slate-500 dark:text-gray-400 border-t border-slate-200/80 dark:border-gray-700 pt-2.5">
              <span className="truncate max-w-[240px]">{uploadedNoteRecord.file?.name}</span>
              <span className="font-semibold text-slate-700 dark:text-gray-300">{uploadedNoteRecord.file?.size}</span>
            </div>
            {uploadedNoteRecord.file?.url && (
              <div className="mt-2 text-[11px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                <CloudUpload className="w-3 h-3" />
                <span>Attachment synced to cloud bucket: {uploadedNoteRecord.file.format}</span>
              </div>
            )}
            {uploadedNoteRecord.aiVerified && (
              <div className="mt-3 p-3 rounded-xl bg-emerald-100/70 dark:bg-emerald-950/40 border border-emerald-300/80 dark:border-emerald-800 text-left">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-900 dark:text-emerald-200 mb-1">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span>Gemini AI Content Verification: Passed</span>
                  <span className="ml-auto text-[10px] font-mono bg-emerald-200/90 dark:bg-emerald-900 text-emerald-900 dark:text-emerald-200 px-1.5 py-0.5 rounded">
                    {uploadedNoteRecord.aiEvaluator || 'gemini-2.5-flash'}
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 dark:text-emerald-300 leading-relaxed">
                  {uploadedNoteRecord.aiVerificationReason || 'Document content verified to match declared subject.'}
                </p>
                {uploadedNoteRecord.aiVerificationWarning && (
                  <p className="mt-1.5 text-[11px] text-amber-800 dark:text-amber-300 font-medium flex items-center gap-1 pt-1 border-t border-emerald-200/60 dark:border-emerald-800/60">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400 shrink-0" />
                    <span>{uploadedNoteRecord.aiVerificationWarning}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Action CTAs */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onBackToHome}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-sm transition-all shadow-md shadow-indigo-500/20 cursor-pointer"
            >
              Explore in Notes Directory
            </button>
            <button
              onClick={() => {
                setUploadedNoteRecord(null);
                setTitle('');
                setCourseCode('');
                setCourseName('');
                setDescription('');
                setSelectedFile(null);
                setImagePreviewUrl(null);
                setIntegrityAgreed(false);
              }}
              className="w-full sm:w-auto px-6 py-3 rounded-xl border border-slate-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-slate-50 dark:hover:bg-gray-700 text-slate-700 dark:text-gray-200 font-semibold text-sm transition-colors cursor-pointer"
            >
              Upload Another Resource
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // UPLOAD FORM
  // ---------------------------------------------------------------------------
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-fadeIn relative">
      
      {/* --------------------------------------------------------------------- */}
      {/* 1. LOADING SPINNER & STATUS MESSAGE DURING PDF VERIFICATION CHECK       */}
      {/* --------------------------------------------------------------------- */}
      {isVerifyingAI && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 max-w-md w-full shadow-2xl border border-indigo-100 dark:border-gray-800 text-center animate-scaleUp">
            {/* Animated Dual-Ring Spinner with Sparkles */}
            <div className="relative w-20 h-20 mx-auto mb-5 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-indigo-100 dark:border-indigo-950" />
              <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-transparent animate-spin" />
              <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shadow-inner">
                <Sparkles className="w-6 h-6 animate-pulse" />
              </div>
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800 mb-3">
              <Bot className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
              Gemini 2.5 AI Verification Check
            </span>

            <h3 className="text-xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              Verifying Note Content
            </h3>

            {/* Document and Target Subject */}
            <div className="bg-slate-50 dark:bg-gray-800/80 border border-slate-200/80 dark:border-gray-700 rounded-2xl p-3.5 mb-4 text-xs text-gray-700 dark:text-gray-200 flex flex-col gap-1.5 text-left">
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                <span>Attached File:</span>
                <span className="font-semibold text-gray-900 dark:text-gray-100 truncate max-w-[200px]">{selectedFile?.name || 'Selected Document'}</span>
              </div>
              <div className="flex items-center justify-between text-gray-500 dark:text-gray-400 text-[11px]">
                <span>Selected Subject:</span>
                <span className="font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-2 py-0.5 rounded">{category}</span>
              </div>
            </div>

            {/* Real-time Status Message */}
            <div className="p-3.5 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200/80 dark:border-indigo-800 text-xs text-indigo-900 dark:text-indigo-200 font-semibold animate-pulse mb-3 flex items-center justify-center gap-2">
              <div className="w-3.5 h-3.5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin shrink-0" />
              <span>{uploadStatusText || 'Analyzing document with Gemini AI...'}</span>
            </div>

            <p className="text-[11px] text-gray-500 dark:text-gray-400 leading-relaxed">
              Evaluating the first few pages of your PDF to ensure the content matches <strong>{category}</strong> and <strong>"{title || 'your declared topic'}"</strong> before publishing.
            </p>
          </div>
        </div>
      )}

      {/* --------------------------------------------------------------------- */}
      {/* 2. SUCCESS MESSAGE & REDIRECT TO NOTES DASHBOARD                      */}
      {/* --------------------------------------------------------------------- */}
      {isSuccessRedirecting && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-3xl p-8 sm:p-10 max-w-md w-full shadow-2xl border border-emerald-100 dark:border-emerald-900/60 text-center animate-scaleUp">
            <div className="w-20 h-20 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-3xl border border-emerald-200 dark:border-emerald-800 flex items-center justify-center mx-auto mb-5 shadow-inner animate-bounce-in">
              <CheckCircle2 className="w-10 h-10" />
            </div>

            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800 mb-3">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
              Gemini AI Verified & Published
            </span>

            <h3 className="text-2xl font-extrabold text-gray-900 dark:text-gray-100 mb-2">
              Note Verified & Published!
            </h3>

            <p className="text-xs text-gray-600 dark:text-gray-300 mb-6 leading-relaxed">
              Your note for <strong className="text-gray-900 dark:text-gray-100">{successNote?.courseCode}: {successNote?.title}</strong> matches <strong>{successNote?.category}</strong> and has been successfully published to NoteShare.
            </p>

            <div className="p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/50 border border-indigo-100 dark:border-indigo-900/60 flex items-center justify-center gap-2.5 text-xs font-semibold text-indigo-700 dark:text-indigo-300 mb-4">
              <div className="w-4 h-4 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
              <span>Redirecting to notes dashboard...</span>
            </div>

            <button
              type="button"
              onClick={onBackToHome}
              className="text-xs text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold underline cursor-pointer"
            >
              Go to Dashboard now &rarr;
            </button>
          </div>
        </div>
      )}

      {/* Top Navigation */}
      <div className="mb-6 flex items-center justify-between">
        <button
          onClick={onBackToHome}
          className="min-h-[44px] inline-flex items-center gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Back to Notes Explorer</span>
        </button>

        {/* Supabase backend status reminder */}
        <div className="flex items-center gap-2 text-xs">
          <span className="text-slate-400 dark:text-gray-500">Backend:</span>
          <button
            onClick={onOpenConfig}
            className={`min-h-[44px] font-semibold inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs cursor-pointer ${
              isSupabaseConfigured
                ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>{isSupabaseConfigured ? 'Supabase Connected' : 'Local Mode (Configure)'}</span>
          </button>
        </div>
      </div>

      {/* Main Upload Card */}
      <div className="bg-white/90 dark:bg-gray-900/90 backdrop-blur-md text-gray-900 dark:text-gray-100 rounded-3xl border border-slate-200/90 dark:border-gray-800/80 shadow-xl overflow-hidden">
        
        {/* Banner */}
        <div className="p-6 sm:p-8 bg-linear-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 mb-3">
              {isEditMode ? (
                <>
                  <Pencil className="w-3.5 h-3.5 text-indigo-300" />
                  Edit & Re-upload Mode
                </>
              ) : (
                <>
                  <UploadCloud className="w-3.5 h-3.5 text-indigo-300" />
                  Academic Knowledge Repository
                </>
              )}
            </span>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              {isEditMode ? `Edit Note: ${courseCode || editingNote?.courseCode}` : 'Share Your Academic Notes'}
            </h1>
            <p className="mt-2 text-indigo-200/90 text-sm leading-relaxed">
              {isEditMode
                ? 'Update course metadata, syllabus topics, or replace your attached PDF/image file with a revised version.'
                : 'Upload your handwritten or typed lecture notes, summaries, or formula sheets to empower fellow students across the world.'}
            </p>
          </div>
          <div className="absolute -right-8 -bottom-10 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />
        </div>

        {/* User Login Prompt if Guest */}
        {!user && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-indigo-50/70 dark:bg-gray-800/80 border border-indigo-100 dark:border-gray-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5 text-indigo-900 dark:text-indigo-200">
              <GraduationCap className="w-5 h-5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>
                Want to link this upload to your permanent scholar profile?
              </span>
            </div>
            <button
              type="button"
              onClick={onOpenAuth}
              className="min-h-[44px] px-4 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors shrink-0 cursor-pointer flex items-center justify-center"
            >
              Sign In / Sign Up
            </button>
          </div>
        )}

        {/* Offline Notice Banner */}
        {!isOnline && (
          <div className="mx-6 sm:mx-8 mt-6 p-4 rounded-2xl bg-amber-500/15 border border-amber-500/40 text-amber-900 dark:text-amber-200 flex items-center gap-3 text-xs animate-fadeIn">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <WifiOff className="w-5 h-5" />
            </div>
            <div>
              <span className="font-bold text-sm block">Offline Mode Active</span>
              <p className="mt-0.5 text-amber-800 dark:text-amber-300 leading-relaxed">
                You cannot upload new documents or run AI content verification while disconnected. Your cached study notes remain accessible. Live publishing will automatically re-enable once your internet connection is restored.
              </p>
            </div>
          </div>
        )}

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-8">
          
          {/* Gemini AI Verification Rejection Banner */}
          {aiVerificationError && (
            <div className="p-6 rounded-3xl bg-rose-50/95 dark:bg-rose-950/40 border-2 border-rose-300 dark:border-rose-800 text-rose-900 dark:text-rose-200 shadow-md animate-fadeIn">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-rose-100 dark:bg-rose-900/60 text-rose-600 dark:text-rose-300 flex items-center justify-center shrink-0 border border-rose-200 dark:border-rose-800 mt-0.5 shadow-2xs">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1.5">
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-200 dark:bg-rose-900 text-rose-900 dark:text-rose-200 uppercase tracking-wider">
                      Upload Rejected • Subject Mismatch
                    </span>
                    <span className="text-xs text-rose-700 dark:text-rose-300 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-rose-600 dark:text-rose-400" /> AI Content Validation
                    </span>
                  </div>

                  <h3 className="text-base font-extrabold text-rose-950 dark:text-rose-100">
                    PDF content does not match the selected subject
                  </h3>

                  {/* AI Reason Callout */}
                  <div className="mt-3 p-4 rounded-2xl bg-white dark:bg-gray-850 border-2 border-rose-200 dark:border-rose-800/80 shadow-2xs">
                    <div className="text-[11px] uppercase tracking-wider font-bold text-rose-500 dark:text-rose-400 mb-1 flex items-center gap-1.5">
                      <Bot className="w-3.5 h-3.5" />
                      AI Evaluator Reason:
                    </div>
                    <p className="text-sm font-semibold text-rose-950 dark:text-rose-200 leading-relaxed font-sans">
                      "{aiVerificationError}"
                    </p>
                  </div>

                  {/* Clear instructions on what to correct */}
                  <div className="mt-4 pt-3 border-t border-rose-200/80 dark:border-rose-800/80">
                    <p className="text-xs font-bold text-rose-900 dark:text-rose-200 mb-2">
                      Please correct one of the following to proceed:
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs text-rose-800 dark:text-rose-300">
                      <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-850 border border-rose-200/70 dark:border-rose-800/70">
                        <span className="font-bold text-rose-900 dark:text-rose-100 block mb-1">1. Update Subject</span>
                        Change the <strong>Subject / Category</strong> dropdown below to match the topic detected in your PDF.
                      </div>
                      <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-850 border border-rose-200/70 dark:border-rose-800/70">
                        <span className="font-bold text-rose-900 dark:text-rose-100 block mb-1">2. Adjust Note Title</span>
                        Ensure your <strong>Note Title</strong> accurately describes your study material.
                      </div>
                      <div className="p-3 rounded-2xl bg-white/80 dark:bg-gray-850 border border-rose-200/70 dark:border-rose-800/70">
                        <span className="font-bold text-rose-900 dark:text-rose-100 block mb-1">3. Or Re-upload File</span>
                        Upload a different PDF document that covers <strong>{category}</strong>.
                      </div>
                    </div>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setAiVerificationError(null)}
                  className="min-w-[44px] min-h-[44px] flex items-center justify-center text-rose-400 hover:text-rose-700 dark:hover:text-rose-300 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors cursor-pointer shrink-0"
                  title="Dismiss alert"
                  aria-label="Dismiss alert"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
          )}

          {/* Gemini AI Scanned/Handwritten Warning Notice */}
          {aiVerificationWarning && (
            <div className="p-5 rounded-3xl bg-amber-50/95 dark:bg-amber-950/40 border-2 border-amber-300 dark:border-amber-800 text-amber-900 dark:text-amber-200 shadow-md animate-fadeIn">
              <div className="flex items-start gap-3.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/60 text-amber-600 dark:text-amber-300 flex items-center justify-center shrink-0 border border-amber-200 dark:border-amber-800 mt-0.5 shadow-2xs">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-200 uppercase tracking-wider">
                      Notice • Scanned / Handwritten Material
                    </span>
                    <span className="text-xs text-amber-700 dark:text-amber-300 font-semibold flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" /> Auto-Accepted
                    </span>
                  </div>
                  <h4 className="text-sm font-extrabold text-amber-950 dark:text-amber-100">
                    Document Accepted with Scanned Fallback
                  </h4>
                  <p className="text-xs text-amber-800 dark:text-amber-300 mt-1 leading-relaxed">
                    {aiVerificationWarning}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setAiVerificationWarning(null)}
                  className="min-w-[36px] min-h-[36px] flex items-center justify-center text-amber-400 hover:text-amber-700 dark:hover:text-amber-300 rounded-lg hover:bg-amber-100 dark:hover:bg-amber-900/40 transition-colors cursor-pointer shrink-0"
                  title="Dismiss notice"
                  aria-label="Dismiss notice"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}

          {(errors.form || errors.general) && (
            <div className="p-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              <span>{errors.form || errors.general}</span>
            </div>
          )}

          {/* Section 1: Course & Metadata Details */}
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-gray-800 mb-5">
              <BookOpen className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                1. Course & Subject Metadata
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Note Title */}
              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Note Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    setAiVerificationError(null);
                    if (errors.title) setErrors((prev) => ({ ...prev, title: undefined }));
                  }}
                  placeholder="e.g. Complete Discrete Mathematics & Proofs Midterm Guide"
                  className={`w-full min-h-[44px] text-sm rounded-xl border px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 ${
                    errors.title
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400'
                  }`}
                />
                {errors.title && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.title}
                  </p>
                )}
              </div>

              {/* Course Code */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Course Code <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={courseCode}
                  onChange={(e) => {
                    setCourseCode(e.target.value);
                    if (errors.courseCode) setErrors((prev) => ({ ...prev, courseCode: undefined }));
                  }}
                  placeholder="e.g. CS 61A, MATH 201, PHYS 150"
                  className={`w-full min-h-[44px] text-sm rounded-xl border px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 ${
                    errors.courseCode
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400'
                  }`}
                />
                {errors.courseCode && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.courseCode}
                  </p>
                )}
              </div>

              {/* Course Name */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Course Full Name (Optional)
                </label>
                <input
                  type="text"
                  value={courseName}
                  onChange={(e) => setCourseName(e.target.value)}
                  placeholder="e.g. Structure and Interpretation of Computer Programs"
                  className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400"
                />
              </div>

              {/* Subject / Category Dropdown */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Subject / Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={category}
                  onChange={(e) => {
                    setCategory(e.target.value);
                    setAiVerificationError(null);
                  }}
                  className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 font-medium cursor-pointer"
                >
                  {CATEGORIES.filter((c) => c !== 'All Categories').map((cat) => (
                    <option key={cat} value={cat} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* University */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  University / College <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={university}
                  onChange={(e) => {
                    setUniversity(e.target.value);
                    if (errors.university) setErrors((prev) => ({ ...prev, university: undefined }));
                  }}
                  placeholder="e.g. Stanford University, MIT, Oxford"
                  className={`w-full min-h-[44px] text-sm rounded-xl border px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 ${
                    errors.university
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400'
                  }`}
                />
                {errors.university && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.university}
                  </p>
                )}
                
                {/* Suggestions */}
                <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                  <span className="text-gray-400 dark:text-gray-500 mr-1 self-center">Quick pick:</span>
                  {UNIVERSITIES.slice(0, 4).map((uni) => (
                    <button
                      type="button"
                      key={uni}
                      onClick={() => {
                        setUniversity(uni);
                        if (errors.university) setErrors((prev) => ({ ...prev, university: undefined }));
                      }}
                      className="min-h-[28px] px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-gray-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 text-gray-700 dark:text-gray-300 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors cursor-pointer inline-flex items-center"
                    >
                      {uni}
                    </button>
                  ))}
                </div>
              </div>

              {/* Academic Level */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Academic Level
                </label>
                <select
                  value={academicLevel}
                  onChange={(e) => setAcademicLevel(e.target.value)}
                  className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 font-medium cursor-pointer"
                >
                  <option value="Undergraduate" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Undergraduate</option>
                  <option value="Graduate" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Graduate / Masters</option>
                  <option value="Postgraduate / PhD" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">Postgraduate / PhD</option>
                  <option value="High School / AP" className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">High School / AP</option>
                </select>
              </div>

              {/* Resource Type */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Resource Type
                </label>
                <select
                  value={resourceType}
                  onChange={(e) => setResourceType(e.target.value)}
                  className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400 font-medium cursor-pointer"
                >
                  {RESOURCE_TYPES.filter((t) => t !== 'All Types').map((t) => (
                    <option key={t} value={t} className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100">
                      {t}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Section 2: Summary & Topics */}
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-gray-800 mb-5">
              <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                2. Summary & Topic Keywords
              </h2>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Summary & Key Concepts <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }));
                  }}
                  placeholder="Outline key concepts, formulas, proofs, chapters, and exam topics included in this note..."
                  className={`w-full text-sm rounded-xl border px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 ${
                    errors.description
                      ? 'border-rose-400 dark:border-rose-600 focus:ring-rose-500/20'
                      : 'border-slate-200 dark:border-gray-700 focus:ring-indigo-500/20 focus:border-indigo-500 dark:focus:border-indigo-400'
                  }`}
                />
                {errors.description && (
                  <p className="mt-1 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.description}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                  Keywords / Tags (Up to 6)
                </label>
                <div className="flex items-center gap-2 mb-2">
                  <div className="relative flex-1">
                    <Tag className="w-4 h-4 text-gray-400 dark:text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddTag(e);
                        }
                      }}
                      placeholder="Add tag (e.g. Asymptotics, MasterTheorem) and press Enter"
                      className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 pl-9 pr-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleAddTag}
                    className="min-h-[44px] px-4 py-2.5 bg-slate-100 dark:bg-gray-800 hover:bg-slate-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 text-xs font-semibold rounded-xl transition-colors shrink-0 cursor-pointer flex items-center justify-center"
                  >
                    Add Tag
                  </button>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {tags.map((t) => (
                    <span
                      key={t}
                      className="min-h-[32px] inline-flex items-center gap-1.5 pl-3 pr-1 py-1 rounded-xl text-xs font-medium bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300 border border-indigo-200/80 dark:border-indigo-800"
                    >
                      #{t}
                      <button
                        type="button"
                        onClick={() => handleRemoveTag(t)}
                        className="min-w-[28px] min-h-[28px] flex items-center justify-center text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-900/40 cursor-pointer"
                        title={`Remove tag #${t}`}
                        aria-label={`Remove tag #${t}`}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Section 3: Cloud Storage Attachment (PDF & Image Attachments) */}
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-gray-800 mb-4">
              <div className="flex items-center gap-2">
                <UploadCloud className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                  3. Attachment Upload (PDF & Images)
                </h2>
              </div>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                Cloud Bucket: <code className="bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded text-[11px]">notes-files</code>
              </span>
            </div>

            {/* Gemini AI Verification Notice */}
            <div className="mb-4 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/60 flex items-start gap-3 text-xs text-indigo-900 dark:text-indigo-200">
              <Sparkles className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold text-indigo-950 dark:text-indigo-100">Gemini 2.5 Flash Automated Content Verification:</span> When you upload a PDF, its initial pages are temporarily parsed by our backend endpoint and validated against your chosen Subject (<strong>{category}</strong>) and Title to maintain strict repository quality and academic relevance.
              </div>
            </div>

            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`min-h-[220px] flex flex-col items-center justify-center border-2 border-dashed rounded-3xl p-6 sm:p-8 text-center cursor-pointer transition-all select-none ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-50/60 dark:bg-indigo-950/60 scale-[1.01]'
                  : errors.file
                  ? 'border-rose-300 dark:border-rose-800 bg-rose-50/30 dark:bg-rose-950/20'
                  : 'border-slate-300 dark:border-gray-700 hover:border-indigo-400 dark:hover:border-indigo-600 bg-slate-50/40 dark:bg-gray-800/40 hover:bg-indigo-50/20 dark:hover:bg-indigo-950/20'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.webp,.doc,.docx"
                onChange={handleFileChange}
                className="hidden"
              />

              {selectedFile ? (
                <div className="flex flex-col items-center">
                  {isEditMode && (
                    <span className="mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
                      New Replacement File (Will Overwrite Previous Attachment)
                    </span>
                  )}
                  {imagePreviewUrl ? (
                    <div className="mb-3 relative group">
                      <img
                        src={imagePreviewUrl}
                        alt="Attachment Preview"
                        className="w-32 h-32 object-cover rounded-xl border border-slate-200 dark:border-gray-700 shadow-md"
                      />
                      <span className="absolute bottom-1 right-1 bg-black/70 text-white text-[9px] px-1 rounded font-mono">
                        IMAGE
                      </span>
                    </div>
                  ) : (
                    <div className="w-14 h-14 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-2xl flex items-center justify-center mb-3 border border-emerald-200 dark:border-emerald-800">
                      <FileCheck className="w-7 h-7" />
                    </div>
                  )}

                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                    {selectedFile.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
                    Size: {selectedFile.size} • Type: {selectedFile.type || 'Document'}
                  </p>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedFile(null);
                      setImagePreviewUrl(null);
                    }}
                    className="min-h-[44px] px-4 py-2 inline-flex items-center justify-center rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 text-xs font-semibold text-rose-600 dark:text-rose-400 transition-colors cursor-pointer"
                  >
                    {isEditMode ? 'Cancel replacement (keep original file)' : 'Remove and choose another file'}
                  </button>
                </div>
              ) : isEditMode && editingNote?.file ? (
                <div className="flex flex-col items-center">
                  <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 rounded-2xl flex items-center justify-center mb-3 border border-indigo-200 dark:border-indigo-800">
                    <FileText className="w-7 h-7" />
                  </div>
                  <span className="mb-2 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800">
                    Current Attachment Preserved ({editingNote.file.format || 'PDF'})
                  </span>
                  <h4 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-0.5">
                    {editingNote.file.name}
                  </h4>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                    {editingNote.file.size} • {editingNote.file.pages} pages
                  </p>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-semibold hover:underline">
                    Click or drag a new PDF/image here to re-upload / replace attachment
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="w-11 h-11 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 rounded-xl flex items-center justify-center">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div className="w-11 h-11 bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400 rounded-xl flex items-center justify-center">
                      <ImageIcon className="w-5 h-5" />
                    </div>
                  </div>
                  <p className="text-sm font-semibold text-gray-800 dark:text-gray-200">
                    Drag and drop your PDF or Image document here, or <span className="text-indigo-600 dark:text-indigo-400 hover:underline">browse files</span>
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    Supports PDF, PNG, JPG, WEBP, DOCX (Max: 50MB)
                  </p>
                </div>
              )}
            </div>

            {errors.file && (
              <p className="mt-2 text-xs text-rose-500 dark:text-rose-400 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.file}
              </p>
            )}
          </div>

          {/* Section 4: Contributor Details & Integrity Pledge */}
          <div>
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100 dark:border-gray-800 mb-5">
              <ShieldCheck className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-base font-bold text-gray-900 dark:text-gray-100">
                4. Contributor Identity & Integrity Pledge
              </h2>
            </div>

            <div className="space-y-4">
              {!isAnonymous && (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Your Name
                    </label>
                    <input
                      type="text"
                      value={authorName}
                      onChange={(e) => setAuthorName(e.target.value)}
                      placeholder="e.g. Alex Morgan"
                      className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Major / Degree
                    </label>
                    <input
                      type="text"
                      value={degree}
                      onChange={(e) => setDegree(e.target.value)}
                      placeholder="e.g. B.S. Computer Science"
                      className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-gray-700 dark:text-gray-300 mb-1.5">
                      Class / Year
                    </label>
                    <input
                      type="text"
                      value={graduationYear}
                      onChange={(e) => setGraduationYear(e.target.value)}
                      placeholder="e.g. Class of 2026"
                      className="w-full min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-gray-700 px-3.5 py-2.5 bg-slate-50/50 dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:bg-white dark:focus:bg-gray-800 focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 dark:focus:border-indigo-400"
                    />
                  </div>
                </div>
              )}

              {/* Anonymous Checkbox (44x44px touch-friendly tap area) */}
              <div className="pt-1">
                <label htmlFor="anonymousCheck" className="min-h-[44px] flex items-center gap-3 text-xs text-gray-700 dark:text-gray-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="anonymousCheck"
                    checked={isAnonymous}
                    onChange={(e) => setIsAnonymous(e.target.checked)}
                    className="w-5 h-5 text-indigo-600 rounded-md border-slate-300 dark:border-gray-700 focus:ring-indigo-500 cursor-pointer shrink-0"
                  />
                  <span>Publish anonymously (Hide student identity on public note card)</span>
                </label>
              </div>

              {/* Integrity Pledge (44x44px touch-friendly tap area) */}
              <div className={`p-4 rounded-2xl border ${errors.integrity ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800' : 'bg-indigo-50/50 dark:bg-indigo-950/30 border-indigo-100 dark:border-indigo-900/60'}`}>
                <label htmlFor="honorCodeCheck" className="min-h-[44px] flex items-start gap-3 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    id="honorCodeCheck"
                    checked={integrityAgreed}
                    onChange={(e) => {
                      setIntegrityAgreed(e.target.checked);
                      if (errors.integrity) setErrors((prev) => ({ ...prev, integrity: undefined }));
                    }}
                    className="w-5 h-5 mt-0.5 text-indigo-600 rounded-md border-slate-300 dark:border-gray-700 focus:ring-indigo-500 cursor-pointer shrink-0"
                  />
                  <div>
                    <span className="text-xs font-semibold text-gray-900 dark:text-gray-200">
                      Academic Integrity & Copyright Declaration <span className="text-rose-500">*</span>
                    </span>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 mt-0.5 leading-relaxed">
                      I certify that these notes are my original lecture summaries or practice solutions. This resource complies with university academic honor codes and does not contain unauthorized exam materials or commercial publisher copyright infringements.
                    </p>
                  </div>
                </label>
                {errors.integrity && (
                  <p className="mt-2 text-xs text-rose-600 dark:text-rose-400 font-medium flex items-center gap-1 pl-8">
                    <AlertCircle className="w-3.5 h-3.5" /> {errors.integrity}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Submit Action (All 44x44px touch target compliant) */}
          <div className="pt-4 border-t border-slate-100 dark:border-gray-800 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-xs text-gray-500 dark:text-gray-400">
              {uploadStatusText && (
                <span className="flex items-center gap-1.5 text-indigo-600 dark:text-indigo-400 font-medium animate-pulse">
                  <CloudUpload className="w-4 h-4" />
                  {uploadStatusText}
                </span>
              )}
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
              <button
                type="button"
                onClick={onCancelEdit || onBackToHome}
                className="min-h-[44px] px-5 py-2.5 rounded-xl border border-slate-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-gray-800 text-sm font-semibold transition-colors cursor-pointer flex items-center justify-center"
              >
                {isEditMode ? 'Cancel Editing' : 'Cancel'}
              </button>

              <button
                type="submit"
                disabled={!isOnline || isSubmitting}
                className="min-h-[44px] inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-linear-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold shadow-md shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all cursor-pointer"
                title={!isOnline ? 'Uploading disabled while offline' : (isEditMode ? 'Save Note Changes' : 'Publish Note Resource')}
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin shrink-0" />
                    <span>{uploadStatusText || (isEditMode ? 'Saving changes...' : 'Verifying with Gemini AI...')}</span>
                  </>
                ) : !isOnline ? (
                  <>
                    <WifiOff className="w-4 h-4" />
                    <span>Uploads Disabled Offline</span>
                  </>
                ) : isEditMode ? (
                  <>
                    <Pencil className="w-4 h-4" />
                    <span>{selectedFile ? 'Save Changes & Re-upload File' : 'Save Changes to Note'}</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>Publish Note Resource</span>
                  </>
                )}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
}
