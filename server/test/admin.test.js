import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User, { USER_ROLES, ACCOUNT_STATUS } from '../src/models/user.model.js';
import Job, { JOB_STATUS, JOB_TYPES, WORK_MODES, EXPERIENCE_LEVELS } from '../src/models/job.model.js';
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

async function runAdminTests() {
  console.log('====================================================');
  console.log('       JobTrack - Administration Module Tests       ');
  console.log('====================================================\n');

  await connectDB();
  await Job.syncIndexes();
  await Application.syncIndexes();
  await User.syncIndexes();

  // Clean prior test artifacts
  await Application.deleteMany({});
  await Job.deleteMany({ company: { $regex: /AdminTest/i } });
  await User.deleteMany({ email: { $regex: /@(admintest\.local|jobtrack\.local)$/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    const primaryAdmin = await User.create({
      name: 'Super Admin Alpha',
      email: 'admin.alpha@admintest.local',
      password: 'AdminPassword123!',
      role: USER_ROLES.ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
    });

    const recruiterUser = await User.create({
      name: 'Roger Recruiter',
      email: 'roger.recruiter@admintest.local',
      password: 'RecruiterPass123!',
      role: USER_ROLES.RECRUITER,
      status: ACCOUNT_STATUS.ACTIVE,
    });

    const candidateUser = await User.create({
      name: 'Cathy Candidate',
      email: 'cathy.cand@admintest.local',
      password: 'CandidatePass123!',
      role: USER_ROLES.CANDIDATE,
      status: ACCOUNT_STATUS.ACTIVE,
      resume: {
        url: '/api/users/me/resume',
        filename: 'Cathy_Resume.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageProvider: 'local',
        storageKey: 'resumes/cathy_test_mock.pdf',
        uploadedAt: new Date(),
      },
    });

    const tokenAdmin = generateToken({ id: primaryAdmin._id, role: primaryAdmin.role });
    const tokenRecruiter = generateToken({ id: recruiterUser._id, role: recruiterUser.role });
    const tokenCandidate = generateToken({ id: candidateUser._id, role: candidateUser.role });

    // Seed test jobs
    const job1 = await Job.create({
      title: 'Senior Cloud Engineer',
      company: 'AdminTest CloudWorks',
      description: 'Lead AWS and Kubernetes cloud infrastructure.',
      responsibilities: ['Build Terraform modules'],
      requiredSkills: ['aws', 'kubernetes', 'terraform'],
      location: 'Austin, TX',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.SENIOR,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterUser._id,
    });

    const job2 = await Job.create({
      title: 'Junior Frontend Intern',
      company: 'AdminTest CloudWorks',
      description: 'Assist with React component development and tests.',
      location: 'Austin, TX',
      jobType: JOB_TYPES.INTERNSHIP,
      workMode: WORK_MODES.ON_SITE,
      experienceLevel: EXPERIENCE_LEVELS.ENTRY,
      status: JOB_STATUS.ACTIVE,
      isApproved: false, // Needs moderation
      recruiter: recruiterUser._id,
    });

    // Candidate applies to Job 1
    const app1 = await Application.create({
      candidate: candidateUser._id,
      job: job1._id,
      resume: candidateUser.resume,
      coverLetter: 'Interested in Cloud Engineering.',
      status: APPLICATION_STATUS.PENDING,
      statusHistory: [
        {
          status: APPLICATION_STATUS.PENDING,
          changedBy: candidateUser._id,
          changedByName: candidateUser.name,
          changedByRole: candidateUser.role,
          changedAt: new Date(),
          note: 'Application submitted',
        },
      ],
    });

    // =============================================================
    // TEST GROUP 1: Platform Overview Statistics (GET /api/admin/dashboard)
    // =============================================================
    console.log('[Test Group 1] Platform Overview Statistics:');

    // 1. Admin accesses dashboard
    const dashboardRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert(dashboardRes.status === 200, 'GET /api/admin/dashboard returns 200 OK for admin');
    assert(dashboardRes.body.data.overview !== undefined, 'Dashboard contains overview block');
    assert(dashboardRes.body.data.overview.totalUsers >= 3, 'Overview reports total users');
    assert(dashboardRes.body.data.overview.totalJobs >= 2, 'Overview reports total jobs');
    assert(dashboardRes.body.data.overview.totalApplications >= 1, 'Overview reports total applications');
    assert(dashboardRes.body.data.users.byRole.admin >= 1, 'Users breakdown counts admin');
    assert(dashboardRes.body.data.users.byRole.recruiter >= 1, 'Users breakdown counts recruiter');
    assert(dashboardRes.body.data.users.byRole.candidate >= 1, 'Users breakdown counts candidate');
    assert(dashboardRes.body.data.jobs.moderation.approved >= 1, 'Jobs breakdown counts approved listings');
    assert(dashboardRes.body.data.jobs.moderation.pendingApproval >= 1, 'Jobs breakdown counts pending moderation');
    assert(Array.isArray(dashboardRes.body.data.recentUsers), 'Dashboard contains recentUsers array');

    // 2. Non-admin access control
    const recruiterDashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${tokenRecruiter}`);
    assert(recruiterDashRes.status === 403, 'Recruiter accessing admin dashboard yields 403 Forbidden');

    const candidateDashRes = await request(app)
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${tokenCandidate}`);
    assert(candidateDashRes.status === 403, 'Candidate accessing admin dashboard yields 403 Forbidden');

    const unauthDashRes = await request(app).get('/api/admin/dashboard');
    assert(unauthDashRes.status === 401, 'Unauthenticated accessing admin dashboard yields 401 Unauthorized');

    // =============================================================
    // TEST GROUP 2: User Search, Pagination & Password Protection (GET /api/admin/users)
    // =============================================================
    console.log('\n[Test Group 2] User Search, Pagination & Security:');

    // 1. Admin lists users
    const usersRes = await request(app)
      .get('/api/admin/users?limit=10&page=1')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert(usersRes.status === 200, 'GET /api/admin/users returns 200 OK');
    assert(Array.isArray(usersRes.body.data.users), 'Response contains users array');
    assert(usersRes.body.data.pagination.total >= 3, 'Pagination metadata tracks total users');

    // 2. SECURITY CHECK: Password and passwordHash MUST NOT be exposed
    for (const u of usersRes.body.data.users) {
      assert(u.password === undefined, 'User object does NOT leak plaintext password');
      assert(u.passwordHash === undefined, 'User object does NOT leak passwordHash');
    }

    // 3. Filter by role
    const recruitersOnlyRes = await request(app)
      .get('/api/admin/users?role=recruiter')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert(recruitersOnlyRes.status === 200, 'Filter by role=recruiter returns 200 OK');
    for (const u of recruitersOnlyRes.body.data.users) {
      assert(u.role === 'recruiter', 'All returned users have role recruiter');
    }

    // 4. Search by name or email
    const searchRes = await request(app)
      .get('/api/admin/users?search=Cathy')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert(searchRes.status === 200, 'Search by user name returns 200 OK');
    assert(searchRes.body.data.users.length === 1, 'Search finds exactly Cathy');
    assert(searchRes.body.data.users[0].name === 'Cathy Candidate', 'Correct user returned');
    assert(
      searchRes.body.data.users[0].applicationsSubmittedCount === 1,
      'Cathy has enriched applicationsSubmittedCount = 1'
    );

    // =============================================================
    // TEST GROUP 3: Account Status Management & Last Admin Safeguard (PATCH /api/admin/users/:id/status)
    // =============================================================
    console.log('\n[Test Group 3] Account Status Management & Safeguards:');

    // 1. Admin disables candidate account
    const disableCandidateRes = await request(app)
      .patch(`/api/admin/users/${candidateUser._id}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'disabled', reason: 'Violation of platform terms' });

    assert(disableCandidateRes.status === 200, 'Admin disabling candidate account returns 200 OK');
    assert(disableCandidateRes.body.data.user.status === 'disabled', 'Candidate status updated to disabled');
    assert(disableCandidateRes.body.data.user.disabledReason === 'Violation of platform terms', 'Reason recorded');

    // 2. ENFORCEMENT: Disabled candidate is blocked from protected actions
    const disabledActionRes = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(disabledActionRes.status === 403, 'Disabled account performing action yields 403 Forbidden');
    assert(
      disabledActionRes.body.message.toLowerCase().includes('disabled'),
      'Error message informs user account is disabled'
    );

    // 3. Admin reactivates candidate account
    const reactivateCandidateRes = await request(app)
      .patch(`/api/admin/users/${candidateUser._id}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'active' });

    assert(reactivateCandidateRes.status === 200, 'Admin reactivating account returns 200 OK');
    assert(reactivateCandidateRes.body.data.user.status === 'active', 'Candidate status restored to active');

    // 4. Reactivated candidate can perform actions again
    const restoredActionRes = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${tokenCandidate}`);
    assert(restoredActionRes.status === 200, 'Reactivated user can access protected APIs again');

    // 5. CRITICAL SAFEGUARD: Never permit disabling the last active administrator
    const disableLastAdminRes = await request(app)
      .patch(`/api/admin/users/${primaryAdmin._id}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'disabled', reason: 'Accidental self disable' });

    assert(
      disableLastAdminRes.status === 400,
      'Disabling last active administrator yields 400 Bad Request'
    );
    assert(
      disableLastAdminRes.body.message.toLowerCase().includes('last active administrator'),
      'Error message identifies safeguard against disabling last admin'
    );

    // Verify last admin is still active
    const adminCheck = await User.findById(primaryAdmin._id);
    assert(adminCheck.status === 'active', 'Last administrator remains active');

    // 6. Test with multiple admins: when 2 active admins exist, disabling one succeeds
    const secondAdmin = await User.create({
      name: 'Super Admin Beta',
      email: 'admin.beta@admintest.local',
      password: 'AdminPasswordBeta123!',
      role: USER_ROLES.ADMIN,
      status: ACCOUNT_STATUS.ACTIVE,
    });

    const disableSecondAdminRes = await request(app)
      .patch(`/api/admin/users/${secondAdmin._id}/status`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({ status: 'disabled', reason: 'Redundant admin' });

    assert(
      disableSecondAdminRes.status === 200,
      'Disabling admin when another active admin exists returns 200 OK'
    );
    assert(disableSecondAdminRes.body.data.user.status === 'disabled', 'Second admin disabled successfully');

    // =============================================================
    // TEST GROUP 4: Job Review & Moderation (GET /api/admin/jobs & PATCH /api/admin/jobs/:id/moderation)
    // =============================================================
    console.log('\n[Test Group 4] Job Review & Moderation:');

    // 1. Admin lists all jobs across all recruiters
    const adminJobsRes = await request(app)
      .get('/api/admin/jobs')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert(adminJobsRes.status === 200, 'GET /api/admin/jobs returns 200 OK');
    assert(adminJobsRes.body.data.jobs.length >= 2, 'Admin sees all jobs across recruiters');
    const cloudJob = adminJobsRes.body.data.jobs.find((j) => j._id.toString() === job1._id.toString());
    assert(cloudJob !== undefined, 'Job 1 present');
    assert(cloudJob.applicationsCount === 1, 'Job 1 applicationsCount is accurately aggregated');

    // 2. Filter unapproved / pending moderation jobs
    const unapprovedJobsRes = await request(app)
      .get('/api/admin/jobs?isApproved=false&search=AdminTest')
      .set('Authorization', `Bearer ${tokenAdmin}`);

    assert(unapprovedJobsRes.status === 200, 'Filter isApproved=false returns 200 OK');
    assert(unapprovedJobsRes.body.data.jobs.length === 1, 'Only 1 unapproved job returned for AdminTest');
    assert(unapprovedJobsRes.body.data.jobs[0].title === 'Junior Frontend Intern', 'Correct unapproved job returned');

    // 3. Candidate public job search: unapproved jobs are HIDDEN from public
    const publicJobsRes = await request(app).get('/api/jobs');
    const publicTitles = publicJobsRes.body.data.jobs.map((j) => j.title);
    assert(!publicTitles.includes('Junior Frontend Intern'), 'Unapproved job is hidden from public job board');

    // 4. Admin approves the unapproved job
    const approveRes = await request(app)
      .patch(`/api/admin/jobs/${job2._id}/moderation`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        isApproved: true,
        moderationNote: 'Verified company legitimacy and job details.',
      });

    assert(approveRes.status === 200, 'Admin approves job returns 200 OK');
    assert(approveRes.body.data.job.isApproved === true, 'isApproved is now true');
    assert(
      approveRes.body.data.job.moderationNote.includes('Verified company'),
      'Moderation note recorded'
    );

    // 5. Candidate public job search: approved job now appears on public job board
    const postApprovePublicRes = await request(app).get('/api/jobs');
    const postApproveTitles = postApprovePublicRes.body.data.jobs.map((j) => j.title);
    assert(postApproveTitles.includes('Junior Frontend Intern'), 'Newly approved job is now publicly discoverable');

    // 6. Admin rejects a job listing
    const rejectJobRes = await request(app)
      .patch(`/api/admin/jobs/${job2._id}/moderation`)
      .set('Authorization', `Bearer ${tokenAdmin}`)
      .send({
        isApproved: false,
        status: 'closed',
        moderationNote: 'Job reported for misleading requirements.',
      });

    assert(rejectJobRes.status === 200, 'Admin moderates job to unapproved returns 200 OK');
    assert(rejectJobRes.body.data.job.isApproved === false, 'Job isApproved updated to false');
    assert(rejectJobRes.body.data.job.status === 'closed', 'Job status updated to closed');

    // 7. Non-admin moderation attempt yields 403 Forbidden
    const recruiterModRes = await request(app)
      .patch(`/api/admin/jobs/${job2._id}/moderation`)
      .set('Authorization', `Bearer ${tokenRecruiter}`)
      .send({ isApproved: true });
    assert(recruiterModRes.status === 403, 'Recruiter attempting job moderation yields 403 Forbidden');

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('====================================================');
  } finally {
    await Application.deleteMany({});
    await Job.deleteMany({ company: { $regex: /AdminTest/i } });
    await User.deleteMany({ email: { $regex: /@(admintest\.local|jobtrack\.local)$/i } });
    await disconnectDB();
  }
}

runAdminTests().catch((err) => {
  console.error('Admin test suite failed:', err);
  process.exit(1);
});
