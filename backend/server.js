const express = require('express');
const cors = require('cors');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const dotenv = require('dotenv');
const OpenAI = require('openai');
const path = require('path');

dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const port = process.env.PORT || 5000;
const groqApiKey = (process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '').trim().replace(/^['"]|['"]$/g, '');

const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_request, file, callback) => {
    const isPdf = file.mimetype === 'application/pdf' || file.originalname.endsWith('.pdf');
    callback(isPdf ? null : new Error('Only PDF files are allowed.'), isPdf);
  },
  limits: { fileSize: 5 * 1024 * 1024 },
});

app.use(cors());
app.use(express.json());

app.get('/api/health', (_request, response) => {
  response.json({ status: 'ok' });
});

app.post('/api/analyze-resume', upload.single('resume'), async (request, response) => {
  try {
    if (!request.file) {
      return response.status(400).json({ message: 'Resume PDF is required.' });
    }

    if (!groqApiKey) {
      return response.status(500).json({
        message: 'GROQ_API_KEY is missing or invalid in backend/.env. Add GROQ_API_KEY=your_key and restart backend.',
      });
    }

    const groq = new OpenAI({
      apiKey: groqApiKey,
      baseURL: 'https://api.groq.com/openai/v1',
    });

    const { text } = await pdfParse(request.file.buffer);
    const role = request.body.role || 'General';

    const prompt = `
You are an ATS resume reviewer.
Analyze the resume for the target role: ${role}

Return only valid JSON with this exact shape:
{
  "score": number (0-100),
  "issues": string[],
  "suggestions": string[],
  "presentKeywords": string[],
  "missingKeywords": string[]
}

Rules:
- Identify major ATS weaknesses (formatting, quantification, skills mismatch).
- Suggestions must be practical and clearly tied to issues.
- Include only keywords relevant to the selected role.
- Keep each bullet concise (under 18 words).

Resume content:
${text.slice(0, 12000)}
`;

    const completion = await groq.chat.completions.create({
      model: 'llama-3.1-8b-instant',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.2,
    });

    const rawContent = completion.choices[0]?.message?.content || '{}';
    let parsed;
    try {
      parsed = JSON.parse(rawContent);
    } catch (_parseError) {
      return response.status(502).json({
        message: 'Model returned non-JSON output. Please try again.',
        rawPreview: String(rawContent).slice(0, 180),
      });
    }

    const safeResponse = {
      score: Number.isFinite(parsed.score) ? Math.max(0, Math.min(100, parsed.score)) : 0,
      issues: Array.isArray(parsed.issues) ? parsed.issues : [],
      suggestions: Array.isArray(parsed.suggestions) ? parsed.suggestions : [],
      presentKeywords: Array.isArray(parsed.presentKeywords) ? parsed.presentKeywords : [],
      missingKeywords: Array.isArray(parsed.missingKeywords) ? parsed.missingKeywords : [],
    };

    return response.json(safeResponse);
  } catch (error) {
    console.error('Resume analysis failed:', error);
    const apiMessage = error?.error?.message || error?.message || 'Unable to analyze resume right now.';
    return response.status(500).json({ message: apiMessage });
  }
});

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`);
});
