import { extractPdfText, verifyNoteWithGemini } from './verifyNoteHandler.js';

/**
 * Connect/Express middleware for the /api/verify-note endpoint
 * Handles multi-page text extraction, scanned PDF fallback, and Gemini AI validation.
 */
export function verifyNoteMiddleware(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-gemini-api-key');

  if (req.method === 'OPTIONS') {
    res.statusCode = 204;
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.statusCode = 405;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Method not allowed. Use POST.' }));
    return;
  }

  const processPayload = async (body) => {
    try {
      const { title, subject, courseCode, pdfBase64, pdfText, fileName } = body;

      if (!title || !subject) {
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({
            isValid: false,
            reason: 'Missing required parameters: title and subject are required.',
          })
        );
        return;
      }

      // Step 1: Multi-page text extraction and scanned document detection
      let extractedText = pdfText || '';
      let pageCount = 1;
      let isScannedOrImage = false;

      if (pdfBase64) {
        try {
          const pdfBuffer = Buffer.from(pdfBase64, 'base64');
          const extraction = await extractPdfText(pdfBuffer, 10);
          if (extraction && typeof extraction === 'object') {
            extractedText = extractedText || extraction.text || '';
            pageCount = extraction.pageCount || 1;
            isScannedOrImage = Boolean(extraction.isScannedOrImage);
          } else if (typeof extraction === 'string') {
            extractedText = extractedText || extraction;
          }
        } catch (extractErr) {
          console.warn('PDF extraction caught error, treating as scanned document:', extractErr.message);
          isScannedOrImage = true;
        }
      }

      // Check if file extension is an image
      if (fileName && /\.(png|jpe?g|webp|gif|bmp|tiff)$/i.test(fileName)) {
        isScannedOrImage = true;
      }

      // Step 2: Send extracted text with title & subject to Gemini API / Heuristic engine
      const clientApiKey = (req.headers && req.headers['x-gemini-api-key']) || body.apiKey;
      const verificationResult = await verifyNoteWithGemini({
        pdfText: extractedText,
        title,
        subject,
        courseCode,
        isScannedOrImage,
        pageCount,
        fileName,
        apiKey: clientApiKey,
      });

      // Step 3: Return JSON response with { "isValid": true/false, "reason": "...", "pageCount", "warning" }
      res.statusCode = verificationResult.isValid ? 200 : 422;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          ...verificationResult,
          pageCount,
          isScanned: Boolean(verificationResult.isScanned || isScannedOrImage),
          warning: verificationResult.warning || null,
        })
      );
    } catch (err) {
      console.error('Error in /api/verify-note middleware:', err);
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          isValid: false,
          reason: `Verification server error: ${err.message}`,
        })
      );
    }
  };

  // If req.body is already parsed (e.g. Vercel Serverless Function or Express with body parser)
  if (req.body && typeof req.body === 'object') {
    return processPayload(req.body);
  } else if (typeof req.body === 'string' && req.body.trim()) {
    try {
      return processPayload(JSON.parse(req.body));
    } catch {
      return processPayload({});
    }
  }

  // Otherwise buffer incoming stream (Connect/Vite middleware and native Node http)
  const chunks = [];
  req.on('data', (chunk) => chunks.push(chunk));
  req.on('end', async () => {
    try {
      const rawBody = Buffer.concat(chunks).toString('utf-8');
      const body = JSON.parse(rawBody || '{}');
      await processPayload(body);
    } catch (err) {
      console.error('Body parsing error in verifyNoteMiddleware:', err);
      res.statusCode = 400;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ isValid: false, reason: 'Invalid JSON request payload.' }));
    }
  });
}
