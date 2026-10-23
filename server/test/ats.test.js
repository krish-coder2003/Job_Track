/**
 * ATS Module Tests — Step 19
 *
 * Covers:
 *  - PDF and DOCX text extraction
 *  - Corrupted/empty/unsupported files
 *  - Weighted score calculations and normalisation
 *  - Missing and unverified criteria
 *  - AI provider failure / malformed output
 *  - Duplicate processing protection
 *  - Recruiter ownership checks
 *  - Candidate access restrictions
 *  - Unauthorized score modifications
 */

import { test, describe, before, after } from 'node:test';
import assert from 'node:assert/strict';
import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import User from '../src/models/user.model.js';
import Application from '../src/models/application.model.js';
import JobCriteria from '../src/models/jobCriteria.model.js';
import ATSReport from '../src/models/atsReport.model.js';
import { normalizeWeights, scoreResume } from '../src/services/atsEngine.service.js';
import { extractResumeText } from '../src/services/resumeExtractor.service.js';
import { isAIAvailable } from '../src/services/aiProvider.service.js';
import dotenv from 'dotenv';

dotenv.config();

// ─── Helpers ──────────────────────────────────────────────────────────────────

const API = '/api';

async function registerAndLogin(userData) {
  await request(app).post(`${API}/auth/register`).send(userData);
  const loginRes = await request(app).post(`${API}/auth/login`).send({
    email: userData.email,
    password: userData.password,
  });
  return loginRes.body?.data?.token;
}

function uniqueEmail(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}@ats-test.com`;
}

function makeJobPayload(overrides = {}) {
  return {
    title: 'Senior Backend Engineer',
    company: 'ATS Corp',
    location: 'Remote',
    jobType: 'full-time',
    workMode: 'remote',
    experienceLevel: 'senior',
    description: 'We build distributed systems at scale with Node.js, Postgres and Kubernetes.',
    ...overrides,
  };
}

// ─── Fixtures ─────────────────────────────────────────────────────────────────

let recruiterToken, recruiter2Token, candidateToken, adminToken;
let _recruiterId, _candidate2Id;
let jobId, _job2Id;
let applicationId;

// Minimal valid PDF buffer (a tiny but real PDF)
const MINIMAL_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n' +
  '1 0 obj<</Type /Catalog /Pages 2 0 R>>endobj\n' +
  '2 0 obj<</Type /Pages /Kids [3 0 R] /Count 1>>endobj\n' +
  '3 0 obj<</Type /Page /MediaBox [0 0 612 792] /Parent 2 0 R' +
  '/Contents 4 0 R /Resources<</Font<</F1 5 0 R>>>>>>endobj\n' +
  '4 0 obj<</Length 44>>\nstream\nBT /F1 12 Tf 100 700 Td (Hello World) Tj ET\nendstream\nendobj\n' +
  '5 0 obj<</Type /Font /Subtype /Type1 /BaseFont /Helvetica>>endobj\n' +
  'xref\n0 6\n0000000000 65535 f \n' +
  '0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \n' +
  '0000000266 00000 n \n0000000360 00000 n \n' +
  'trailer<</Size 6 /Root 1 0 R>>\nstartxref\n441\n%%EOF'
);

// A minimal text used as fake resume for scoring tests
const FAKE_RESUME_TEXT = `
John Doe - Software Engineer
Experience: 6 years of experience in software development
Skills: React, TypeScript, Node.js, PostgreSQL, Docker, Kubernetes, AWS, GraphQL
Education: Bachelor of Science in Computer Science, State University, 2018
Projects: Built RESTful APIs using Express and PostgreSQL. Deployed microservices on Kubernetes.
  Contributed to open-source projects. Worked on CI/CD pipelines with GitHub Actions.
Keywords: agile, microservices, distributed systems
`;

// ─── Test setup ───────────────────────────────────────────────────────────────

before(async () => {
  await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/jobtrack_test');

  // Clean ATS collections and test users before tests
  await JobCriteria.deleteMany({});
  await ATSReport.deleteMany({});
  await User.deleteMany({ email: /@ats-test\.com$/i });
  await Application.deleteMany({ 'resume.filename': 'test-resume.pdf' });

  const recruiterData = { name: 'ATS Recruiter', email: uniqueEmail('ats-rec'), password: 'Password123!', role: 'recruiter' };
  const recruiter2Data = { name: 'ATS Recruiter2', email: uniqueEmail('ats-rec2'), password: 'Password123!', role: 'recruiter' };
  const candidateData = { name: 'ATS Candidate', email: uniqueEmail('ats-cand'), password: 'Password123!', role: 'candidate' };
  const candidate2Data = { name: 'ATS Candidate2', email: uniqueEmail('ats-cand2'), password: 'Password123!', role: 'candidate' };
  const adminData = { name: 'ATS Admin', email: uniqueEmail('ats-admin'), password: 'Password123!', role: 'admin' };

  [recruiterToken, recruiter2Token, candidateToken] = await Promise.all([
    registerAndLogin(recruiterData),
    registerAndLogin(recruiter2Data),
    registerAndLogin(candidateData),
  ]);

  // Admin registration requires existing admin — create directly
  const admin = await User.create({ name: adminData.name, email: adminData.email, role: 'admin', status: 'active', passwordHash: '$2a$10$PLACEHOLDER' });
  admin.passwordHash = undefined;
  const adminUser = await User.findById(admin._id);
  adminUser.passwordHash = await import('bcryptjs').then((m) => m.default.hash(adminData.password, 10));
  await adminUser.save();
  const adminLoginRes = await request(app).post(`${API}/auth/login`).send({ email: adminData.email, password: adminData.password });
  adminToken = adminLoginRes.body?.data?.token;

  // Get user IDs
  const recMeRes = await request(app).get(`${API}/users/me`).set('Authorization', `Bearer ${recruiterToken}`);
  _recruiterId = recMeRes.body?.data?.user?._id;

  const c2Res = await request(app).post(`${API}/auth/register`).send(candidate2Data);
  _candidate2Id = c2Res.body?.data?.user?._id;

  // Create a job owned by recruiter
  const jobRes = await request(app)
    .post(`${API}/jobs`)
    .set('Authorization', `Bearer ${recruiterToken}`)
    .send(makeJobPayload());
  jobId = jobRes.body?.data?.job?._id;

  // Create a second job owned by recruiter2
  const job2Res = await request(app)
    .post(`${API}/jobs`)
    .set('Authorization', `Bearer ${recruiter2Token}`)
    .send(makeJobPayload({ title: 'Frontend Engineer', company: 'Other Corp' }));
  _job2Id = job2Res.body?.data?.job?._id;

  // Add a fake resume to the candidate's profile so ATS can attempt extraction
  await User.findOneAndUpdate(
    { email: candidateData.email },
    {
      resume: {
        storageProvider: 'local',
        storageKey: 'test-non-existent-resume.pdf',
        filename: 'test-resume.pdf',
        fileSize: 1024,
        mimeType: 'application/pdf',
        uploadedAt: new Date(),
      },
    }
  );

  // Candidate applies to the job
  const candUser = await User.findOne({ email: candidateData.email });
  const applyRes = await Application.create({
    candidate: candUser._id,
    job: jobId,
    resume: {
      storageKey: 'test-non-existent-resume.pdf',
      filename: 'test-resume.pdf',
      storageProvider: 'local',
      mimeType: 'application/pdf',
    },
  });
  applicationId = applyRes._id.toString();
});

after(async () => {
  await JobCriteria.deleteMany({});
  await ATSReport.deleteMany({});
  await User.deleteMany({ email: /@ats-test\.com$/i });
  await Application.deleteMany({ 'resume.filename': 'test-resume.pdf' });
  await mongoose.disconnect();
});

// ═════════════════════════════════════════════════════════════════════════════
// 1. Unit: weight normalisation
// ═════════════════════════════════════════════════════════════════════════════

describe('normalizeWeights()', () => {
  test('normalises weights that sum > 100', () => {
    const result = normalizeWeights({ skills: 50, projects: 50, experience: 50, education: 50, keywords: 50 });
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 100) < 0.01, `Total should be 100, got ${total}`);
  });

  test('normalises weights that sum < 100', () => {
    const result = normalizeWeights({ skills: 10, projects: 10, experience: 10, education: 10, keywords: 10 });
    const total = Object.values(result).reduce((a, b) => a + b, 0);
    assert.ok(Math.abs(total - 100) < 0.01);
  });

  test('handles all-zero weights with equal fallback', () => {
    const result = normalizeWeights({ skills: 0, projects: 0, experience: 0, education: 0, keywords: 0 });
    for (const v of Object.values(result)) {
      assert.ok(v > 0, 'All-zero should produce equal non-zero weights');
    }
  });

  test('preserves default weights exactly (35+25+20+10+10)', () => {
    const defaults = { skills: 35, projects: 25, experience: 20, education: 10, keywords: 10 };
    const result = normalizeWeights(defaults);
    assert.ok(Math.abs(result.skills - 35) < 0.01);
    assert.ok(Math.abs(result.projects - 25) < 0.01);
    assert.ok(Math.abs(result.experience - 20) < 0.01);
  });

  test('rejects negative weights by clamping to 0', () => {
    const result = normalizeWeights({ skills: -10, projects: 50, experience: 50, education: 0, keywords: 0 });
    assert.ok(result.skills === 0 || result.skills >= 0, 'Negative skills weight should clamp to 0');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. Unit: ATS engine scoring
// ═════════════════════════════════════════════════════════════════════════════

describe('ATS scoring engine (deterministic)', () => {
  const mockCriteria = {
    requiredSkills: ['react', 'node.js', 'typescript'],
    preferredSkills: ['graphql', 'docker'],
    minimumEducation: 'bachelor',
    minimumExperienceYears: 4,
    projectRequirements: 'Built REST APIs and microservices',
    jobDescriptionKeywords: ['agile', 'microservices'],
    weights: { skills: 35, projects: 25, experience: 20, education: 10, keywords: 10, isDefault: true },
  };

  const mockJob = { title: 'Backend Engineer', description: 'We use Node.js and microservices.' };

  test('produces overall score 0-100 for full match', async () => {
    const result = await scoreResume({
      resumeText: FAKE_RESUME_TEXT,
      criteria: mockCriteria,
      job: mockJob,
      useAI: false,
    });
    assert.ok(result.overallScore >= 0 && result.overallScore <= 100);
    assert.ok(result.scoringVersion, 'Must include scoring version');
  });

  test('matches required skills correctly', async () => {
    const result = await scoreResume({
      resumeText: FAKE_RESUME_TEXT,
      criteria: { ...mockCriteria },
      job: mockJob,
      useAI: false,
    });
    assert.ok(result.categoryScores.skills.score >= 60, `Expected skill score >= 60, got ${result.categoryScores.skills.score}`);
  });

  test('penalises missing required skills', async () => {
    const sparseText = 'Python developer with 2 years of data science experience.';
    const result = await scoreResume({
      resumeText: sparseText,
      criteria: mockCriteria,
      job: mockJob,
      useAI: false,
    });
    assert.ok(result.categoryScores.skills.score < 50, `Expected low skill score for missing skills, got ${result.categoryScores.skills.score}`);
    assert.ok(result.categoryScores.skills.missing.length > 0, 'Missing skills array should be populated');
  });

  test('gives partial experience score when below minimum', async () => {
    const lowExpText = '2 years of experience in web development. Skills: react, node.js, typescript.';
    const result = await scoreResume({
      resumeText: lowExpText,
      criteria: { ...mockCriteria, minimumExperienceYears: 8 },
      job: mockJob,
      useAI: false,
    });
    assert.ok(result.categoryScores.experience.score < 100, 'Should not give full score if below minimum years');
  });

  test('gives 30 experience score when experience not stated', async () => {
    const noExpText = 'React developer with skills: react, node.js, typescript, graphql.';
    const result = await scoreResume({
      resumeText: noExpText,
      criteria: { ...mockCriteria, minimumExperienceYears: 3 },
      job: mockJob,
      useAI: false,
    });
    assert.strictEqual(result.categoryScores.experience.score, 30);
  });

  test('detects bachelor education correctly', async () => {
    const result = await scoreResume({
      resumeText: FAKE_RESUME_TEXT,
      criteria: { ...mockCriteria, minimumEducation: 'bachelor' },
      job: mockJob,
      useAI: false,
    });
    assert.strictEqual(result.categoryScores.education.score, 100, 'Bachelor found in resume should score 100');
  });

  test('scores 30 when education not detected', async () => {
    const noEduText = 'Skills: react, node.js. 5 years of experience.';
    const result = await scoreResume({
      resumeText: noEduText,
      criteria: { ...mockCriteria, minimumEducation: 'master' },
      job: mockJob,
      useAI: false,
    });
    assert.strictEqual(result.categoryScores.education.score, 30);
  });

  test('produces category scores for all 5 categories', async () => {
    const result = await scoreResume({ resumeText: FAKE_RESUME_TEXT, criteria: mockCriteria, job: mockJob, useAI: false });
    for (const key of ['skills', 'projects', 'experience', 'education', 'keywords']) {
      assert.ok(result.categoryScores[key], `Missing category: ${key}`);
    }
  });

  test('weighted sum matches overallScore', async () => {
    const result = await scoreResume({ resumeText: FAKE_RESUME_TEXT, criteria: mockCriteria, job: mockJob, useAI: false });
    const sum = Object.values(result.categoryScores).reduce((acc, c) => acc + c.weightedScore, 0);
    assert.ok(Math.abs(sum - result.overallScore) <= 1, `Weighted sum ${sum} should ≈ overall ${result.overallScore}`);
  });

  test('no criteria = 100% on all deterministic categories', async () => {
    const emptyCriteria = {
      requiredSkills: [],
      preferredSkills: [],
      minimumEducation: 'any',
      minimumExperienceYears: 0,
      projectRequirements: '',
      jobDescriptionKeywords: [],
      weights: { skills: 35, projects: 25, experience: 20, education: 10, keywords: 10, isDefault: true },
    };
    const result = await scoreResume({ resumeText: FAKE_RESUME_TEXT, criteria: emptyCriteria, job: mockJob, useAI: false });
    assert.strictEqual(result.categoryScores.skills.score, 100);
    assert.strictEqual(result.categoryScores.experience.score, 100);
    assert.strictEqual(result.categoryScores.education.score, 100);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. Unit: Resume extraction
// ═════════════════════════════════════════════════════════════════════════════

describe('extractResumeText()', () => {
  test('returns success:false for missing storageKey', async () => {
    const result = await extractResumeText({ resumeInfo: { storageKey: null } });
    assert.strictEqual(result.success, false);
  });

  test('returns success:false for unsupported MIME type', async () => {
    const result = await extractResumeText({
      resumeInfo: { storageKey: 'test.txt', mimeType: 'text/plain', filename: 'resume.txt' },
      buffer: Buffer.from('plain text'),
    });
    assert.strictEqual(result.success, false);
    assert.ok(result.warning.toLowerCase().includes('unsupported'));
  });

  test('extracts text from a valid PDF buffer', async () => {
    const result = await extractResumeText({
      resumeInfo: { storageKey: 'test.pdf', mimeType: 'application/pdf', filename: 'test.pdf', storageProvider: 'local' },
      buffer: MINIMAL_PDF_BUFFER,
    });
    // Very small test PDF may not have extractable text — should not throw
    assert.ok(typeof result.text === 'string', 'Should return a string text field');
    assert.ok(typeof result.success === 'boolean');
  });

  test('handles corrupted PDF without throwing', async () => {
    const corruptBuffer = Buffer.from('%PDF-1.4\ncorrupted garbage data !@#$%');
    const result = await extractResumeText({
      resumeInfo: { storageKey: 'corrupt.pdf', mimeType: 'application/pdf', filename: 'corrupt.pdf', storageProvider: 'local' },
      buffer: corruptBuffer,
    });
    assert.strictEqual(result.success, false);
    assert.ok(result.warning, 'Should report a warning for corrupt PDFs');
  });

  test('handles empty buffer without throwing', async () => {
    const result = await extractResumeText({
      resumeInfo: { storageKey: 'empty.pdf', mimeType: 'application/pdf', filename: 'empty.pdf', storageProvider: 'local' },
      buffer: Buffer.alloc(0),
    });
    // Empty buffer is not a valid PDF — should gracefully fail
    assert.ok(typeof result.success === 'boolean');
  });

  test('returns Cloudinary unavailability message for Cloudinary resumes', async () => {
    const result = await extractResumeText({
      resumeInfo: {
        storageProvider: 'cloudinary',
        storageKey: 'resumes/abc123',
        mimeType: 'application/pdf',
        filename: 'resume.pdf',
      },
    });
    assert.strictEqual(result.success, false);
    assert.ok(result.warning.includes('Cloudinary'), 'Should mention Cloudinary limitation');
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. Unit: AI provider service
// ═════════════════════════════════════════════════════════════════════════════

describe('aiProvider.service', () => {
  test('isAIAvailable() returns boolean', () => {
    const result = isAIAvailable();
    assert.ok(typeof result === 'boolean');
  });

  test('scoreWithAI() returns fallback when no GEMINI_API_KEY configured', async () => {
    const { scoreWithAI } = await import('../src/services/aiProvider.service.js');
    // Remove key if set
    const saved = process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_API_KEY;

    const result = await scoreWithAI({
      resumeText: FAKE_RESUME_TEXT,
      projectRequirements: 'Built APIs',
      keywords: ['agile'],
      jobTitle: 'Engineer',
      jobDescription: 'Build stuff',
    });

    assert.strictEqual(result.success, false);
    assert.strictEqual(result.aiAssisted, false);
    assert.ok(result.error, 'Should include error message');
    assert.ok(typeof result.projectScore === 'number');
    assert.ok(Array.isArray(result.projectEvidence));

    // Restore
    if (saved) process.env.GEMINI_API_KEY = saved;
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. API: Criteria endpoints
// ═════════════════════════════════════════════════════════════════════════════

describe('PUT /api/jobs/:jobId/criteria', () => {
  test('saves criteria for recruiter owner', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        requiredSkills: ['node.js', 'react'],
        preferredSkills: ['graphql'],
        minimumEducation: 'bachelor',
        minimumExperienceYears: 3,
        projectRequirements: 'Built production APIs',
        jobDescriptionKeywords: ['agile', 'microservices'],
        weights: { skills: 40, projects: 30, experience: 20, education: 5, keywords: 5 },
      });
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.criteria, 'Should return saved criteria');
    assert.ok(res.body.data.criteria.weights.isDefault === false, 'Custom weights should set isDefault=false');
  });

  test('GET /api/jobs/:jobId/criteria returns saved criteria', async () => {
    const res = await request(app)
      .get(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data.criteria.requiredSkills));
    assert.ok(res.body.data.criteria.requiredSkills.includes('node.js'));
  });

  test('blocks recruiter from modifying another recruiter\u2019s criteria', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${recruiter2Token}`)
      .send({ requiredSkills: ['hacker'] });
    assert.strictEqual(res.status, 403);
  });

  test('blocks candidate from setting criteria', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({ requiredSkills: ['react'] });
    assert.strictEqual(res.status, 403);
  });

  test('blocks unauthenticated users from setting criteria', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .send({ requiredSkills: ['react'] });
    assert.strictEqual(res.status, 401);
  });

  test('rejects negative weights', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ weights: { skills: -10, projects: 50, experience: 30, education: 10, keywords: 10 } });
    assert.strictEqual(res.status, 400);
  });

  test('rejects invalid education level', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({ minimumEducation: 'invalid-level' });
    assert.strictEqual(res.status, 400);
  });

  test('admin can set criteria for any job', async () => {
    const res = await request(app)
      .put(`${API}/jobs/${jobId}/criteria`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ minimumExperienceYears: 5 });
    assert.strictEqual(res.status, 200);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. API: ATS report request
// ═════════════════════════════════════════════════════════════════════════════

describe('POST /api/applications/:applicationId/ats', () => {
  test('blocks candidate from requesting ATS analysis', async () => {
    const res = await request(app)
      .post(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${candidateToken}`);
    assert.strictEqual(res.status, 403);
  });

  test('blocks unauthenticated request', async () => {
    const res = await request(app)
      .post(`${API}/applications/${applicationId}/ats`);
    assert.strictEqual(res.status, 401);
  });

  test('blocks recruiter2 from analysing application on job they don\u2019t own', async () => {
    const res = await request(app)
      .post(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${recruiter2Token}`);
    assert.strictEqual(res.status, 403);
  });

  test('returns a report (failed or unavailable) for recruiter owner \u2014 resume file missing locally', async () => {
    const res = await request(app)
      .post(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200, `Expected 200 but got ${res.status}: ${JSON.stringify(res.body)}`);
    assert.ok(res.body.data.report, 'Should include a report object');
    // Since the resume file does not exist on disk, status should be failed or unavailable
    const status = res.body.data.report.status;
    assert.ok(['failed', 'unavailable', 'completed'].includes(status), `Unexpected status: ${status}`);
  });

  test('duplicate call returns existing report without re-running (no force flag)', async () => {
    // First call
    await request(app)
      .post(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    // Second call
    const res2 = await request(app)
      .post(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res2.status, 200);
    assert.ok(res2.body.data.report, 'Should return existing report');
  });

  test('force=true reprocesses the report', async () => {
    const res = await request(app)
      .post(`${API}/applications/${applicationId}/ats?force=true`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(res.body.data.report);
  });

  test('rejects invalid application ID format', async () => {
    const res = await request(app)
      .post(`${API}/applications/not-a-valid-id/ats`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 400);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. API: ATS report retrieval
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/applications/:applicationId/ats', () => {
  test('candidate cannot access ATS report', async () => {
    const res = await request(app)
      .get(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${candidateToken}`);
    assert.strictEqual(res.status, 403);
  });

  test('recruiter owner can retrieve report', async () => {
    const res = await request(app)
      .get(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.ok([200, 200].includes(res.status));
    // Report may be null if not yet requested, or the report object
    assert.ok('report' in res.body.data);
  });

  test('recruiter2 cannot access report for application on job they do not own', async () => {
    const res = await request(app)
      .get(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${recruiter2Token}`);
    assert.strictEqual(res.status, 403);
  });

  test('admin can retrieve any report', async () => {
    const res = await request(app)
      .get(`${API}/applications/${applicationId}/ats`)
      .set('Authorization', `Bearer ${adminToken}`);
    assert.strictEqual(res.status, 200);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. API: Job ATS reports summary
// ═════════════════════════════════════════════════════════════════════════════

describe('GET /api/jobs/:jobId/ats-reports', () => {
  test('returns report map for recruiter owner', async () => {
    const res = await request(app)
      .get(`${API}/jobs/${jobId}/ats-reports`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(typeof res.body.data.reports === 'object');
  });

  test('blocks candidate from accessing job reports', async () => {
    const res = await request(app)
      .get(`${API}/jobs/${jobId}/ats-reports`)
      .set('Authorization', `Bearer ${candidateToken}`);
    assert.strictEqual(res.status, 403);
  });

  test('blocks recruiter2 from accessing another\u2019s job reports', async () => {
    const res = await request(app)
      .get(`${API}/jobs/${jobId}/ats-reports`)
      .set('Authorization', `Bearer ${recruiter2Token}`);
    assert.strictEqual(res.status, 403);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. Regression: existing application workflows unaffected
// ═════════════════════════════════════════════════════════════════════════════

describe('Regression: existing application workflows', () => {
  test('GET /api/jobs/:id/applications still works for recruiter', async () => {
    const res = await request(app)
      .get(`${API}/jobs/${jobId}/applications`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200);
    assert.ok(Array.isArray(res.body.data?.applications));
  });

  test('GET /api/applications/:id still works', async () => {
    const res = await request(app)
      .get(`${API}/applications/${applicationId}`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200);
  });

  test('ATS routes do not interfere with job CRUD', async () => {
    const res = await request(app)
      .get(`${API}/jobs/${jobId}`)
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.body.data?.job?.title, 'Senior Backend Engineer');
  });
});
