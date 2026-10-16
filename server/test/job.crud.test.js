import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import mongoose from 'mongoose';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Job, { JOB_STATUS, JOB_TYPES, WORK_MODES, EXPERIENCE_LEVELS } from '../src/models/job.model.js';
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

async function runJobCrudTests() {
  console.log('====================================================');
  console.log('   JobTrack - Job Management & Access Control Tests ');
  console.log('====================================================\n');

  await connectDB();
  await Job.syncIndexes();

  // Clean up prior test runs
  await User.deleteMany({ email: { $regex: /@jobtest\.local$/i } });
  await Job.deleteMany({ company: { $regex: /^JobTest/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    const recruiterA = await User.create({
      name: 'Recruiter Alpha',
      email: 'recruiter.alpha@jobtest.local',
      password: 'RecruiterAlpha123!',
      role: 'recruiter',
      status: 'active',
    });

    const recruiterB = await User.create({
      name: 'Recruiter Beta',
      email: 'recruiter.beta@jobtest.local',
      password: 'RecruiterBeta123!',
      role: 'recruiter',
      status: 'active',
    });

    const candidate = await User.create({
      name: 'Charlie Candidate',
      email: 'charlie.cand@jobtest.local',
      password: 'CharliePass123!',
      role: 'candidate',
      status: 'active',
    });

    const admin = await User.create({
      name: 'Admin Boss',
      email: 'admin.boss@jobtest.local',
      password: 'AdminBossPass123!',
      role: 'admin',
      status: 'active',
    });

    const tokenRecruiterA = generateToken({ id: recruiterA._id, role: recruiterA.role });
    const tokenRecruiterB = generateToken({ id: recruiterB._id, role: recruiterB.role });
    const tokenCandidate = generateToken({ id: candidate._id, role: candidate.role });
    const tokenAdmin = generateToken({ id: admin._id, role: admin.role });

    // Seed test jobs directly for visibility tests
    const activeJobA = await Job.create({
      title: 'Senior React Developer',
      company: 'JobTest Tech A',
      description: 'Looking for a skilled senior react developer to join our team.',
      responsibilities: ['Build features', 'Review PRs'],
      requiredSkills: ['react', 'typescript', 'tailwind'],
      location: 'San Francisco, CA',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.SENIOR,
      salary: { min: 140000, max: 180000, currency: 'USD', period: 'yearly' },
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterA._id,
    });

    const draftJobA = await Job.create({
      title: 'Confidential Backend Lead',
      company: 'JobTest Tech A',
      description: 'Confidential draft search for backend infrastructure lead.',
      location: 'New York, NY',
      jobType: JOB_TYPES.CONTRACT,
      workMode: WORK_MODES.HYBRID,
      experienceLevel: EXPERIENCE_LEVELS.LEAD,
      status: JOB_STATUS.DRAFT,
      isApproved: true,
      recruiter: recruiterA._id,
    });

    const unapprovedJobA = await Job.create({
      title: 'Pending AI Engineer',
      company: 'JobTest Tech A',
      description: 'Needs admin review before going public.',
      location: 'Austin, TX',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.ON_SITE,
      experienceLevel: EXPERIENCE_LEVELS.MID,
      status: JOB_STATUS.ACTIVE,
      isApproved: false,
      recruiter: recruiterA._id,
    });

    // =============================================================
    // [Test Group 1] Public Visibility Restrictions
    // =============================================================
    console.log('[Test Group 1] Public Job Visibility Restrictions:');

    // 1.1 Public GET /api/jobs
    const publicListRes = await request(app).get('/api/jobs');
    assert(publicListRes.status === 200, 'Public GET /api/jobs returns 200 OK');
    const publicJobs = publicListRes.body.data.jobs;
    const containsActive = publicJobs.some((j) => j._id.toString() === activeJobA._id.toString());
    const containsDraft = publicJobs.some((j) => j._id.toString() === draftJobA._id.toString());
    const containsUnapproved = publicJobs.some((j) => j._id.toString() === unapprovedJobA._id.toString());
    assert(containsActive === true, 'Public listing includes active, approved job');
    assert(containsDraft === false, 'Public listing excludes draft job');
    assert(containsUnapproved === false, 'Public listing excludes unapproved job');

    // 1.2 Candidate GET /api/jobs
    const candidateListRes = await request(app)
      .get('/api/jobs')
      .set('Authorization', `Bearer ${tokenCandidate}`);
    assert(candidateListRes.status === 200, 'Candidate GET /api/jobs returns 200 OK');
    const candJobs = candidateListRes.body.data.jobs;
    assert(candJobs.some((j) => j._id.toString() === draftJobA._id.toString()) === false, 'Candidate cannot see draft jobs in public list');

    // 1.3 Public GET /api/jobs/:id (Active Job)
    const publicActiveDetail = await request(app).get(`/api/jobs/${activeJobA._id}`);
    assert(publicActiveDetail.status === 200, 'Public GET /api/jobs/:id for active job returns 200 OK');
    assert(publicActiveDetail.body.data.job.title === 'Senior React Developer', 'Returns job details correctly');

    // 1.4 Public GET /api/jobs/:id (Draft Job -> 404)
    const publicDraftDetail = await request(app).get(`/api/jobs/${draftJobA._id}`);
    assert(publicDraftDetail.status === 404, 'Public GET /api/jobs/:id for draft job returns 404 Not Found');

    // 1.5 Candidate GET /api/jobs/:id (Draft Job -> 404)
    const candDraftDetail = await request(app)
      .get(`/api/jobs/${draftJobA._id}`)
      .set('Authorization', `Bearer ${tokenCandidate}`);
    assert(candDraftDetail.status === 404, 'Candidate GET /api/jobs/:id for draft job returns 404 Not Found');

    // 1.6 Owner Recruiter GET /api/jobs/:id (Draft Job -> 200)
    const ownerDraftDetail = await request(app)
      .get(`/api/jobs/${draftJobA._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`);
    assert(ownerDraftDetail.status === 200, 'Owner recruiter GET /api/jobs/:id for draft job returns 200 OK');

    // 1.7 Non-owner Recruiter GET /api/jobs/:id (Draft Job -> 404)
    const otherRecruiterDraftDetail = await request(app)
      .get(`/api/jobs/${draftJobA._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`);
    assert(otherRecruiterDraftDetail.status === 404, 'Other recruiter GET /api/jobs/:id for draft job returns 404 Not Found');

    // =============================================================
    // [Test Group 2] Job Creation & Role Restrictions
    // =============================================================
    console.log('\n[Test Group 2] Job Creation & Role Authorization:');

    const validNewJob = {
      title: 'Full Stack Engineer',
      company: 'JobTest Tech A',
      description: 'Exciting role building cloud-scale microservices and sleek frontends.',
      responsibilities: ['Architect scalable APIs', 'Collaborate with UX designers'],
      requiredSkills: ['node.js', 'react', 'mongodb'],
      location: 'Remote',
      jobType: 'full-time',
      workMode: 'remote',
      experienceLevel: 'mid',
      salary: {
        min: 110000,
        max: 135000,
        currency: 'USD',
        period: 'yearly',
      },
    };

    // 2.1 Unauthenticated creation yields 401
    const unauthCreate = await request(app).post('/api/jobs').send(validNewJob);
    assert(unauthCreate.status === 401, 'Unauthenticated POST /api/jobs yields 401 Unauthorized');

    // 2.2 Candidate creation yields 403
    const candidateCreate = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send(validNewJob);
    assert(candidateCreate.status === 403, 'Candidate POST /api/jobs yields 403 Forbidden');
    assert(candidateCreate.body.message.includes('Candidates cannot create or manage recruiter job listings'), 'Clear error explaining candidate role boundary');

    // 2.3 Recruiter creation succeeds (201 Created)
    const recruiterCreate = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send(validNewJob);
    assert(recruiterCreate.status === 201, 'Recruiter POST /api/jobs yields 201 Created');
    assert(recruiterCreate.body.success === true, 'Response indicates success: true');
    const createdJob = recruiterCreate.body.data.job;
    assert(createdJob.title === 'Full Stack Engineer', 'Job title correctly saved');
    assert(createdJob.recruiter._id.toString() === recruiterA._id.toString(), 'Job recruiter automatically assigned from auth token');
    assert(createdJob.status === 'active', 'Job status defaults to active');
    assert(createdJob.isApproved === true, 'Job isApproved defaults to true');

    // =============================================================
    // [Test Group 3] Mass Assignment Prevention
    // =============================================================
    console.log('\n[Test Group 3] Mass Assignment Prevention:');

    // 3.1 Attempting to set recruiter to another user
    const massAssignRecruiter = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({
        ...validNewJob,
        title: 'Spoofed Recruiter Job',
        recruiter: recruiterB._id.toString(),
      });
    assert(massAssignRecruiter.status === 403, 'Attempting to inject recruiter in body yields 403 Forbidden');
    assert(massAssignRecruiter.body.message.includes("Protected field 'recruiter'"), 'Clear message rejecting protected recruiter field');

    // 3.2 Attempting to inject _id in creation
    const massAssignId = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({
        ...validNewJob,
        title: 'Injected ID Job',
        _id: new mongoose.Types.ObjectId().toString(),
      });
    assert(massAssignId.status === 403, 'Attempting to inject _id yields 403 Forbidden');

    // 3.3 Attempting to inject recruiter in update
    const massAssignUpdate = await request(app)
      .patch(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({
        recruiter: recruiterB._id.toString(),
      });
    assert(massAssignUpdate.status === 403, 'Attempting to overwrite recruiter in update yields 403 Forbidden');

    // =============================================================
    // [Test Group 4] Input Validation Failures
    // =============================================================
    console.log('\n[Test Group 4] Input Validation Failures:');

    // 4.1 Missing required title
    const missingTitle = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ ...validNewJob, title: '' });
    assert(missingTitle.status === 400, 'Missing title yields 400 Bad Request');

    // 4.2 Invalid jobType
    const invalidJobType = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ ...validNewJob, jobType: 'gargantuan-time' });
    assert(invalidJobType.status === 400, 'Invalid jobType yields 400 Bad Request');

    // 4.3 Invalid workMode
    const invalidWorkMode = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ ...validNewJob, workMode: 'telepathic' });
    assert(invalidWorkMode.status === 400, 'Invalid workMode yields 400 Bad Request');

    // 4.4 Salary min > max
    const invertedSalary = await request(app)
      .post('/api/jobs')
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({
        ...validNewJob,
        salary: { min: 200000, max: 100000 },
      });
    assert(invertedSalary.status === 400, 'Salary min > max yields 400 Bad Request');

    // 4.5 Malformed Job ObjectId
    const malformedId = await request(app)
      .get('/api/jobs/not-an-objectid')
      .set('Authorization', `Bearer ${tokenRecruiterA}`);
    assert(malformedId.status === 400, 'Malformed ObjectId in URL yields 400 Bad Request');

    // =============================================================
    // [Test Group 5] Resource Ownership Enforcement
    // =============================================================
    console.log('\n[Test Group 5] Resource Ownership Enforcement:');

    // 5.1 Recruiter B attempts to update Recruiter A's job
    const nonOwnerUpdate = await request(app)
      .patch(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`)
      .send({ title: 'Hacked Title by Recruiter B' });
    assert(nonOwnerUpdate.status === 403, 'Non-owner recruiter updating job yields 403 Forbidden');
    assert(nonOwnerUpdate.body.message.includes('permission to modify or delete this job'), 'Reports ownership access denied');

    // Verify title was not changed
    const verifyUnchanged = await Job.findById(createdJob._id);
    assert(verifyUnchanged.title === 'Full Stack Engineer', 'Database confirms job was not modified by non-owner');

    // 5.2 Recruiter B attempts to delete Recruiter A's job
    const nonOwnerDelete = await request(app)
      .delete(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`);
    assert(nonOwnerDelete.status === 403, 'Non-owner recruiter deleting job yields 403 Forbidden');

    // 5.3 Candidate attempts to update job
    const candidateUpdate = await request(app)
      .patch(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({ title: 'Candidate update' });
    assert(candidateUpdate.status === 403, 'Candidate updating job yields 403 Forbidden');

    // 5.4 Legitimate update by Owner Recruiter A
    const ownerUpdate = await request(app)
      .patch(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({
        title: 'Senior Full Stack Engineer (Node/React)',
        location: 'San Francisco, CA (Hybrid)',
        workMode: 'hybrid',
      });
    assert(ownerUpdate.status === 200, 'Owner updating own job yields 200 OK');
    assert(ownerUpdate.body.data.job.title === 'Senior Full Stack Engineer (Node/React)', 'Updated title saved');
    assert(ownerUpdate.body.data.job.workMode === 'hybrid', 'Updated workMode saved');

    // 5.5 Admin override update
    const adminUpdate = await request(app)
      .patch(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ title: 'Admin Approved - Senior Full Stack Engineer' });
    assert(adminUpdate.status === 200, 'Admin updating job yields 200 OK');

    // =============================================================
    // [Test Group 6] Job Status Transitions
    // =============================================================
    console.log('\n[Test Group 6] Job Status Transitions:');

    // 6.1 Non-owner status update yields 403
    const nonOwnerStatus = await request(app)
      .patch(`/api/jobs/${createdJob._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`)
      .send({ status: 'closed' });
    assert(nonOwnerStatus.status === 403, 'Non-owner updating job status yields 403 Forbidden');

    // 6.2 Owner updates status active -> closed
    const closeJob = await request(app)
      .patch(`/api/jobs/${createdJob._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'closed' });
    assert(closeJob.status === 200, 'Transition active -> closed yields 200 OK');
    assert(closeJob.body.data.job.status === 'closed', 'Status updated to closed');

    // 6.3 Re-opening closed -> active
    const reopenJob = await request(app)
      .patch(`/api/jobs/${createdJob._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'active' });
    assert(reopenJob.status === 200, 'Transition closed -> active yields 200 OK');
    assert(reopenJob.body.data.job.status === 'active', 'Status reopened to active');

    // 6.4 Invalid transition (e.g. invalid status string)
    const invalidStatus = await request(app)
      .patch(`/api/jobs/${createdJob._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'non_existent_status' });
    assert(invalidStatus.status === 400, 'Invalid status string yields 400 Bad Request');

    // =============================================================
    // [Test Group 7] Job Deletion
    // =============================================================
    console.log('\n[Test Group 7] Job Deletion:');

    const deleteRes = await request(app)
      .delete(`/api/jobs/${createdJob._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`);
    assert(deleteRes.status === 200, 'Owner deleting job yields 200 OK');
    assert(deleteRes.body.success === true, 'Response indicates success: true');

    // Verify job no longer exists
    const checkDeleted = await request(app).get(`/api/jobs/${createdJob._id}`);
    assert(checkDeleted.status === 404, 'Subsequent GET on deleted job yields 404 Not Found');

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    // Clean up test data
    await User.deleteMany({ email: { $regex: /@jobtest\.local$/i } });
    await Job.deleteMany({ company: { $regex: /^JobTest/i } });
    await disconnectDB();
  }
}

runJobCrudTests().catch((err) => {
  console.error('\nTest Suite Failed:', err);
  process.exit(1);
});
