import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Job, { JOB_STATUS } from '../src/models/job.model.js';
import Application, { APPLICATION_STATUS } from '../src/models/application.model.js';
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

async function runApplicationTests() {
  console.log('====================================================');
  console.log('     JobTrack - Job Application Workflow Tests      ');
  console.log('====================================================\n');

  await connectDB();

  // Ensure compound index is synchronized with MongoDB
  await Application.syncIndexes();

  // Clean up prior test runs
  await Application.deleteMany({});
  await Job.deleteMany({ company: { $regex: /AppTest/i } });
  await User.deleteMany({ email: { $regex: /@apptest\.local$/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    // 1. Candidate with valid uploaded resume
    const candidateWithResume = await User.create({
      name: 'Bob Candidate',
      email: 'bob.candidate@apptest.local',
      password: 'Password123!',
      role: 'candidate',
      status: 'active',
      phone: '+1 (555) 333-4444',
      location: 'San Jose, CA',
      skills: ['react', 'node.js', 'typescript'],
      resume: {
        url: '/api/users/me/resume',
        filename: 'Bob_Resume_2026.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageProvider: 'local',
        storageKey: 'resumes/mock_storage_key_bob_123.pdf',
        uploadedAt: new Date(),
      },
    });

    // 2. Candidate without any resume
    const candidateWithoutResume = await User.create({
      name: 'Charlie NoResume',
      email: 'charlie.noresume@apptest.local',
      password: 'Password123!',
      role: 'candidate',
      status: 'active',
      location: 'Austin, TX',
      resume: {
        url: '',
        filename: '',
        storageKey: '',
      },
    });

    // 3. Second candidate for concurrency and impersonation tests
    const secondCandidate = await User.create({
      name: 'Diana Candidate',
      email: 'diana.candidate@apptest.local',
      password: 'Password123!',
      role: 'candidate',
      status: 'active',
      resume: {
        url: '/api/users/me/resume',
        filename: 'Diana_Resume.pdf',
        fileSize: 524288,
        mimeType: 'application/pdf',
        storageProvider: 'local',
        storageKey: 'resumes/mock_storage_key_diana_456.pdf',
        uploadedAt: new Date(),
      },
    });

    // 4. Recruiter user (owns test jobs)
    const recruiterUser = await User.create({
      name: 'Rachel Recruiter',
      email: 'rachel.recruiter@apptest.local',
      password: 'Password123!',
      role: 'recruiter',
      status: 'active',
    });

    // 5. Other recruiter user
    const otherRecruiterUser = await User.create({
      name: 'Oscar OtherRecruiter',
      email: 'oscar.other@apptest.local',
      password: 'Password123!',
      role: 'recruiter',
      status: 'active',
    });

    // Generate Auth Tokens
    const tokenCandidate = generateToken({ id: candidateWithResume._id, role: 'candidate' });
    const tokenNoResume = generateToken({ id: candidateWithoutResume._id, role: 'candidate' });
    const tokenSecondCandidate = generateToken({ id: secondCandidate._id, role: 'candidate' });
    const tokenRecruiter = generateToken({ id: recruiterUser._id, role: 'recruiter' });
    const tokenOtherRecruiter = generateToken({ id: otherRecruiterUser._id, role: 'recruiter' });

    // -------------------------------------------------------------
    // Setup Test Jobs
    // -------------------------------------------------------------
    // Open, active, approved job with future deadline
    const activeJob = await Job.create({
      title: 'Senior Full Stack Engineer',
      company: 'AppTest Tech Solutions',
      description: 'Join our distributed engineering team building modern web platforms.',
      location: 'Remote',
      jobType: 'full-time',
      workMode: 'remote',
      experienceLevel: 'senior',
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterUser._id,
      applicationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days in future
    });

    // Closed job
    const closedJob = await Job.create({
      title: 'DevOps Specialist (Closed)',
      company: 'AppTest Tech Solutions',
      description: 'Position is already filled and closed for applications.',
      location: 'Remote',
      jobType: 'contract',
      workMode: 'remote',
      experienceLevel: 'mid',
      status: JOB_STATUS.CLOSED,
      isApproved: true,
      recruiter: recruiterUser._id,
    });

    // Expired deadline job
    const expiredJob = await Job.create({
      title: 'Product Designer (Expired)',
      company: 'AppTest Tech Solutions',
      description: 'Application deadline has passed.',
      location: 'New York, NY',
      jobType: 'full-time',
      workMode: 'hybrid',
      experienceLevel: 'mid',
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterUser._id,
      applicationDeadline: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days in past
    });

    // Unapproved job
    const unapprovedJob = await Job.create({
      title: 'QA Engineer (Pending Review)',
      company: 'AppTest Tech Solutions',
      description: 'Job listing awaiting administrator approval.',
      location: 'Remote',
      jobType: 'full-time',
      workMode: 'remote',
      experienceLevel: 'entry',
      status: JOB_STATUS.ACTIVE,
      isApproved: false,
      recruiter: recruiterUser._id,
    });

    // Draft job
    const draftJob = await Job.create({
      title: 'Security Analyst (Draft)',
      company: 'AppTest Tech Solutions',
      description: 'Draft job not yet published.',
      location: 'Remote',
      jobType: 'full-time',
      workMode: 'remote',
      experienceLevel: 'senior',
      status: JOB_STATUS.DRAFT,
      isApproved: true,
      recruiter: recruiterUser._id,
    });

    // =============================================================
    // TEST GROUP 1: Successful Job Application Submission
    // =============================================================
    console.log('[Test Group 1] Successful Job Application Submission:');

    const validApplicationRes = await request(app)
      .post(`/api/jobs/${activeJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({
        coverLetter: 'I am excited to apply for this Senior Full Stack Engineer role. I bring 6 years of experience.',
      });

    assert(validApplicationRes.status === 201, 'Valid application returns 201 Created');
    assert(validApplicationRes.body.success === true, 'Response indicates success: true');
    assert(validApplicationRes.body.data?.application?._id !== undefined, 'Response includes application ID');
    assert(validApplicationRes.body.data.application.status === APPLICATION_STATUS.PENDING, 'Default status is pending');
    assert(validApplicationRes.body.data.application.coverLetter.includes('Senior Full Stack'), 'Cover letter preserved');
    assert(validApplicationRes.body.data.application.createdAt !== undefined, 'Application contains createdAt timestamp');
    assert(validApplicationRes.body.data.application.updatedAt !== undefined, 'Application contains updatedAt timestamp');

    // Immutable Resume Snapshot verification
    const snapshot = validApplicationRes.body.data.application.resume;
    assert(snapshot !== undefined, 'Application contains immutable resume snapshot');
    assert(snapshot.filename === 'Bob_Resume_2026.pdf', 'Snapshot stores correct resume filename');
    assert(snapshot.storageKey === 'resumes/mock_storage_key_bob_123.pdf', 'Snapshot stores storageKey');
    assert(snapshot.mimeType === 'application/pdf', 'Snapshot stores mimeType');
    assert(snapshot.storageProvider === 'local', 'Snapshot stores storageProvider');

    // Verify snapshot immutability: update candidate profile resume and ensure application record is unchanged
    await User.findByIdAndUpdate(candidateWithResume._id, {
      'resume.filename': 'Bob_Updated_Resume_2027.docx',
      'resume.storageKey': 'resumes/new_storage_key_2027.docx',
    });

    const persistedApp = await Application.findById(validApplicationRes.body.data.application._id);
    assert(persistedApp.resume.filename === 'Bob_Resume_2026.pdf', 'Past application preserves immutable resume filename');
    assert(persistedApp.resume.storageKey === 'resumes/mock_storage_key_bob_123.pdf', 'Past application preserves immutable storageKey');

    // =============================================================
    // TEST GROUP 2: Duplicate Application Prevention (Sequential & Concurrent)
    // =============================================================
    console.log('\n[Test Group 2] Duplicate Application Prevention:');

    // Sequential duplicate attempt
    const duplicateRes = await request(app)
      .post(`/api/jobs/${activeJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({
        coverLetter: 'Second application attempt for the same job',
      });

    assert(duplicateRes.status === 409, 'Sequential duplicate application returns 409 Conflict');
    assert(duplicateRes.body.success === false, 'Duplicate response indicates success: false');
    assert(
      duplicateRes.body.message.toLowerCase().includes('already applied'),
      'Conflict message explains user has already applied'
    );

    // Verify database still contains exactly 1 application for candidate + job
    const count = await Application.countDocuments({
      candidate: candidateWithResume._id,
      job: activeJob._id,
    });
    assert(count === 1, 'Database strictly contains only 1 application record');

    // Concurrent duplicate requests (simulate race condition with Diana)
    console.log('\n[Test Group 2b] Concurrent Duplicate Requests Handling:');
    const [concurrentRes1, concurrentRes2] = await Promise.all([
      request(app)
        .post(`/api/jobs/${activeJob._id}/applications`)
        .set('Authorization', `Bearer ${tokenSecondCandidate}`)
        .send({ coverLetter: 'Concurrent applicant 1' }),
      request(app)
        .post(`/api/jobs/${activeJob._id}/applications`)
        .set('Authorization', `Bearer ${tokenSecondCandidate}`)
        .send({ coverLetter: 'Concurrent applicant 2' }),
    ]);

    const statuses = [concurrentRes1.status, concurrentRes2.status].sort();
    assert(
      statuses[0] === 201 && statuses[1] === 409,
      'Concurrent duplicate requests safely resolve to exactly one 201 Created and one 409 Conflict'
    );

    const dianaAppCount = await Application.countDocuments({
      candidate: secondCandidate._id,
      job: activeJob._id,
    });
    assert(dianaAppCount === 1, 'Compound unique index prevented race-condition duplicate in database');

    // =============================================================
    // TEST GROUP 3: Job Status & Eligibility Boundaries
    // =============================================================
    console.log('\n[Test Group 3] Job Status & Eligibility Boundaries:');

    // 1. Closed job
    const closedJobRes = await request(app)
      .post(`/api/jobs/${closedJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send();

    assert(closedJobRes.status === 400, 'Applying to closed job returns 400 Bad Request');
    assert(
      closedJobRes.body.message.toLowerCase().includes('closed'),
      'Error message identifies closed job status'
    );

    // 2. Expired deadline job
    const expiredJobRes = await request(app)
      .post(`/api/jobs/${expiredJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send();

    assert(expiredJobRes.status === 400, 'Applying to job with expired deadline returns 400 Bad Request');
    assert(
      expiredJobRes.body.message &&
        expiredJobRes.body.message.toLowerCase().includes('deadline') &&
        expiredJobRes.body.message.toLowerCase().includes('passed'),
      'Error message identifies passed deadline'
    );

    // 3. Unapproved job
    const unapprovedJobRes = await request(app)
      .post(`/api/jobs/${unapprovedJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send();

    assert(unapprovedJobRes.status === 400, 'Applying to unapproved job returns 400 Bad Request');
    assert(
      unapprovedJobRes.body.message.toLowerCase().includes('not approved'),
      'Error message identifies unapproved status'
    );

    // 4. Draft job
    const draftJobRes = await request(app)
      .post(`/api/jobs/${draftJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send();

    assert(draftJobRes.status === 400, 'Applying to draft job returns 400 Bad Request');

    // 5. Non-existent job
    const nonExistentId = '666666666666666666666666';
    const notFoundRes = await request(app)
      .post(`/api/jobs/${nonExistentId}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send();

    assert(notFoundRes.status === 404, 'Applying to non-existent job returns 404 Not Found');

    // 6. Invalid Job ID format
    const invalidIdRes = await request(app)
      .post('/api/jobs/not-a-valid-object-id/applications')
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send();

    assert(invalidIdRes.status === 400, 'Applying with invalid job ID format returns 400 Bad Request');

    // =============================================================
    // TEST GROUP 4: Missing Resume Validation
    // =============================================================
    console.log('\n[Test Group 4] Missing Resume Validation:');

    // Create a new fresh active job for Charlie
    const freshJob = await Job.create({
      title: 'Junior QA Analyst',
      company: 'AppTest Tech Solutions',
      description: 'Entry level testing role.',
      location: 'Remote',
      jobType: 'full-time',
      workMode: 'remote',
      experienceLevel: 'entry',
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterUser._id,
    });

    const noResumeRes = await request(app)
      .post(`/api/jobs/${freshJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenNoResume}`)
      .send({ coverLetter: 'I have no resume yet.' });

    assert(noResumeRes.status === 400, 'Candidate without uploaded resume receives 400 Bad Request');
    assert(
      noResumeRes.body.message.toLowerCase().includes('resume is required'),
      'Error message informs candidate to upload a resume first'
    );

    // =============================================================
    // TEST GROUP 5: Authorization, Roles & Impersonation Prevention
    // =============================================================
    console.log('\n[Test Group 5] Authorization, Roles & Impersonation Prevention:');

    // 1. Unauthenticated request
    const unauthRes = await request(app)
      .post(`/api/jobs/${freshJob._id}/applications`)
      .send();

    assert(unauthRes.status === 401, 'Unauthenticated application request returns 401 Unauthorized');

    // 2. Recruiter attempting to apply
    const recruiterApplyRes = await request(app)
      .post(`/api/jobs/${freshJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenRecruiter}`)
      .send();

    assert(recruiterApplyRes.status === 403, 'Recruiter account attempting to apply returns 403 Forbidden');

    // 3. Impersonation attempt: Candidate specifies another user ID in body
    const impersonationRes = await request(app)
      .post(`/api/jobs/${freshJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({
        candidateId: secondCandidate._id.toString(),
      });

    assert(impersonationRes.status === 403, 'Impersonation attempt specifying another candidate returns 403 Forbidden');
    assert(
      impersonationRes.body.message.toLowerCase().includes('another user'),
      'Error message identifies impersonation prohibition'
    );

    // =============================================================
    // TEST GROUP 6: Querying Submitted Applications & Recruiter View
    // =============================================================
    console.log('\n[Test Group 6] Querying Submitted Applications & Recruiter View:');

    // 1. Recruiter viewing applications for their own job
    const recruiterViewRes = await request(app)
      .get(`/api/jobs/${activeJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenRecruiter}`);

    assert(recruiterViewRes.status === 200, 'Owner recruiter viewing job applications returns 200 OK');
    assert(recruiterViewRes.body.count >= 2, 'Recruiter sees all candidates who applied to their job');
    assert(recruiterViewRes.body.data.applications[0].candidate.name !== undefined, 'Candidate info populated');

    // 2. Other recruiter trying to view applications for Rachel\'s job
    const otherRecruiterViewRes = await request(app)
      .get(`/api/jobs/${activeJob._id}/applications`)
      .set('Authorization', `Bearer ${tokenOtherRecruiter}`);

    assert(otherRecruiterViewRes.status === 403, 'Unrelated recruiter viewing job applications returns 403 Forbidden');

    // 3. Candidate checking their application status on a specific job
    const statusRes = await request(app)
      .get(`/api/jobs/${activeJob._id}/applications/status`)
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(statusRes.status === 200, 'Candidate checking job application status returns 200 OK');
    assert(statusRes.body.data.hasApplied === true, 'hasApplied is true for applied candidate');

    // 4. Candidate listing all their submitted applications
    const myAppsRes = await request(app)
      .get('/api/applications/me')
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(myAppsRes.status === 200, 'Candidate listing own applications returns 200 OK');
    assert(myAppsRes.body.data.applications.length >= 1, 'My applications list contains submitted job');
    assert(myAppsRes.body.data.applications[0].job.title !== undefined, 'Job info populated in my applications');

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    // Clean up
    await Application.deleteMany({});
    await Job.deleteMany({ company: { $regex: /AppTest/i } });
    await User.deleteMany({ email: { $regex: /@apptest\.local$/i } });
    await disconnectDB();
  }
}

runApplicationTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
