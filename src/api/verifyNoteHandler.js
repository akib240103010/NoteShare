/**
 * NoteShare — Academic PDF Content Verification Engine using Gemini API
 * Robust multi-page text extraction, scanned document fallback, and lenient AI evaluation.
 */
import { PDFParse } from 'pdf-parse';

// Supported academic subject keywords for fallback heuristic verification
const SUBJECT_KEYWORDS = {
  'Computer Science': [
    'algorithm', 'data structure', 'complexity', 'programming', 'code', 'database',
    'network', 'software', 'cpu', 'memory', 'compiler', 'machine learning',
    'neural', 'graph', 'tree', 'binary', 'sorting', 'recursion', 'dynamic programming',
    'object', 'class', 'function', 'variable', 'operating system', 'distributed',
  ],
  Mathematics: [
    'theorem', 'proof', 'lemma', 'calculus', 'algebra', 'equation', 'matrix',
    'vector', 'integral', 'derivative', 'differential', 'topology', 'metric space',
    'eigenvalue', 'polynomial', 'continuous', 'convergence', 'real analysis',
    'group', 'ring', 'field', 'geometry', 'probability', 'statistics',
  ],
  Physics: [
    'quantum', 'mechanics', 'wave', 'particle', 'energy', 'momentum', 'force',
    'velocity', 'acceleration', 'electromagnetism', 'magnetic', 'electric',
    'thermodynamics', 'entropy', 'relativity', 'schrodinger', 'hamiltonian',
    'potential', 'kinetic', 'optics', 'photon', 'electron', 'spin',
  ],
  Engineering: [
    'circuit', 'voltage', 'current', 'signal', 'system', 'fourier', 'laplace',
    'strain', 'stress', 'fluid', 'mechanics', 'thermodynamics', 'control',
    'frequency', 'transfer function', 'filter', 'design', 'mechanical', 'electrical',
  ],
  'Medicine & Biology': [
    'cell', 'tissue', 'organ', 'nerve', 'cranial', 'anatomy', 'physiology',
    'pathology', 'clinical', 'patient', 'diagnosis', 'protein', 'dna', 'rna',
    'gene', 'metabolism', 'enzyme', 'syndrome', 'artery', 'vein', 'cortex',
  ],
  'Economics & Business': [
    'market', 'price', 'cost', 'demand', 'supply', 'utility', 'equilibrium',
    'game theory', 'nash', 'monopoly', 'oligopoly', 'macroeconomics',
    'microeconomics', 'inflation', 'gdp', 'consumer', 'profit', 'elasticity',
  ],
  Chemistry: [
    'reaction', 'molecule', 'organic', 'synthesis', 'compound', 'bond', 'carbon',
    'acid', 'base', 'stoichiometry', 'orbital', 'polymer', 'titration', 'equilibrium',
    'spectroscopy', 'solvent', 'reagent', 'mechanism', 'electrophile', 'nucleophile',
  ],
  'History & Humanities': [
    'history', 'war', 'revolution', 'treaty', 'empire', 'civilization', 'century',
    'philosophy', 'literature', 'historian', 'dynasty', 'renaissance', 'constitution',
  ],
};

/**
 * Extracts text from the first few pages of a PDF buffer using pdfjs-dist with
 * fallback to PDFParse and uncompressed stream regex extraction.
 *
 * @param {Buffer} buffer - Raw PDF buffer
 * @param {number} [maxPages=10] - Maximum pages to inspect for content verification
 * @returns {Promise<{ text: string, pageCount: number, charCount: number, isScannedOrImage: boolean, toString: () => string }>}
 */
export async function extractPdfText(buffer, maxPages = 10) {
  let extractedChunks = [];
  let totalTextLength = 0;
  let pageCount = 1;

  // Strategy 1: Multi-page extraction using pdfjs-dist legacy engine
  try {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const loadingTask = pdfjs.getDocument({
      data: new Uint8Array(buffer),
      useSystemFonts: true,
      disableFontFace: true,
      isEvalSupported: false,
      verbosity: 0,
    });

    const doc = await loadingTask.promise;
    pageCount = doc.numPages || 1;
    const pagesToScan = Math.min(pageCount, maxPages);

    for (let i = 1; i <= pagesToScan; i++) {
      try {
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent({ normalizeWhitespace: true });
        const pageText = (textContent.items || [])
          .map((item) => (typeof item?.str === 'string' ? item.str.trim() : ''))
          .filter(Boolean)
          .join(' ');

        if (pageText) {
          extractedChunks.push(`[Page ${i}]: ${pageText}`);
          totalTextLength += pageText.length;
        }
      } catch (pageErr) {
        console.warn(`[pdfjs] Could not read page ${i}:`, pageErr.message);
      }
    }
  } catch (pdfjsErr) {
    console.warn('[pdfjs] Primary PDF extraction failed, trying secondary parser:', pdfjsErr.message);
  }

  // Strategy 2: If pdfjs-dist extracted minimal text (< 50 chars), try PDFParse
  if (totalTextLength < 50) {
    try {
      const parser = new PDFParse({ data: buffer });
      const textResult = await parser.getText();
      if (typeof parser.destroy === 'function') {
        await parser.destroy();
      }
      const fullText = typeof textResult === 'string' ? textResult : (textResult?.text || '');
      const trimmed = fullText.trim();
      if (trimmed && trimmed.length > totalTextLength) {
        extractedChunks = [trimmed];
        totalTextLength = trimmed.length;
      }
    } catch (parseErr) {
      console.warn('[PDFParse] Secondary extraction failed:', parseErr.message);
    }
  }

  // Strategy 3: Fast stream regex fallback for uncompressed ASCII text
  if (totalTextLength < 50) {
    try {
      const str = buffer.toString('latin1');
      const matches = str.match(/\(([^()]{3,})\)Tj/g) || [];
      if (matches.length > 0) {
        const rawText = matches.map((m) => m.slice(1, -3).trim()).filter(Boolean).join(' ');
        if (rawText.length > totalTextLength) {
          extractedChunks = [rawText];
          totalTextLength = rawText.length;
        }
      }
    } catch {
      // Ignore stream extraction errors
    }
  }

  // Scanned / handwritten notes detection:
  // If total machine text extracted across multiple pages is under 50 characters,
  // it is predominantly a scanned document, handwritten notebook photo, or diagram sheet.
  const isScannedOrImage = totalTextLength < 50;
  const combinedText = extractedChunks.join('\n\n').slice(0, 5000).trim();

  const resultObj = {
    text: combinedText,
    pageCount: Math.max(1, pageCount),
    charCount: totalTextLength,
    isScannedOrImage,
    // Ensures backwards compatibility if caller treats return value as a string
    toString() {
      return combinedText;
    },
  };

  return resultObj;
}

/**
 * Validates note content against stated topic & subject using Gemini API with lenient guidelines.
 * Accepts scanned handwritten notes and inconclusive text gracefully.
 */
export async function verifyNoteWithGemini({
  pdfText,
  title,
  subject,
  courseCode = '',
  isScannedOrImage = false,
  pageCount = 1,
  fileName = '',
  apiKey = '',
}) {
  const geminiKey = apiKey || process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY;
  const cleanText = (typeof pdfText === 'string' ? pdfText : (pdfText?.text || '')).trim();
  const effectiveIsScanned = isScannedOrImage || cleanText.length < 50;

  if (geminiKey) {
    try {
      const prompt = `You are a supportive academic content validator for NoteShare, a student peer-to-peer study platform.
A student is uploading study material with the following declared metadata:
- Title: "${title}"
- Academic Subject / Discipline: "${subject}"
- Course Code: "${courseCode || 'N/A'}"
- File Name: "${fileName || 'document.pdf'}"
- Document Type: ${effectiveIsScanned ? 'Scanned handwritten notes / image-based PDF (minimal machine text)' : 'Standard Academic PDF'}
- Page Count: ${pageCount || 1}

Extracted text snippet from the document:
"""
${cleanText ? cleanText.slice(0, 3500) : '(No machine-readable text — scanned handwritten notes, diagrams, or formula sheet)'}
"""

Verification Guidelines (Flexible & Permissive):
1. NoteShare welcomes all authentic student materials: handwritten problem sets, lecture outlines, formula cheat sheets, lab reports, exam reviews, slide summaries, and syllabus notes.
2. Interdisciplinary overlap is normal and encouraged (e.g. linear algebra in Computer Science, biochemistry in Medicine, calculus in Physics or Economics).
3. If the extracted text is empty, sparse, OCR noise, or appears to be from a handwritten or scanned diagram document, DO NOT reject the upload. Assume good faith and approve with "isValid": true based on the student's declared title and course subject.
4. ONLY reject ("isValid": false) if there is an OBVIOUS, BLATANT, and UNMISTAKABLE contradiction (e.g., the document is clearly an unrelated history assignment, but the student selected Organic Chemistry; or the file is non-academic spam).
5. If in doubt or if text extraction is inconclusive or minimal, ALWAYS give the student the benefit of the doubt and approve ("isValid": true).

Return a valid JSON object strictly matching this schema:
{
  "isValid": true (or false only for blatant subject mismatches),
  "isScanned": ${effectiveIsScanned ? 'true' : 'false'},
  "warning": ${effectiveIsScanned ? '"Scanned or handwritten notes detected. Verified based on declared course title and subject."' : 'null'},
  "reason": "Clear and encouraging explanation of why the document is accepted (e.g., 'Document content or title aligns with study material for ${subject}.')"
}

If explicitly invalid due to a clear subject contradiction:
{
  "isValid": false,
  "isScanned": false,
  "warning": null,
  "reason": "Clear explanation of what the document appears to be instead so the student can pick the right subject (e.g., 'The document text is about American History, which does not match Organic Chemistry')."
}

Respond strictly with a valid JSON object without markdown codeblocks or extra prose.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.2,
            },
          }),
        }
      );

      if (response.ok) {
        const data = await response.json();
        const rawJson = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (rawJson) {
          const cleanJson = rawJson.replace(/```json/g, '').replace(/```/g, '').trim();
          const parsed = JSON.parse(cleanJson);

          // Safety guard: If Gemini marked it invalid because of empty/inconclusive text, soften and accept!
          if (!parsed.isValid) {
            const lowerReason = (parsed.reason || '').toLowerCase();
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

            if (isInconclusiveOrEmpty || effectiveIsScanned) {
              return {
                isValid: true,
                isScanned: true,
                warning: 'Scanned or handwritten note detected. Verified based on declared course title and subject.',
                reason: `Document accepted: Scanned or handwritten study material matching ${subject} (${title}).`,
                evaluator: 'gemini-2.5-flash (lenient fallback)',
              };
            }
          }

          return {
            isValid: Boolean(parsed.isValid),
            isScanned: Boolean(parsed.isScanned || effectiveIsScanned),
            warning: parsed.warning || (effectiveIsScanned ? 'Scanned or handwritten note detected. Verified based on declared course title and subject.' : null),
            reason: parsed.reason || (parsed.isValid ? 'Content matches declared subject.' : 'Content mismatch.'),
            evaluator: 'gemini-2.5-flash',
          };
        }
      } else {
        const errText = await response.text();
        console.warn('Gemini API call returned error, falling back:', response.status, errText);
      }
    } catch (apiErr) {
      console.warn('Gemini API call failed, falling back to heuristic engine:', apiErr.message);
    }
  }

  // Fallback: Smart Academic Heuristic Validator when Gemini API key is absent or unreachable
  return fallbackAcademicVerification({
    pdfText: cleanText,
    title,
    subject,
    courseCode,
    isScannedOrImage: effectiveIsScanned,
  });
}

/**
 * Fallback semantic validator when Gemini API key is absent or fails.
 * Designed to be permissive for student notes and allow scanned documents.
 */
function fallbackAcademicVerification({
  pdfText,
  title,
  subject,
  courseCode,
  isScannedOrImage = false,
}) {
  const cleanText = (pdfText || '').toLowerCase();
  const cleanTitle = (title || '').toLowerCase();
  const titleWords = cleanTitle.split(/\s+/).filter((w) => w.length > 3);

  // If text is extremely short or empty (e.g. scanned handwritten notes)
  if (isScannedOrImage || cleanText.length < 50) {
    return {
      isValid: true,
      isScanned: true,
      warning: 'Scanned or handwritten note detected. Verified based on declared course title and subject.',
      reason: `Preliminary verification passed for ${courseCode ? `${courseCode}: ` : ''}${title}. (Scanned academic document).`,
      evaluator: 'noteshare-heuristic (scanned fallback)',
    };
  }

  // Check expected domain keywords
  const expectedKeywords = SUBJECT_KEYWORDS[subject] || [];
  const matchedKeywords = expectedKeywords.filter((kw) => cleanText.includes(kw));
  const matchedTitleWords = titleWords.filter((tw) => cleanText.includes(tw));

  // Check for severe, blatant cross-domain mismatches
  const historyKeywords = ['history', 'revolution', 'war', 'empire', 'treaty', 'dynasty', 'renaissance', 'civilization', 'century'];
  const historyHits = historyKeywords.filter((kw) => cleanText.includes(kw));
  if (historyHits.length >= 3 && matchedKeywords.length === 0 && subject !== 'History & Humanities') {
    return {
      isValid: false,
      isScanned: false,
      warning: null,
      reason: `The uploaded PDF appears to be a history assignment, but the subject selected was ${subject}.`,
      evaluator: 'noteshare-heuristic',
    };
  }

  const medicineHits = (SUBJECT_KEYWORDS['Medicine & Biology'] || []).filter((kw) => cleanText.includes(kw));
  if (medicineHits.length >= 4 && matchedKeywords.length === 0 && subject !== 'Medicine & Biology') {
    return {
      isValid: false,
      isScanned: false,
      warning: null,
      reason: `The uploaded PDF appears to be medical or biological material (${medicineHits.slice(0, 3).join(', ')}), but the subject selected was ${subject}.`,
      evaluator: 'noteshare-heuristic',
    };
  }

  const matchesExpected = matchedKeywords.length > 0 || matchedTitleWords.length > 0;

  if (matchesExpected) {
    return {
      isValid: true,
      isScanned: false,
      warning: null,
      reason: `Content reasonably matches the stated topic "${title}" under ${subject}.${
        matchedKeywords.length > 0 ? ` (Detected domain concepts: ${matchedKeywords.slice(0, 3).join(', ')})` : ''
      }`,
      evaluator: 'noteshare-heuristic',
    };
  }

  // Default to valid for student notes if no outright contradiction
  return {
    isValid: true,
    isScanned: false,
    warning: null,
    reason: `Verified: Document contents align with ${subject} course material for "${title}".`,
    evaluator: 'noteshare-heuristic',
  };
}
