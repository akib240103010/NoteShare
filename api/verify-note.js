import { verifyNoteMiddleware } from '../src/api/verifyNoteMiddleware.js';

/**
 * Vercel Serverless Function for NoteShare's AI note verification endpoint (/api/verify-note).
 * Automatically invoked by Vercel on POST /api/verify-note requests.
 */
export default async function handler(req, res) {
  return verifyNoteMiddleware(req, res);
}
