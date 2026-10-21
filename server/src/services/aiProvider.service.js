/**
 * Modular AI provider service for ATS semantic scoring.
 *
 * Currently supports Google Gemini (via @google/generative-ai).
 * Provides a deterministic fallback when the AI provider is unavailable or unconfigured.
 *
 * Required environment variable (when using Gemini):
 *   GEMINI_API_KEY   - Google AI Studio API key
 *
 * Optional:
 *   AI_MODEL_NAME    - Gemini model to use (default: gemini-1.5-flash)
 *   AI_TIMEOUT_MS    - Request timeout in milliseconds (default: 30000)
 */

const AI_TIMEOUT_MS = parseInt(process.env.AI_TIMEOUT_MS || '30000', 10);
const GEMINI_MODEL = process.env.AI_MODEL_NAME || 'gemini-1.5-flash';

let _geminiClient = null;
let _geminiModel = null;

/**
 * Returns true if the AI provider is configured and available.
 */
export function isAIAvailable() {
  return Boolean(process.env.GEMINI_API_KEY);
}

/**
 * Lazily initialise the Gemini client.
 * Returns null if not configured.
 */
async function getGeminiModel() {
  if (!isAIAvailable()) return null;
  if (_geminiModel) return _geminiModel;

  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  _geminiClient = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
  _geminiModel = _geminiClient.getGenerativeModel({
    model: GEMINI_MODEL,
    generationConfig: {
      responseMimeType: 'application/json',
      temperature: 0.1,   // Low temperature for reproducible structured output
      maxOutputTokens: 1024,
    },
  });
  return _geminiModel;
}

/**
 * Validate and clamp an AI-returned numeric score to [0, 100].
 *
 * @param {any} val
 * @param {number} fallback
 * @returns {number}
 */
function clampScore(val, fallback = 0) {
  const n = Number(val);
  if (!Number.isFinite(n)) return fallback;
  return Math.round(Math.min(100, Math.max(0, n)));
}

/**
 * Validate JSON returned by the AI model.
 * Throws if required fields are missing or mal-formed.
 *
 * @param {any} parsed
 * @returns {Object}
 */
function validateAIResponse(parsed) {
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('AI returned non-object response.');
  }

  const requiredKeys = ['projectScore', 'projectEvidence', 'projectNote'];
  for (const key of requiredKeys) {
    if (!(key in parsed)) {
      throw new Error(`AI response missing required field: ${key}`);
    }
  }

  return {
    projectScore: clampScore(parsed.projectScore),
    projectEvidence: Array.isArray(parsed.projectEvidence)
      ? parsed.projectEvidence.map(String).slice(0, 5)
      : [],
    projectNote: String(parsed.projectNote || '').slice(0, 500),
    keywordScore: clampScore(parsed.keywordScore, 0),
    keywordEvidence: Array.isArray(parsed.keywordEvidence)
      ? parsed.keywordEvidence.map(String).slice(0, 5)
      : [],
    explanation: String(parsed.explanation || '').slice(0, 800),
  };
}

/**
 * Run AI-assisted semantic scoring for project relevance and JD keyword alignment.
 *
 * @param {Object} params
 * @param {string}   params.resumeText          - Extracted resume plain text
 * @param {string}   params.projectRequirements - Recruiter-defined project requirements
 * @param {string[]} params.keywords            - JD alignment keywords
 * @param {string}   params.jobTitle            - Job title (context)
 * @param {string}   params.jobDescription      - Job description (context)
 *
 * @returns {Promise<{
 *   success: boolean,
 *   aiAssisted: boolean,
 *   projectScore: number,
 *   projectEvidence: string[],
 *   projectNote: string,
 *   keywordScore: number,
 *   keywordEvidence: string[],
 *   explanation: string,
 *   error?: string
 * }>}
 */
export async function scoreWithAI({
  resumeText,
  projectRequirements,
  keywords,
  jobTitle,
  jobDescription,
}) {
  const model = await getGeminiModel();

  if (!model) {
    return {
      success: false,
      aiAssisted: false,
      projectScore: 0,
      projectEvidence: [],
      projectNote: 'AI provider not configured. Project scoring skipped.',
      keywordScore: 0,
      keywordEvidence: [],
      explanation: '',
      error: 'AI provider not configured.',
    };
  }

  // Truncate resume to stay within token limits
  const resumeExcerpt = resumeText.slice(0, 6000);

  const prompt = `You are an objective ATS (Applicant Tracking System) evaluator. Analyze the RESUME TEXT against the JOB REQUIREMENTS and respond ONLY with valid JSON matching the schema below.

IMPORTANT FAIRNESS RULES:
- Do NOT score based on candidate name, gender, age, ethnicity, religion, or photo.
- Do NOT invent qualifications. If information is not present, mark score lower and say "not mentioned".
- Do NOT infer character, personality, or intelligence from resume style.
- Score only documented skills, experience, and projects.

JOB TITLE: ${jobTitle || 'Not specified'}
JOB DESCRIPTION (excerpt): ${(jobDescription || '').slice(0, 1000)}
PROJECT REQUIREMENTS: ${projectRequirements || 'Not specified'}
KEYWORDS TO MATCH: ${(keywords || []).join(', ') || 'None'}

RESUME TEXT (excerpt):
${resumeExcerpt}

Respond ONLY with this JSON (no markdown, no extra text):
{
  "projectScore": <integer 0-100, how well the candidate's documented projects match the project requirements>,
  "projectEvidence": [<up to 3 short verbatim resume excerpts that support the project score>],
  "projectNote": "<one-sentence explanation of the project score>",
  "keywordScore": <integer 0-100, what fraction of the listed keywords appear in the resume>,
  "keywordEvidence": [<up to 3 verbatim resume excerpts showing keyword matches>],
  "explanation": "<2-3 sentence overall ATS match explanation. Mention this is AI-assisted.>"
}`;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), AI_TIMEOUT_MS);

    let rawText;
    try {
      const result = await model.generateContent(prompt);
      rawText = result.response.text();
    } finally {
      clearTimeout(timer);
    }

    // Strip any accidental markdown fences
    const jsonText = rawText.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/i, '').trim();
    const parsed = JSON.parse(jsonText);
    const validated = validateAIResponse(parsed);

    return {
      success: true,
      aiAssisted: true,
      ...validated,
    };
  } catch (err) {
    const isAbort = err.name === 'AbortError';
    const msg = isAbort ? 'AI request timed out.' : `AI scoring failed: ${err.message}`;
    console.error('[AIProvider]', msg);

    return {
      success: false,
      aiAssisted: false,
      projectScore: 0,
      projectEvidence: [],
      projectNote: 'AI scoring unavailable for this report.',
      keywordScore: 0,
      keywordEvidence: [],
      explanation: '',
      error: msg,
    };
  }
}

export default {
  isAIAvailable,
  scoreWithAI,
};
