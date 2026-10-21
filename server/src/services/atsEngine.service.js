/**
 * ATS Matching Engine — Deterministic scoring with optional AI semantic assistance.
 *
 * Scoring categories:
 *   skills     (required + preferred skill matching)   default 35%
 *   projects   (project relevance — AI-assisted)       default 25%
 *   experience (years of relevant experience)          default 20%
 *   education  (minimum education check)               default 10%
 *   keywords   (JD keyword alignment — AI-assisted)    default 10%
 *
 * The engine always produces a score. When AI is unavailable the projects
 * and keywords categories fall back to deterministic text-search.
 */

import { scoreWithAI } from './aiProvider.service.js';

export const SCORING_VERSION = '1.0';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Normalise weights so they always sum to 100.
 * Gracefully handles all-zero edge cases.
 *
 * @param {Object} w - Raw weight object { skills, projects, experience, education, keywords }
 * @returns {Object} - Normalised weight object (values in [0,100], sum == 100)
 */
export function normalizeWeights(w) {
  const keys = ['skills', 'projects', 'experience', 'education', 'keywords'];
  const raw = {};
  let total = 0;
  for (const k of keys) {
    raw[k] = Math.max(0, Number(w?.[k]) || 0);
    total += raw[k];
  }
  if (total === 0) {
    // All-zero edge case: fall back to equal weights
    const eq = 100 / keys.length;
    return Object.fromEntries(keys.map((k) => [k, eq]));
  }
  return Object.fromEntries(keys.map((k) => [k, (raw[k] / total) * 100]));
}

/**
 * Tokenise resume text into a searchable lowercase word-set.
 *
 * @param {string} text
 * @returns {Set<string>}
 */
function tokenise(text) {
  return new Set(
    text
      .toLowerCase()
      .replace(/[^a-z0-9#+.\s-]/g, ' ')
      .split(/\s+/)
      .filter(Boolean)
  );
}

/**
 * Check whether a skill term appears in the resume text.
 * Handles multi-word skills (e.g. "machine learning") and common variants.
 *
 * @param {string} skill
 * @param {string} resumeTextLower  - Pre-lowercased resume text
 * @param {Set<string>} tokens      - Token set for single-word skills
 * @returns {boolean}
 */
function skillFound(skill, resumeTextLower, tokens) {
  const s = skill.trim().toLowerCase();
  if (!s) return false;
  // Multi-word or hyphenated skills: use substring match
  if (s.includes(' ') || s.includes('-') || s.includes('+') || s.includes('#')) {
    return resumeTextLower.includes(s);
  }
  return tokens.has(s);
}

/**
 * Extract a short evidence excerpt surrounding the first occurrence of a term.
 *
 * @param {string} term
 * @param {string} text
 * @param {number} radius - Characters to include on each side
 * @returns {string|null}
 */
function extractEvidence(term, text, radius = 80) {
  const idx = text.toLowerCase().indexOf(term.toLowerCase());
  if (idx === -1) return null;
  const start = Math.max(0, idx - radius);
  const end = Math.min(text.length, idx + term.length + radius);
  return (start > 0 ? '…' : '') + text.slice(start, end).trim() + (end < text.length ? '…' : '');
}

// ─── Category scorers ─────────────────────────────────────────────────────────

/**
 * Score skills (required + preferred).
 * Required skills carry 70% of the category weight; preferred skills carry 30%.
 */
function scoreSkills(criteria, resumeText) {
  const lower = resumeText.toLowerCase();
  const tokens = tokenise(resumeText);

  const required = (criteria.requiredSkills || []).map(String);
  const preferred = (criteria.preferredSkills || []).map(String);

  const matchedRequired = required.filter((s) => skillFound(s, lower, tokens));
  const missingRequired = required.filter((s) => !skillFound(s, lower, tokens));
  const matchedPreferred = preferred.filter((s) => skillFound(s, lower, tokens));
  const missingPreferred = preferred.filter((s) => !skillFound(s, lower, tokens));

  // 70% weight for required, 30% for preferred within the category
  const requiredScore =
    required.length > 0 ? (matchedRequired.length / required.length) * 100 : 100;
  const preferredScore =
    preferred.length > 0 ? (matchedPreferred.length / preferred.length) * 100 : 100;

  const categoryScore = Math.round(
    required.length > 0 || preferred.length > 0
      ? requiredScore * 0.7 + preferredScore * 0.3
      : 100
  );

  // Collect evidence excerpts for matched skills (up to 3)
  const evidence = [
    ...matchedRequired.slice(0, 2).map((s) => extractEvidence(s, resumeText)),
    ...matchedPreferred.slice(0, 1).map((s) => extractEvidence(s, resumeText)),
  ].filter(Boolean);

  return {
    score: categoryScore,
    matched: [...matchedRequired, ...matchedPreferred],
    missing: [...missingRequired, ...missingPreferred],
    evidence,
    note: `${matchedRequired.length}/${required.length} required skills matched; ${matchedPreferred.length}/${preferred.length} preferred skills matched.`,
  };
}

/**
 * Score experience: check resume for claimed years of experience.
 * Uses regex heuristics to detect common patterns ("5 years", "3+ years", etc.)
 */
function scoreExperience(criteria, resumeText) {
  const minYears = Number(criteria.minimumExperienceYears) || 0;

  if (minYears === 0) {
    return {
      score: 100,
      matched: ['No minimum experience required'],
      missing: [],
      evidence: [],
      note: 'No minimum experience years specified.',
    };
  }

  const lower = resumeText.toLowerCase();

  // Patterns: "5 years", "5+ years", "over 5 years", "five years", "2-5 years"
  const yearPatterns = [
    /(\d+)\s*\+?\s*years?/gi,
    /(\d+)\s*[-–]\s*\d+\s*years?/gi,
    /over\s+(\d+)\s*years?/gi,
    /more\s+than\s+(\d+)\s*years?/gi,
  ];

  let maxDetected = 0;
  const evidenceItems = [];

  for (const pattern of yearPatterns) {
    let match;
    const re = new RegExp(pattern.source, 'gi');
    while ((match = re.exec(lower)) !== null) {
      const years = parseInt(match[1], 10);
      if (!isNaN(years) && years > maxDetected) {
        maxDetected = years;
        evidenceItems.push(extractEvidence(match[0], resumeText) || match[0]);
      }
    }
  }

  let score;
  let note;
  if (maxDetected === 0) {
    score = 30; // Experience not explicitly stated — give partial credit
    note = `Minimum ${minYears} years required. No explicit experience duration found in resume.`;
  } else if (maxDetected >= minYears) {
    score = 100;
    note = `Minimum ${minYears} years required. Resume indicates ~${maxDetected} years.`;
  } else {
    // Partial: less experience than required
    score = Math.round((maxDetected / minYears) * 80); // Max 80 if below threshold
    note = `Minimum ${minYears} years required. Resume indicates ~${maxDetected} years (below requirement).`;
  }

  return {
    score,
    matched: maxDetected > 0 ? [`~${maxDetected} years detected`] : [],
    missing: maxDetected < minYears ? [`${minYears} years minimum not met`] : [],
    evidence: evidenceItems.slice(0, 3),
    note,
  };
}

/**
 * Score education: check for minimum education level.
 * Uses keyword detection rather than semantic interpretation.
 */
function scoreEducation(criteria, resumeText) {
  const LEVEL_KEYWORDS = {
    'high-school': ['high school', 'ged', 'secondary school', 'hsc', 'ssc'],
    associate: ['associate', 'a.a.', 'a.s.', 'associate degree'],
    bachelor: ['bachelor', "b.s.", "b.a.", "b.e.", "b.tech", 'undergraduate', 'graduate', 'b.sc'],
    master: ['master', "m.s.", "m.a.", "m.b.a.", "m.tech", 'postgraduate', 'm.sc', 'mba'],
    phd: ['ph.d', 'phd', 'doctor', 'doctoral'],
  };

  const LEVEL_ORDER = ['none', 'high-school', 'associate', 'bachelor', 'master', 'phd', 'any'];

  const minLevel = criteria.minimumEducation || 'any';

  if (minLevel === 'any' || minLevel === 'none') {
    return {
      score: 100,
      matched: ['No specific education requirement'],
      missing: [],
      evidence: [],
      note: 'No minimum education level specified.',
    };
  }

  const lower = resumeText.toLowerCase();
  const detectedLevels = [];
  const evidenceItems = [];

  for (const [level, keywords] of Object.entries(LEVEL_KEYWORDS)) {
    for (const kw of keywords) {
      if (lower.includes(kw)) {
        if (!detectedLevels.includes(level)) detectedLevels.push(level);
        const ev = extractEvidence(kw, resumeText);
        if (ev && evidenceItems.length < 3) evidenceItems.push(ev);
        break;
      }
    }
  }

  const detectedOrder = detectedLevels.map((l) => LEVEL_ORDER.indexOf(l)).filter((i) => i >= 0);
  const highestDetected = detectedOrder.length > 0 ? Math.max(...detectedOrder) : -1;
  const requiredOrder = LEVEL_ORDER.indexOf(minLevel);

  let score;
  let note;
  if (highestDetected === -1) {
    score = 30;
    note = `Minimum ${minLevel} required. No education credentials detected in resume.`;
  } else if (highestDetected >= requiredOrder) {
    score = 100;
    const levelName = LEVEL_ORDER[highestDetected];
    note = `Minimum ${minLevel} required. Resume indicates ${levelName} education.`;
  } else {
    score = 50;
    const levelName = LEVEL_ORDER[highestDetected];
    note = `Minimum ${minLevel} required. Resume only indicates ${levelName} (below requirement).`;
  }

  return {
    score,
    matched: detectedLevels,
    missing: highestDetected < requiredOrder ? [minLevel] : [],
    evidence: evidenceItems,
    note,
  };
}

/**
 * Deterministic fallback for projects scoring (keyword-based substring matching).
 *
 * @param {string} projectRequirements
 * @param {string} resumeText
 * @returns {Object}
 */
function scoreProjectsDeterministic(projectRequirements, resumeText) {
  if (!projectRequirements || !projectRequirements.trim()) {
    return {
      score: 100,
      matched: ['No project requirements specified'],
      missing: [],
      evidence: [],
      note: 'No project requirements defined — score not penalised.',
    };
  }

  const lower = resumeText.toLowerCase();
  // Extract unique keywords from the requirements string
  const reqWords = projectRequirements
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 3); // skip short filler words

  const uniqueWords = [...new Set(reqWords)];
  if (uniqueWords.length === 0) {
    return { score: 60, matched: [], missing: [], evidence: [], note: 'Project requirements present but no scorable keywords found.' };
  }

  const matched = uniqueWords.filter((w) => lower.includes(w));
  const score = Math.round((matched.length / uniqueWords.length) * 100);
  const evidence = matched.slice(0, 3).map((w) => extractEvidence(w, resumeText)).filter(Boolean);

  return {
    score,
    matched,
    missing: uniqueWords.filter((w) => !lower.includes(w)),
    evidence,
    note: `Deterministic keyword match: ${matched.length}/${uniqueWords.length} project keywords found.`,
  };
}

/**
 * Deterministic fallback for keyword scoring.
 */
function scoreKeywordsDeterministic(keywords, resumeText) {
  if (!keywords || keywords.length === 0) {
    return { score: 100, matched: [], missing: [], evidence: [], note: 'No JD keywords specified.' };
  }

  const lower = resumeText.toLowerCase();
  const tokens = tokenise(resumeText);
  const matched = keywords.filter((k) => skillFound(k, lower, tokens));
  const score = Math.round((matched.length / keywords.length) * 100);
  const evidence = matched.slice(0, 3).map((k) => extractEvidence(k, resumeText)).filter(Boolean);

  return {
    score,
    matched,
    missing: keywords.filter((k) => !skillFound(k, lower, tokens)),
    evidence,
    note: `${matched.length}/${keywords.length} JD keywords found.`,
  };
}

// ─── Main scoring function ────────────────────────────────────────────────────

/**
 * Run the full ATS match for a resume against job criteria.
 *
 * @param {Object} params
 * @param {string}  params.resumeText      - Extracted resume plain text
 * @param {Object}  params.criteria        - JobCriteria document
 * @param {Object}  params.job             - Job document (for context)
 * @param {boolean} [params.useAI=true]    - Whether to attempt AI-assisted scoring
 *
 * @returns {Promise<{
 *   overallScore: number,
 *   categoryScores: Object,
 *   explanation: string,
 *   aiAssisted: boolean,
 *   aiProvider: string,
 *   scoringVersion: string
 * }>}
 */
export async function scoreResume({ resumeText, criteria, job, useAI = true }) {
  // Normalise weights first
  const weights = normalizeWeights(criteria.weights);

  // ── Deterministic scores ─────────────────────────────────────────
  const skillResult = scoreSkills(criteria, resumeText);
  const experienceResult = scoreExperience(criteria, resumeText);
  const educationResult = scoreEducation(criteria, resumeText);

  // ── AI-assisted scores (with deterministic fallback) ─────────────
  let projectResult;
  let keywordResult;
  let aiAssisted = false;
  let aiProvider = '';
  let aiExplanation = '';

  if (useAI) {
    const aiResult = await scoreWithAI({
      resumeText,
      projectRequirements: criteria.projectRequirements || '',
      keywords: criteria.jobDescriptionKeywords || [],
      jobTitle: job?.title || '',
      jobDescription: job?.description || '',
    });

    if (aiResult.success) {
      aiAssisted = true;
      aiProvider = 'google-gemini';
      aiExplanation = aiResult.explanation || '';

      projectResult = {
        score: aiResult.projectScore,
        matched: [],
        missing: [],
        evidence: aiResult.projectEvidence || [],
        note: aiResult.projectNote || '',
      };
      keywordResult = {
        score: aiResult.keywordScore,
        matched: [],
        missing: [],
        evidence: aiResult.keywordEvidence || [],
        note: `AI keyword alignment score: ${aiResult.keywordScore}/100.`,
      };
    }
  }

  // Deterministic fallback when AI is disabled or failed
  if (!projectResult) {
    projectResult = scoreProjectsDeterministic(criteria.projectRequirements, resumeText);
  }
  if (!keywordResult) {
    keywordResult = scoreKeywordsDeterministic(criteria.jobDescriptionKeywords || [], resumeText);
  }

  // ── Weighted aggregate ───────────────────────────────────────────
  const weighted = {
    skills: (skillResult.score * weights.skills) / 100,
    projects: (projectResult.score * weights.projects) / 100,
    experience: (experienceResult.score * weights.experience) / 100,
    education: (educationResult.score * weights.education) / 100,
    keywords: (keywordResult.score * weights.keywords) / 100,
  };

  const overallScore = Math.round(
    weighted.skills + weighted.projects + weighted.experience + weighted.education + weighted.keywords
  );

  // Build category score objects (including weight used)
  const categoryScores = {
    skills: { ...skillResult, weight: weights.skills, weightedScore: weighted.skills },
    projects: { ...projectResult, weight: weights.projects, weightedScore: weighted.projects },
    experience: { ...experienceResult, weight: weights.experience, weightedScore: weighted.experience },
    education: { ...educationResult, weight: weights.education, weightedScore: weighted.education },
    keywords: { ...keywordResult, weight: weights.keywords, weightedScore: weighted.keywords },
  };

  // Default explanation when AI is not used
  if (!aiExplanation) {
    const pct = overallScore;
    const tier = pct >= 80 ? 'strong' : pct >= 60 ? 'moderate' : 'limited';
    aiExplanation = `ATS match score: ${pct}/100 (${tier} match). ` +
      `Skills: ${skillResult.score}%, Experience: ${experienceResult.score}%, ` +
      `Education: ${educationResult.score}%, Projects: ${projectResult.score}%, ` +
      `Keywords: ${keywordResult.score}%. ` +
      `Scored deterministically — no AI provider configured.`;
  }

  return {
    overallScore,
    categoryScores,
    explanation: aiExplanation,
    aiAssisted,
    aiProvider,
    scoringVersion: SCORING_VERSION,
  };
}

export default {
  scoreResume,
  normalizeWeights,
  SCORING_VERSION,
};
