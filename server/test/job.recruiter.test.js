import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
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

async function runRecruiterDashboardTests() {
  console.log('====================================================');
  console.log('    JobTrack - Recruiter Dashboard & Security Tests ');
  console.log('====================================================\n');

  await connectDB();
  await Job.syncIndexes();
  await Application.syncIndexes();

  // Cleanup test data
  await Application.deleteMany({});
  await Job.deleteMany({ company: { $regex: /RecruiterTest/i } });
  await User.deleteMany({ email: { $regex: /@recruitertest\.local$/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Users
    // -------------------------------------------------------------
    const recruiterA = await User.create({
      name: 'Alice Recruiter',
      email: 'alice.recruiter@recruitertest.local',
      password: 'RecruiterPassword123!',
      role: 'recruiter',
      status: 'active',
    });

    const recruiterB = await User.create({
      name: 'Bob Recruiter',
      email: 'bob.recruiter@recruitertest.local',
      password: 'RecruiterPassword123!',
      role: 'recruiter',
      status: 'active',
    });

    const candidate = await User.create({
      name: 'Carol Candidate',
      email: 'carol.cand@recruitertest.local',
      password: 'CandidatePassword123!',
      role: 'candidate',
      status: 'active',
      resume: {
        url: '/api/users/me/resume',
        filename: 'Carol_Resume.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
        storageProvider: 'local',
        storageKey: 'resumes/carol_resume_mock.pdf',
        uploadedAt: new Date(),
      },
    });

    const tokenRecruiterA = generateToken({ id: recruiterA._id, role: recruiterA.role });
    const tokenRecruiterB = generateToken({ id: recruiterB._id, role: recruiterB.role });
    const tokenCandidate = generateToken({ id: candidate._id, role: candidate.role });

    // -------------------------------------------------------------
    // Recruiter A creates jobs
    // -------------------------------------------------------------
    const jobA1 = await Job.create({
      title: 'Senior Frontend Engineer',
      company: 'RecruiterTest Corp',
      description: 'Senior react developer to lead modern web UI initiatives.',
      responsibilities: ['Build UI', 'Mentor juniors'],
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

    const jobA2 = await Job.create({
      title: 'DevOps Specialist',
      company: 'RecruiterTest Corp',
      description: 'Kubernetes, AWS, CI/CD pipeline management.',
      responsibilities: ['Deploy microservices'],
      requiredSkills: ['kubernetes', 'aws', 'docker'],
      location: 'Remote',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.MID,
      status: JOB_STATUS.CLOSED,
      isApproved: true,
      recruiter: recruiterA._id,
    });

    // Recruiter B creates a job
    const jobB1 = await Job.create({
      title: 'Marketing Specialist',
      company: 'RecruiterTest Beta',
      description: 'Growth and demand generation lead.',
      location: 'New York, NY',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.ON_SITE,
      experienceLevel: EXPERIENCE_LEVELS.MID,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterB._id,
    });

    // Candidate applies to Job A1
    const appA1 = await Application.create({
      candidate: candidate._id,
      job: jobA1._id,
      resume: candidate.resume,
      coverLetter: 'I am very excited to apply for this Senior Frontend Engineer position.',
      status: APPLICATION_STATUS.PENDING,
      statusHistory: [
        {
          status: APPLICATION_STATUS.PENDING,
          changedBy: candidate._id,
          changedByName: candidate.name,
          changedByRole: candidate.role,
          changedAt: new Date(),
          note: 'Application submitted',
        },
      ],
    });

    // =============================================================
    // TEST GROUP 1: Recruiter Overview API (GET /api/jobs/recruiter/overview)
    // =============================================================
    console.log('[Test Group 1] Recruiter Overview API:');

    // 1. Recruiter A overview
    const overviewResA = await request(app)
      .get('/api/jobs/recruiter/overview')
      .set('Authorization', `Bearer ${tokenRecruiterA}`);

    assert(overviewResA.status === 200, 'GET /api/jobs/recruiter/overview returns 200 OK');
    assert(overviewResA.body.data.overview.totalJobs === 2, 'Recruiter A totalJobs is 2');
    assert(overviewResA.body.data.overview.activeJobs === 1, 'Recruiter A activeJobs is 1');
    assert(overviewResA.body.data.overview.closedJobs === 1, 'Recruiter A closedJobs is 1');
    assert(overviewResA.body.data.overview.totalApplications === 1, 'Recruiter A totalApplications is 1');
    assert(overviewResA.body.data.overview.awaitingReview === 1, 'Recruiter A awaitingReview is 1 (pending)');
    assert(overviewResA.body.data.recentApplications.length === 1, 'Recent applications list contains the application');
    assert(
      overviewResA.body.data.recentApplications[0].candidate.name === 'Carol Candidate',
      'Recent application candidate name is populated'
    );

    // 2. Recruiter B overview is isolated (0 applications, 1 job)
    const overviewResB = await request(app)
      .get('/api/jobs/recruiter/overview')
      .set('Authorization', `Bearer ${tokenRecruiterB}`);

    assert(overviewResB.status === 200, 'Recruiter B overview returns 200 OK');
    assert(overviewResB.body.data.overview.totalJobs === 1, 'Recruiter B sees only their 1 job');
    assert(overviewResB.body.data.overview.totalApplications === 0, 'Recruiter B sees 0 applications');
    assert(overviewResB.body.data.recentApplications.length === 0, 'Recruiter B recent applications is empty');

    // 3. Candidate unauthorized to view recruiter overview yields 403 Forbidden
    const candidateOverviewRes = await request(app)
      .get('/api/jobs/recruiter/overview')
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(candidateOverviewRes.status === 403, 'Candidate accessing recruiter overview yields 403 Forbidden');

    // =============================================================
    // TEST GROUP 2: Recruiter Job Listings & Applications Count (GET /api/jobs?myJobs=true)
    // =============================================================
    console.log('\n[Test Group 2] Recruiter Job Listings & Live Counts:');

    const myListingsRes = await request(app)
      .get('/api/jobs?myJobs=true')
      .set('Authorization', `Bearer ${tokenRecruiterA}`);

    assert(myListingsRes.status === 200, 'GET /api/jobs?myJobs=true returns 200 OK');
    const returnedJobs = myListingsRes.body.data.jobs;
    assert(returnedJobs.length === 2, 'Recruiter A receives only their 2 jobs');

    const jobA1Returned = returnedJobs.find((j) => j._id.toString() === jobA1._id.toString());
    assert(jobA1Returned !== undefined, 'Job A1 present in recruiter listings');
    assert(jobA1Returned.applicationsCount === 1, 'Job A1 live applicationsCount is 1');
    assert(jobA1Returned.awaitingReviewCount === 1, 'Job A1 live awaitingReviewCount is 1');

    // Status filtering works for recruiter
    const activeOnlyRes = await request(app)
      .get('/api/jobs?myJobs=true&status=active')
      .set('Authorization', `Bearer ${tokenRecruiterA}`);
    assert(activeOnlyRes.status === 200, 'Filtering by active status returns 200 OK');
    assert(activeOnlyRes.body.data.jobs.length === 1, 'Only 1 active job returned');
    assert(activeOnlyRes.body.data.jobs[0].title === 'Senior Frontend Engineer', 'Correct active job returned');

    // =============================================================
    // TEST GROUP 3: Open & Close Job Listing (PATCH /api/jobs/:id/status)
    // =============================================================
    console.log('\n[Test Group 3] Open & Close Job Listing:');

    // Close Job A1
    const closeRes = await request(app)
      .patch(`/api/jobs/${jobA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'closed' });

    assert(closeRes.status === 200, 'Recruiter closes Job A1 successfully');
    assert(closeRes.body.data.job.status === 'closed', 'Job status is now closed');

    // Verify overview reflects closed job count
    const postCloseOverview = await request(app)
      .get('/api/jobs/recruiter/overview')
      .set('Authorization', `Bearer ${tokenRecruiterA}`);
    assert(postCloseOverview.body.data.overview.activeJobs === 0, 'Active jobs decreased to 0');
    assert(postCloseOverview.body.data.overview.closedJobs === 2, 'Closed jobs increased to 2');

    // Reopen Job A1
    const reopenRes = await request(app)
      .patch(`/api/jobs/${jobA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'active' });

    assert(reopenRes.status === 200, 'Recruiter reopens Job A1 successfully');
    assert(reopenRes.body.data.job.status === 'active', 'Job status is back to active');

    // =============================================================
    // TEST GROUP 4: Job Applicants & Hiring Stage Updates
    // =============================================================
    console.log('\n[Test Group 4] Job Applicants & Stage Updates:');

    // 1. Recruiter A views applicants for Job A1
    const applicantsRes = await request(app)
      .get(`/api/jobs/${jobA1._id}/applications`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`);

    assert(applicantsRes.status === 200, 'Recruiter A fetches Job A1 applicants returns 200 OK');
    assert(applicantsRes.body.data.applications.length === 1, '1 application found');
    assert(applicantsRes.body.data.applications[0].candidate.name === 'Carol Candidate', 'Candidate details populated');

    // 2. Recruiter A updates candidate stage to 'shortlisted'
    const stageUpdateRes = await request(app)
      .patch(`/api/applications/${appA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'shortlisted' });

    assert(stageUpdateRes.status === 200, 'Recruiter updates stage returns 200 OK');
    assert(stageUpdateRes.body.data.application.status === 'shortlisted', 'Status changed to shortlisted');

    // 3. Awaiting review counter updates (shortlisted is no longer awaiting initial review)
    const postStageOverview = await request(app)
      .get('/api/jobs/recruiter/overview')
      .set('Authorization', `Bearer ${tokenRecruiterA}`);
    assert(postStageOverview.body.data.overview.awaitingReview === 0, 'awaitingReview decreased to 0');
    assert(postStageOverview.body.data.overview.byStatus.shortlisted === 1, 'byStatus shortlisted is 1');

    // =============================================================
    // TEST GROUP 5: Cross-Recruiter Ownership Enforcement (403 Forbidden)
    // =============================================================
    console.log('\n[Test Group 5] Cross-Recruiter Ownership Enforcement:');

    // 1. Recruiter B attempts to view Job A1's applicants -> 403 Forbidden
    const crossApplicantsRes = await request(app)
      .get(`/api/jobs/${jobA1._id}/applications`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`);

    assert(crossApplicantsRes.status === 403, 'Recruiter B cannot view Recruiter A applicants (403 Forbidden)');

    // 2. Recruiter B attempts to update Job A1's status -> 403 Forbidden
    const crossStatusRes = await request(app)
      .patch(`/api/jobs/${jobA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`)
      .send({ status: 'closed' });

    assert(crossStatusRes.status === 403, 'Recruiter B cannot change Recruiter A job status (403 Forbidden)');

    // 3. Recruiter B attempts to update stage of applicant on Job A1 -> 403 Forbidden
    const crossStageRes = await request(app)
      .patch(`/api/applications/${appA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`)
      .send({ status: 'rejected' });

    assert(crossStageRes.status === 403, 'Recruiter B cannot alter applicant stage on Recruiter A job (403 Forbidden)');

    // 4. Recruiter B attempts to delete Recruiter A's job -> 403 Forbidden
    const crossDeleteRes = await request(app)
      .delete(`/api/jobs/${jobA1._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`);

    assert(crossDeleteRes.status === 403, 'Recruiter B cannot delete Recruiter A job (403 Forbidden)');

    // 5. Candidate attempts to update applicant stage -> 403 Forbidden
    const candidateStageRes = await request(app)
      .patch(`/api/applications/${appA1._id}/status`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({ status: 'accepted' });

    assert(candidateStageRes.status === 403, 'Candidate cannot update hiring stage (403 Forbidden)');

    // =============================================================
    // TEST GROUP 6: Status Transitions & Status History Tracking
    // =============================================================
    console.log('\n[Test Group 6] Status Transitions & Status History Tracking:');

    // 1. Initial application statusHistory
    const appFresh = await Application.findById(appA1._id);
    assert(Array.isArray(appFresh.statusHistory), 'statusHistory is an array');
    assert(appFresh.statusHistory.length >= 1, 'Initial submission recorded in statusHistory');
    assert(appFresh.statusHistory[0].status === 'pending', 'Initial status recorded is pending');
    assert(appFresh.statusHistory[0].changedBy.toString() === candidate._id.toString(), 'Initial actor is candidate');

    // 2. Allowed transition: shortlisted -> interviewing
    const transition1Res = await request(app)
      .patch(`/api/applications/${appA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'interviewing', note: 'Passed technical screen' });

    assert(transition1Res.status === 200, 'Transition shortlisted -> interviewing returns 200 OK');
    assert(transition1Res.body.data.application.status === 'interviewing', 'Status changed to interviewing');

    // 3. Allowed transition: interviewing -> accepted
    const transition2Res = await request(app)
      .patch(`/api/applications/${appA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'accepted', note: 'Offer accepted by team' });

    assert(transition2Res.status === 200, 'Transition interviewing -> accepted returns 200 OK');
    assert(transition2Res.body.data.application.status === 'accepted', 'Status changed to accepted');

    // 4. Illegal transition: accepted -> pending (not allowed)
    const illegalJumpRes = await request(app)
      .patch(`/api/applications/${appA1._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'pending' });

    assert(illegalJumpRes.status === 400, 'Illegal jump accepted -> pending returns 400 Bad Request');
    assert(
      illegalJumpRes.body.message.toLowerCase().includes('cannot transition'),
      'Error message identifies illegal transition'
    );

    // 5. Candidate cancellation permitted only for pending/reviewing
    const candidateIllegalCancelRes = await request(app)
      .patch(`/api/applications/${appA1._id}/cancel`)
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(
      candidateIllegalCancelRes.status === 400,
      'Candidate cannot cancel accepted application (400 Bad Request)'
    );

    // 6. Test cancellation on fresh pending application
    const jobA3 = await Job.create({
      title: 'QA Automation Engineer',
      company: 'RecruiterTest Corp',
      description: 'Cypress and Playwright testing expert.',
      location: 'Remote',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.MID,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiterA._id,
    });

    const appA3 = await Application.create({
      candidate: candidate._id,
      job: jobA3._id,
      resume: candidate.resume,
      coverLetter: 'Interested in QA automation.',
      status: APPLICATION_STATUS.PENDING,
      statusHistory: [
        {
          status: APPLICATION_STATUS.PENDING,
          changedBy: candidate._id,
          changedByName: candidate.name,
          changedByRole: candidate.role,
          changedAt: new Date(),
          note: 'Application submitted',
        },
      ],
    });

    const candidateCancelRes = await request(app)
      .patch(`/api/applications/${appA3._id}/cancel`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({ reason: 'Found another offer' });

    assert(candidateCancelRes.status === 200, 'Candidate cancels pending application returns 200 OK');
    assert(candidateCancelRes.body.data.application.status === 'withdrawn', 'Status changed to withdrawn');

    // Subsequent transition on withdrawn terminal state is prohibited
    const terminalTransitionRes = await request(app)
      .patch(`/api/applications/${appA3._id}/status`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ status: 'interviewing' });

    assert(terminalTransitionRes.status === 400, 'Transition on terminal withdrawn state returns 400 Bad Request');

    // =============================================================
    // TEST GROUP 7: Private Internal Recruiter Notes & Confidentiality
    // =============================================================
    console.log('\n[Test Group 7] Private Internal Notes & Confidentiality:');

    // 1. Recruiter A adds private internal note
    const addNoteRes = await request(app)
      .patch(`/api/applications/${appA1._id}/notes`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ note: 'Candidate excelled in system architecture interview. Highly recommended.' });

    assert(addNoteRes.status === 200, 'Recruiter adds internal note returns 200 OK');
    assert(Array.isArray(addNoteRes.body.data.application.notes), 'Notes is an array in response');
    assert(addNoteRes.body.data.application.notes.length === 1, '1 note recorded');
    assert(
      addNoteRes.body.data.application.notes[0].text.includes('Candidate excelled'),
      'Note content matches'
    );

    // 2. Empty note yields 400 Bad Request
    const emptyNoteRes = await request(app)
      .patch(`/api/applications/${appA1._id}/notes`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`)
      .send({ note: '   ' });

    assert(emptyNoteRes.status === 400, 'Empty note yields 400 Bad Request');

    // 3. Recruiter B attempting to add note to Recruiter A job application -> 403 Forbidden
    const crossNoteRes = await request(app)
      .patch(`/api/applications/${appA1._id}/notes`)
      .set('Authorization', `Bearer ${tokenRecruiterB}`)
      .send({ note: 'Unauthorized note' });

    assert(crossNoteRes.status === 403, 'Recruiter B adding note to Recruiter A app yields 403 Forbidden');

    // 4. Candidate attempting to add note -> 403 Forbidden
    const candidateAddNoteRes = await request(app)
      .patch(`/api/applications/${appA1._id}/notes`)
      .set('Authorization', `Bearer ${tokenCandidate}`)
      .send({ note: 'Candidate trying to add note' });

    assert(candidateAddNoteRes.status === 403, 'Candidate adding internal note yields 403 Forbidden');

    // 5. PRIVACY CHECK: Candidate views single application details -> internal notes hidden!
    const candidateDetailsRes = await request(app)
      .get(`/api/applications/${appA1._id}`)
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(candidateDetailsRes.status === 200, 'Candidate views application details returns 200 OK');
    assert(
      candidateDetailsRes.body.data.application.notes === undefined,
      'Internal notes strictly hidden from candidate in single application view'
    );
    assert(
      Array.isArray(candidateDetailsRes.body.data.application.statusHistory),
      'Candidate CAN view status history'
    );

    // 6. PRIVACY CHECK: Candidate views my applications list -> internal notes hidden!
    const candidateMyAppsRes = await request(app)
      .get('/api/applications/my')
      .set('Authorization', `Bearer ${tokenCandidate}`);

    assert(candidateMyAppsRes.status === 200, 'Candidate views my applications returns 200 OK');
    for (const appItem of candidateMyAppsRes.body.data.applications) {
      assert(
        appItem.notes === undefined,
        'Internal notes strictly hidden from candidate in list view'
      );
    }

    // 7. Recruiter views application details -> internal notes visible!
    const recruiterDetailsRes = await request(app)
      .get(`/api/applications/${appA1._id}`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`);

    assert(recruiterDetailsRes.status === 200, 'Recruiter views application details returns 200 OK');
    assert(
      Array.isArray(recruiterDetailsRes.body.data.application.notes),
      'Recruiter can view internal notes'
    );
    assert(
      recruiterDetailsRes.body.data.application.notes.length === 1,
      'Recruiter sees the private note'
    );

    // 8. Recruiter queries job applicants with status filter & search
    const filterApplicantsRes = await request(app)
      .get(`/api/jobs/${jobA1._id}/applications?search=Carol`)
      .set('Authorization', `Bearer ${tokenRecruiterA}`);

    assert(filterApplicantsRes.status === 200, 'Recruiter search applicants returns 200 OK');
    assert(filterApplicantsRes.body.data.applications.length === 1, 'Search finds Carol');

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('====================================================');
  } finally {
    await Application.deleteMany({});
    await Job.deleteMany({ company: { $regex: /RecruiterTest/i } });
    await User.deleteMany({ email: { $regex: /@recruitertest\.local$/i } });
    await disconnectDB();
  }
}

runRecruiterDashboardTests().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
