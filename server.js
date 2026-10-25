require('dotenv').config();
const express = require('express');
const { GoogleGenAI } = require("@google/genai");

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY
});
const path = require('path');
const multer = require('multer');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const OpenAI = require('openai');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf', 'text/plain', 'text/markdown']);
const openai = process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY !== 'put_your_api_key_here'
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY }) : null;

app.disable('x-powered-by');
app.use(helmet({ contentSecurityPolicy: { directives: { defaultSrc: ["'self'"], styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'], fontSrc: ["'self'", 'https://fonts.gstatic.com'], imgSrc: ["'self'", 'data:'], scriptSrc: ["'self'"], connectSrc: ["'self'"] } } }));
app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/', rateLimit({ windowMs: 60 * 1000, limit: 20, standardHeaders: 'draft-7', legacyHeaders: false }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: MAX_FILE_SIZE, files: 1 }, fileFilter: (_req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const ok = ['.png','.jpg','.jpeg','.webp','.gif','.pdf','.txt','.md','.markdown'].includes(ext);
  cb(ok ? null : new Error('Unsupported file type. Use an image, PDF, TXT, or Markdown file.'), ok);
} });

app.get('/api/health', (_req, res) => res.json({ ok: true, configured: Boolean(openai), model: process.env.OPENAI_MODEL || 'gpt-4.1-mini' }));

function makeSystemPrompt(mode) {
  const base = 'You are MindNest AI, a friendly, accurate, patient study companion. Explain clearly, organize answers with headings and bullets when helpful, and adapt to a college student. If you are unsure, say so. Never pretend to have read material that was not provided.';
  if (mode === 'notes') return base + ' Create useful college study notes from the supplied topic or material. Include: title, learning objectives, key concepts, detailed notes, definitions, examples, quick revision summary, and 5 practice questions with answers. Preserve important facts and explain difficult ideas in simple language. Use Markdown.';
  if (mode === 'explain') return base + ' Teach the idea step by step. Start with a simple explanation, then a deeper explanation, a worked example, common mistakes, and a short recap.';
  if (mode === 'quiz') return base + ' Create a practice quiz based on the user prompt and any supplied material. Include a mix of multiple-choice and short-answer questions, then provide an answer key with brief explanations. Do not invent facts from a supplied document.';
  return base + ' Answer the user directly. For academic topics, show reasoning and examples at an appropriate level.';
}


function detectMimeFromBuffer(buffer) {
  if (!buffer || buffer.length < 4) return null;
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) return 'image/jpeg';
  if (buffer[0] === 0x89 && buffer.toString('ascii', 1, 4) === 'PNG') return 'image/png';
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp';
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif';
  if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'application/pdf';
  return null;
}

function extractDataUrlMime(dataUrl) {
  const m = /^data:(image\/(?:jpeg|png|webp|gif));base64,/.exec(dataUrl);
  return m ? m[1] : null;
}

app.post('/api/chat', upload.single('file'), async (req, res) => {
  try {
    if (!openai) return res.status(503).json({ error: 'The app is not connected to OpenAI yet. Add your OPENAI_API_KEY in the .env file (local) or hosting environment settings.' });
    const message = String(req.body.message || '').trim();
    const mode = ['chat','notes','explain','quiz'].includes(req.body.mode) ? req.body.mode : 'chat';
    if (!message && !req.file) return res.status(400).json({ error: 'Type a question or attach a file first.' });

    const content = [];
    let fileSummary = '';
    if (req.file) {
      const ext = path.extname(req.file.originalname).toLowerCase();
      const detectedMime = detectMimeFromBuffer(req.file.buffer);
      if (['.png','.jpg','.jpeg','.webp','.gif'].includes(ext)) {
        const mime = detectedMime || ({'.jpg':'image/jpeg','.jpeg':'image/jpeg','.png':'image/png','.webp':'image/webp','.gif':'image/gif'})[ext];
        if (!['image/jpeg','image/png','image/webp','image/gif'].includes(mime)) return res.status(400).json({ error: 'That image format is not supported. Please use PNG, JPG, WEBP, or GIF.' });
        content.push({ type: 'image_url', image_url: { url: `data:${mime};base64,${req.file.buffer.toString('base64')}`, detail: 'auto' } });
        fileSummary = `Image attached: ${req.file.originalname}`;
      } else if (ext === '.pdf') {
        const parsed = await pdfParse(req.file.buffer);
        const text = (parsed.text || '').trim();
        if (!text) return res.status(400).json({ error: 'I could not extract selectable text from this PDF. If it is a scanned PDF, upload page screenshots/images instead.' });
        fileSummary = `Attached PDF: ${req.file.originalname}\n\nExtracted document text (may be truncated):\n${text.slice(0, 45000)}`;
      } else {
        fileSummary = `Attached text file: ${req.file.originalname}\n\n${req.file.buffer.toString('utf8').slice(0, 45000)}`;
      }
    }
    const userText = [message, fileSummary].filter(Boolean).join('\n\n');
    content.unshift({ type: 'text', text: userText || 'Please describe this image.' });
    const response = await openai.chat.completions.create({
      model: process.env.OPENAI_MODEL || 'gpt-4.1-mini',
      messages: [ { role: 'system', content: makeSystemPrompt(mode) }, { role: 'user', content } ],
      temperature: 0.5,
      max_tokens: mode === 'notes' ? 3500 : 2200
    });
    const answer = response.choices?.[0]?.message?.content?.trim();
    if (!answer) return res.status(502).json({ error: 'The AI returned an empty response. Please try again.' });
    res.json({ answer, model: response.model, fileName: req.file?.originalname || null });
  } catch (err) {
    console.error('Chat request failed:', err?.message || err);
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') return res.status(413).json({ error: 'That file is too large. Maximum file size is 10 MB.' });
    if (err.message?.startsWith('Unsupported file type')) return res.status(400).json({ error: err.message });
    if (err.status === 401) return res.status(503).json({ error: 'OpenAI rejected the API key. Check the key in your .env or hosting settings.' });
    if (err.status === 429) return res.status(429).json({ error: 'The API is busy or its usage limit has been reached. Check your OpenAI API billing/limits and try again.' });
    res.status(500).json({ error: 'Something went wrong while processing this request. Please try again.' });
  }
});

app.use((err, _req, res, _next) => {
  console.error('Request error:', err.message);
  res.status(400).json({ error: err.message || 'Invalid request.' });
});

app.listen(PORT, '0.0.0.0', () => console.log(`MindNest AI running on port ${PORT}`));
