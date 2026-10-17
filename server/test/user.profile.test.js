import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import { generateToken } from '../src/utils/jwt.js';

let passed = 0;
let total = 0;

function assert(condition, message) {
  total++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(message);
  }
  passed++;
  console.log(`  PASS: ${message}`);
}

// Minimal valid PDF binary buffer: starts with %PDF-
const VALID_PDF_BUFFER = Buffer.from(
  '%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n3 0 obj\n<< /Type /Page /Parent 2 0 R >>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000058 00000 n \n0000000115 00000 n \ntrailer\n<< /Size 4 /Root 1 0 R >>\nstartxref\n168\n%%EOF'
);

// Minimal valid DOCX buffer: starts with PK\x03\x04 and contains word/ and [Content_Types].xml
const VALID_DOCX_BUFFER = Buffer.concat([
  Buffer.from([0x50, 0x4b, 0x03, 0x04]),
  Buffer.from(' [Content_Types].xml word/document.xml _rels/.rels Mock Word OpenXML Content'),
]);

// Spoofed executable pretending to be a PDF (starts with MZ)
const FAKE_SPOOFED_PDF = Buffer.from('MZ\x90\x00\x03\x00\x00\x00\x04\x00\x00\x00\xff\xff');

// Plain text pretending to be a PDF
const PLAIN_TEXT_BUFFER = Buffer.from('Hello world this is not a pdf');

async function runCandidateProfileTests() {
  console.log('====================================================');
  console.log('   JobTrack - Candidate Profile & Resume Tests      ');
  console.log('====================================================\n');

  await connectDB();

  // Clean up prior test runs
  await User.deleteMany({ email: { $regex: /@profiletest\.local$/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    const candidateA = await User.create({
      name: 'Alice Candidate',
      email: 'alice.candidate@profiletest.local',
      password: 'AlicePassword123!',
      role: 'candidate',
      status: 'active',
      phone: '+1 (555) 123-4567',
      location: 'San Francisco, CA',
      skills: ['react', 'node.js'],
      experience: [{ title: 'Frontend Dev', company: 'Acme Inc', years: 3 }],
    });

    const candidateB = await User.create({
      name: 'Bob Candidate',
      email: 'bob.candidate@profiletest.local',
      password: 'BobPassword123!',
      role: 'candidate',
      status: 'active',
    });

    const recruiter = await User.create({
      name: 'Rachel Recruiter',
      email: 'rachel.recruiter@profiletest.local',
      password: 'RachelPassword123!',
      role: 'recruiter',
      status: 'active',
    });

    const disabledUser = await User.create({
      name: 'Disabled User',
      email: 'disabled.user@profiletest.local',
      password: 'DisabledPassword123!',
      role: 'candidate',
      status: 'disabled',
    });

    const tokenCandidateA = generateToken({ id: candidateA._id, role: candidateA.role });
    const tokenCandidateB = generateToken({ id: candidateB._id, role: candidateB.role });
    const tokenRecruiter = generateToken({ id: recruiter._id, role: recruiter.role });
    const tokenDisabled = generateToken({ id: disabledUser._id, role: disabledUser.role });

    // -------------------------------------------------------------
    // Test Group 1: GET /api/users/me (Identity & Profile Verification)
    // -------------------------------------------------------------
    console.log('[Test Group 1] GET /api/users/me Profile Retrieval:');

    // 1.1 Unauthenticated access is blocked
    const resGetUnauth = await request(app).get('/api/users/me');
    assert(resGetUnauth.status === 401, 'Unauthenticated GET /api/users/me returns 401');

    // 1.2 Disabled account is blocked
    const resGetDisabled = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tokenDisabled}`);
    assert(resGetDisabled.status === 403, 'Disabled user GET /api/users/me returns 403');

    // 1.3 Authenticated candidate retrieves profile
    const resGetCandidate = await request(app)
      .get('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`);
    assert(resGetCandidate.status === 200, 'Candidate GET /api/users/me returns 200 OK');
    assert(resGetCandidate.body.success === true, 'Response contains success: true');
    assert(
      resGetCandidate.body.data.user.email === 'alice.candidate@profiletest.local',
      'Returns correct user email'
    );
    assert(resGetCandidate.body.data.user.role === 'candidate', 'Returns correct role');
    assert(
      resGetCandidate.body.data.user.passwordHash === undefined,
      'Sensitive passwordHash is excluded from output'
    );
    assert(
      Array.isArray(resGetCandidate.body.data.user.skills),
      'Skills returned as an array'
    );

    // -------------------------------------------------------------
    // Test Group 2: PATCH /api/users/me (Profile Field Updates & Role Protection)
    // -------------------------------------------------------------
    console.log('\n[Test Group 2] PATCH /api/users/me Profile Updates & Mass Assignment:');

    // 2.1 Unauthenticated update is blocked
    const resPatchUnauth = await request(app)
      .patch('/api/users/me')
      .send({ name: 'Hacker' });
    assert(resPatchUnauth.status === 401, 'Unauthenticated PATCH /api/users/me returns 401');

    // 2.2 Legitimate candidate update (name, phone, location, skills, experience)
    const resPatchValid = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({
        name: 'Alice Updated',
        phone: '+1 555 987 6543',
        location: 'Austin, TX',
        skills: ['react', 'typescript', 'tailwind'],
        experience: [
          {
            title: 'Senior Frontend Engineer',
            company: 'TechCorp',
            years: 5,
            description: 'Leading web design system',
          },
        ],
      });

    assert(resPatchValid.status === 200, 'Valid PATCH /api/users/me returns 200 OK');
    assert(
      resPatchValid.body.data.user.name === 'Alice Updated',
      'Name successfully updated'
    );
    assert(
      resPatchValid.body.data.user.location === 'Austin, TX',
      'Location successfully updated'
    );
    assert(
      resPatchValid.body.data.user.skills.includes('typescript'),
      'Skills list updated'
    );
    assert(
      resPatchValid.body.data.user.experience[0].company === 'TechCorp',
      'Experience list updated'
    );

    // 2.3 Prohibit role alteration (Mass Assignment / Role Escalation)
    const resPatchRole = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({ role: 'admin' });
    assert(
      resPatchRole.status === 403,
      'Attempting to change role returns 403 Forbidden'
    );
    const dbUserAfterRoleCheck = await User.findById(candidateA._id);
    assert(
      dbUserAfterRoleCheck.role === 'candidate',
      'Candidate role remains unchanged in database'
    );

    // 2.4 Prohibit account status tampering
    const resPatchStatus = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({ status: 'disabled' });
    assert(
      resPatchStatus.status === 403,
      'Attempting to change account status returns 403 Forbidden'
    );

    // 2.5 Prohibit email modification via profile patch
    const resPatchEmail = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({ email: 'newemail@profiletest.local' });
    assert(
      resPatchEmail.status === 403,
      'Attempting to change email returns 403 Forbidden'
    );

    // 2.6 Input validation failures (empty name, invalid phone, empty body)
    const resEmptyBody = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({});
    assert(resEmptyBody.status === 400, 'Empty update payload returns 400 Bad Request');

    const resInvalidName = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({ name: 'A' });
    assert(resInvalidName.status === 400, 'Single-character name returns 400 Bad Request');

    const resInvalidPhone = await request(app)
      .patch('/api/users/me')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .send({ phone: '123' });
    assert(resInvalidPhone.status === 400, 'Too short phone number returns 400 Bad Request');

    // -------------------------------------------------------------
    // Test Group 3: POST /api/users/me/resume (File Validation & Magic Bytes)
    // -------------------------------------------------------------
    console.log('\n[Test Group 3] Resume Upload & Magic Bytes Inspection:');

    // 3.1 Unauthenticated upload blocked
    const resUploadUnauth = await request(app)
      .post('/api/users/me/resume')
      .attach('resume', VALID_PDF_BUFFER, 'resume.pdf');
    assert(resUploadUnauth.status === 401, 'Unauthenticated upload returns 401');

    // 3.2 Non-candidate (Recruiter) upload blocked
    const resUploadRecruiter = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenRecruiter}`)
      .attach('resume', VALID_PDF_BUFFER, 'resume.pdf');
    assert(
      resUploadRecruiter.status === 403,
      'Recruiter uploading candidate resume yields 403 Forbidden'
    );

    // 3.3 Missing file upload rejected
    const resUploadEmpty = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`);
    assert(resUploadEmpty.status === 400, 'Upload without file returns 400 Bad Request');

    // 3.4 Disallowed file extension rejected (.exe, .sh, .png)
    const resUploadBadExt = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .attach('resume', Buffer.from('console.log("bad");'), 'malicious.js');
    assert(resUploadBadExt.status === 400, 'Upload with .js extension returns 400');

    // 3.5 Spoofed executable pretending to be PDF (rejected by Magic Bytes)
    const resUploadSpoofed = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .attach('resume', FAKE_SPOOFED_PDF, 'malicious.pdf');
    assert(
      resUploadSpoofed.status === 400,
      'Executable with .pdf extension rejected by magic byte inspection'
    );

    // 3.6 Plain text pretending to be PDF (rejected by Magic Bytes)
    const resUploadText = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .attach('resume', PLAIN_TEXT_BUFFER, 'fake_resume.pdf');
    assert(
      resUploadText.status === 400,
      'Plain text disguised as PDF rejected by magic bytes'
    );

    // 3.7 Valid PDF upload succeeds (201 Created)
    const resUploadPdf = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .attach('resume', VALID_PDF_BUFFER, 'Alice_Official_Resume.pdf');
    assert(resUploadPdf.status === 201, 'Valid PDF upload returns 201 Created');
    assert(resUploadPdf.body.success === true, 'Upload response indicates success');
    assert(
      resUploadPdf.body.data.resume.mimeType === 'application/pdf',
      'MIME type verified as application/pdf'
    );
    assert(
      resUploadPdf.body.data.resume.url === '/api/users/me/resume',
      'URL provides authorized private access path'
    );
    assert(
      resUploadPdf.body.data.resume.filename === 'Alice_Official_Resume.pdf',
      'Sanitized filename preserved for display'
    );

    // Verify DB reflects uploaded resume
    const userWithResume = await User.findById(candidateA._id);
    assert(
      userWithResume.resume && userWithResume.resume.storageKey,
      'Database contains resume record with storageKey'
    );

    // 3.8 Replace existing resume with a DOCX file
    const resReplaceDocx = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .attach('resume', VALID_DOCX_BUFFER, 'Alice_Updated.docx');
    assert(resReplaceDocx.status === 201, 'Replacing resume with DOCX returns 201');
    assert(
      resReplaceDocx.body.data.resume.filename === 'Alice_Updated.docx',
      'New DOCX filename reflected'
    );
    assert(
      resReplaceDocx.body.data.resume.mimeType.includes('openxmlformats') ||
        resReplaceDocx.body.data.resume.mimeType.includes('word'),
      'MIME type verified as docx'
    );

    // 3.9 Path traversal attempt in filename is sanitized
    const resTraversal = await request(app)
      .post('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`)
      .attach('resume', VALID_PDF_BUFFER, '../../../../etc/passwd.pdf');
    assert(resTraversal.status === 201, 'Upload with path traversal name succeeds safely');
    assert(
      !resTraversal.body.data.resume.filename.includes('/'),
      'Sanitized filename strips path traversal slashes'
    );
    assert(
      !resTraversal.body.data.resume.filename.includes('..'),
      'Sanitized filename strips parent directory traversal dots'
    );

    // -------------------------------------------------------------
    // Test Group 4: Authorized Resume Download & Access Control
    // -------------------------------------------------------------
    console.log('\n[Test Group 4] Authorized Resume Access & Private Streaming:');

    // 4.1 Candidate accessing own resume
    const resDownloadSelf = await request(app)
      .get('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateA}`);
    assert(resDownloadSelf.status === 200, 'Candidate accessing own resume returns 200 OK');
    assert(
      resDownloadSelf.headers['x-content-type-options'] === 'nosniff',
      'Injects X-Content-Type-Options: nosniff security header'
    );

    // 4.2 Candidate accessing another candidate's resume (Strictly Forbidden)
    const resCrossCandidate = await request(app)
      .get(`/api/users/${candidateA._id}/resume`)
      .set('Authorization', `Bearer ${tokenCandidateB}`);
    assert(
      resCrossCandidate.status === 403,
      'Candidate accessing another candidate resume yields 403 Forbidden'
    );

    // 4.3 Recruiter accessing candidate resume (Authorized)
    const resRecruiterAccess = await request(app)
      .get(`/api/users/${candidateA._id}/resume`)
      .set('Authorization', `Bearer ${tokenRecruiter}`);
    assert(
      resRecruiterAccess.status === 200,
      'Recruiter accessing candidate resume yields 200 OK'
    );

    // 4.4 Unauthenticated access to resume endpoint blocked
    const resDownloadUnauth = await request(app).get('/api/users/me/resume');
    assert(resDownloadUnauth.status === 401, 'Unauthenticated resume download returns 401');

    // 4.5 Accessing resume for candidate without a resume returns 404
    const resDownloadNotFound = await request(app)
      .get('/api/users/me/resume')
      .set('Authorization', `Bearer ${tokenCandidateB}`);
    assert(
      resDownloadNotFound.status === 404,
      'Candidate without resume returns 404 Not Found'
    );

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    await User.deleteMany({ email: { $regex: /@profiletest\.local$/i } });

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    await disconnectDB();
  }
}

runCandidateProfileTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
