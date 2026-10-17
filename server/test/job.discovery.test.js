import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import Job, {
  JOB_STATUS,
  JOB_TYPES,
  WORK_MODES,
  EXPERIENCE_LEVELS,
} from '../src/models/job.model.js';

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

async function runJobDiscoveryTests() {
  console.log('====================================================');
  console.log('   JobTrack - Job Search & Discovery Tests          ');
  console.log('====================================================\n');

  await connectDB();
  await Job.syncIndexes();

  // Clean up prior test runs
  await User.deleteMany({ email: { $regex: /@discoverytest\.local$/i } });
  await Job.deleteMany({ company: { $regex: /^DiscoveryCorp/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Recruiter & Seed Test Jobs
    // -------------------------------------------------------------
    const recruiter = await User.create({
      name: 'Discovery Recruiter',
      email: 'recruiter@discoverytest.local',
      password: 'DiscoveryPass123!',
      role: 'recruiter',
      status: 'active',
    });

    const now = Date.now();

    // Job 1: React Frontend (Remote, Full-time, Senior, Austin)
    const job1 = await Job.create({
      title: 'Senior Frontend React Architect',
      company: 'DiscoveryCorp Alpha',
      description: 'Build enterprise design systems with modern React and Tailwind CSS.',
      requiredSkills: ['react', 'typescript', 'tailwind'],
      location: 'Austin, TX',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.SENIOR,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiter._id,
      createdAt: new Date(now - 10000),
    });

    // Job 2: Node Backend (On-site, Full-time, Mid, San Francisco)
    const job2 = await Job.create({
      title: 'Mid Backend Node.js Engineer',
      company: 'DiscoveryCorp Beta',
      description: 'Design high-volume REST and GraphQL APIs using Node.js and MongoDB.',
      requiredSkills: ['node.js', 'mongodb', 'express'],
      location: 'San Francisco, CA',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.ON_SITE,
      experienceLevel: EXPERIENCE_LEVELS.MID,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiter._id,
      createdAt: new Date(now - 20000),
    });

    // Job 3: DevOps Cloud (Hybrid, Contract, Lead, Austin)
    const job3 = await Job.create({
      title: 'Lead Cloud Infrastructure Architect',
      company: 'DiscoveryCorp Gamma',
      description: 'Manage multi-cloud Kubernetes clusters with Terraform on AWS.',
      requiredSkills: ['kubernetes', 'aws', 'terraform'],
      location: 'Austin, TX',
      jobType: JOB_TYPES.CONTRACT,
      workMode: WORK_MODES.HYBRID,
      experienceLevel: EXPERIENCE_LEVELS.LEAD,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiter._id,
      createdAt: new Date(now - 30000),
    });

    // Job 4: Junior Full-Stack (Remote, Internship, Entry, Chicago)
    const job4 = await Job.create({
      title: 'Junior Full-Stack Engineering Intern (C++)',
      company: 'DiscoveryCorp Delta',
      description: 'Learn modern software engineering with C++ and JavaScript.',
      requiredSkills: ['c++', 'javascript'],
      location: 'Chicago, IL (Remote)',
      jobType: JOB_TYPES.INTERNSHIP,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.ENTRY,
      status: JOB_STATUS.ACTIVE,
      isApproved: true,
      recruiter: recruiter._id,
      createdAt: new Date(now - 40000),
    });

    // Job 5: Draft Job (Should never appear in public discovery)
    await Job.create({
      title: 'Confidential Executive Draft Role',
      company: 'DiscoveryCorp Private',
      description: 'Confidential executive opening not yet approved.',
      location: 'Austin, TX',
      jobType: JOB_TYPES.FULL_TIME,
      workMode: WORK_MODES.REMOTE,
      experienceLevel: EXPERIENCE_LEVELS.EXECUTIVE,
      status: JOB_STATUS.DRAFT,
      isApproved: false,
      recruiter: recruiter._id,
      createdAt: new Date(now - 5000),
    });

    // -------------------------------------------------------------
    // Test Group 1: Default Discovery & Newest-First Sorting
    // -------------------------------------------------------------
    console.log('[Test Group 1] Default Discovery & Sorting:');

    const resDefault = await request(app).get('/api/jobs');
    assert(resDefault.status === 200, 'GET /api/jobs returns 200 OK');
    assert(resDefault.body.success === true, 'Response contains success: true');
    assert(resDefault.body.pagination !== undefined, 'Response contains pagination object');
    assert(resDefault.body.pagination.total >= 4, 'Total shows at least 4 active approved jobs');
    assert(resDefault.body.pagination.page === 1, 'Default page is 1');
    assert(resDefault.body.pagination.limit === 10, 'Default page size is 10');
    assert(
      !resDefault.body.data.jobs.some((j) => j.status === JOB_STATUS.DRAFT),
      'Excludes draft jobs from public results'
    );

    // Verify newest first sort order
    const discoveryJobs = resDefault.body.data.jobs.filter((j) =>
      j.company.startsWith('DiscoveryCorp')
    );
    assert(discoveryJobs.length === 4, 'All 4 active DiscoveryCorp jobs returned');
    assert(
      discoveryJobs[0]._id.toString() === job1._id.toString(),
      'Newest job (job1) appears first in default listing'
    );
    assert(
      discoveryJobs[3]._id.toString() === job4._id.toString(),
      'Oldest job (job4) appears last in default listing'
    );

    // -------------------------------------------------------------
    // Test Group 2: Keyword Search (Title, Company, Skills, Description)
    // -------------------------------------------------------------
    console.log('\n[Test Group 2] Keyword Search:');

    // Search by title keyword
    const resSearchTitle = await request(app).get('/api/jobs?search=React');
    assert(resSearchTitle.status === 200, 'Search by title returns 200 OK');
    assert(
      resSearchTitle.body.data.jobs.some((j) => j._id === job1._id.toString()),
      'Search for "React" matches job1 by title'
    );

    // Search by company keyword
    const resSearchCompany = await request(app).get('/api/jobs?search=Gamma');
    assert(resSearchCompany.status === 200, 'Search by company returns 200 OK');
    assert(
      resSearchCompany.body.data.jobs.some((j) => j._id === job3._id.toString()),
      'Search for "Gamma" matches job3 by company'
    );

    // Search by skill keyword
    const resSearchSkill = await request(app).get('/api/jobs?search=kubernetes');
    assert(resSearchSkill.status === 200, 'Search by requiredSkill returns 200 OK');
    assert(
      resSearchSkill.body.data.jobs.some((j) => j._id === job3._id.toString()),
      'Search for "kubernetes" matches job3 by skill'
    );

    // Search with special regex characters (e.g. C++)
    const resSearchSpecial = await request(app).get('/api/jobs?search=C++');
    assert(resSearchSpecial.status === 200, 'Search with special characters C++ returns 200 OK');
    assert(
      resSearchSpecial.body.data.jobs.some((j) => j._id === job4._id.toString()),
      'Search for "C++" safely matches job4 without regex SyntaxError'
    );

    // -------------------------------------------------------------
    // Test Group 3: Structured Filters (Location, WorkMode, JobType, ExpLevel)
    // -------------------------------------------------------------
    console.log('\n[Test Group 3] Structured Filters:');

    // Filter by Location
    const resLoc = await request(app).get('/api/jobs?location=Austin');
    assert(resLoc.status === 200, 'Filter by location returns 200 OK');
    const austinJobs = resLoc.body.data.jobs.filter((j) =>
      j.company.startsWith('DiscoveryCorp')
    );
    assert(austinJobs.length === 2, 'Location "Austin" returns both Austin jobs');

    const resLocSF = await request(app).get('/api/jobs?location=San%20Francisco');
    assert(resLocSF.status === 200, 'Filter by location San Francisco returns 200 OK');
    assert(
      resLocSF.body.data.jobs.some((j) => j._id === job2._id.toString()),
      'Location "San Francisco" correctly matches job2'
    );

    // Filter by Work Mode
    const resWorkMode = await request(app).get('/api/jobs?workMode=remote');
    assert(resWorkMode.status === 200, 'Filter by workMode returns 200 OK');
    assert(
      resWorkMode.body.data.jobs.every((j) => j.workMode === 'remote'),
      'All returned jobs have workMode "remote"'
    );

    // Filter by Job Type
    const resJobType = await request(app).get('/api/jobs?jobType=contract');
    assert(resJobType.status === 200, 'Filter by jobType returns 200 OK');
    assert(
      resJobType.body.data.jobs.every((j) => j.jobType === 'contract'),
      'All returned jobs have jobType "contract"'
    );

    // Filter by Experience Level
    const resExp = await request(app).get('/api/jobs?experienceLevel=lead');
    assert(resExp.status === 200, 'Filter by experienceLevel returns 200 OK');
    assert(
      resExp.body.data.jobs.every((j) => j.experienceLevel === 'lead'),
      'All returned jobs have experienceLevel "lead"'
    );

    // -------------------------------------------------------------
    // Test Group 4: Combined Multi-Filters
    // -------------------------------------------------------------
    console.log('\n[Test Group 4] Combined Multi-Filters:');

    // Combined: Austin + remote + full-time + senior
    const resCombined = await request(app).get(
      '/api/jobs?search=Frontend&location=Austin&workMode=remote&jobType=full-time&experienceLevel=senior'
    );
    assert(resCombined.status === 200, 'Combined query returns 200 OK');
    const combinedJobs = resCombined.body.data.jobs.filter((j) =>
      j.company.startsWith('DiscoveryCorp')
    );
    assert(combinedJobs.length === 1, 'Combined query isolated exactly 1 matching job');
    assert(
      combinedJobs[0]._id.toString() === job1._id.toString(),
      'Combined query correctly matched Job 1'
    );

    // -------------------------------------------------------------
    // Test Group 5: Pagination (Page Number, Page Size, Total Pages, hasMore)
    // -------------------------------------------------------------
    console.log('\n[Test Group 5] Pagination & Page Size:');

    // Page size = 2
    const resPage1 = await request(app).get('/api/jobs?limit=2&page=1');
    assert(resPage1.status === 200, 'limit=2&page=1 returns 200 OK');
    assert(resPage1.body.data.jobs.length === 2, 'Page 1 returns exactly 2 jobs');
    assert(resPage1.body.pagination.page === 1, 'Pagination reports page 1');
    assert(resPage1.body.pagination.limit === 2, 'Pagination reports limit 2');
    assert(resPage1.body.pagination.hasMore === true, 'Pagination reports hasMore: true');
    assert(resPage1.body.pagination.totalPages > 1, 'totalPages is greater than 1');

    const resPage2 = await request(app).get('/api/jobs?limit=2&page=2');
    assert(resPage2.status === 200, 'limit=2&page=2 returns 200 OK');
    assert(resPage2.body.data.jobs.length === 2, 'Page 2 returns exactly 2 jobs');
    assert(
      resPage1.body.data.jobs[0]._id !== resPage2.body.data.jobs[0]._id,
      'Page 1 and Page 2 contain non-overlapping results'
    );

    // Support pageSize alias
    const resPageSizeAlias = await request(app).get('/api/jobs?pageSize=3&page=1');
    assert(resPageSizeAlias.status === 200, 'pageSize parameter supported');
    assert(resPageSizeAlias.body.pagination.limit === 3, 'limit reflects pageSize parameter');

    // -------------------------------------------------------------
    // Test Group 6: Empty Results Handling
    // -------------------------------------------------------------
    console.log('\n[Test Group 6] Empty Results:');

    const resEmpty = await request(app).get(
      '/api/jobs?search=nonexistentterm123456xyz&location=Atlantis'
    );
    assert(resEmpty.status === 200, 'Empty search returns 200 OK');
    assert(resEmpty.body.success === true, 'Empty search response contains success: true');
    assert(resEmpty.body.data.jobs.length === 0, 'data.jobs is an empty array');
    assert(resEmpty.body.count === 0, 'count is 0');
    assert(resEmpty.body.pagination.total === 0, 'pagination.total is 0');
    assert(resEmpty.body.pagination.totalPages === 0, 'pagination.totalPages is 0');
    assert(resEmpty.body.pagination.hasMore === false, 'pagination.hasMore is false');

    // -------------------------------------------------------------
    // Test Group 7: Query Validation Failures (HTTP 400 Bad Request)
    // -------------------------------------------------------------
    console.log('\n[Test Group 7] Query Parameter Validation Failures:');

    // Invalid page <= 0
    const resBadPageZero = await request(app).get('/api/jobs?page=0');
    assert(resBadPageZero.status === 400, 'page=0 returns 400 Bad Request');
    assert(
      resBadPageZero.body.errors.some((e) => e.field === 'page'),
      'Reports error on page parameter'
    );

    // Invalid page non-numeric
    const resBadPageStr = await request(app).get('/api/jobs?page=notanumber');
    assert(resBadPageStr.status === 400, 'page=notanumber returns 400 Bad Request');

    // Limit exceeding MAX_PAGE_SIZE (50)
    const resMaxLimit = await request(app).get('/api/jobs?limit=51');
    assert(resMaxLimit.status === 400, 'limit=51 returns 400 Bad Request');
    assert(
      resMaxLimit.body.errors.some((e) => e.field === 'limit'),
      'Reports error when limit exceeds MAX_PAGE_SIZE'
    );

    // Limit <= 0
    const resBadLimit = await request(app).get('/api/jobs?limit=-5');
    assert(resBadLimit.status === 400, 'limit=-5 returns 400 Bad Request');

    // Invalid jobType
    const resBadJobType = await request(app).get('/api/jobs?jobType=freelance-gig');
    assert(resBadJobType.status === 400, 'Invalid jobType returns 400 Bad Request');
    assert(
      resBadJobType.body.errors.some((e) => e.field === 'jobType'),
      'Reports error on invalid jobType'
    );

    // Invalid workMode
    const resBadWorkMode = await request(app).get('/api/jobs?workMode=outer-space');
    assert(resBadWorkMode.status === 400, 'Invalid workMode returns 400 Bad Request');

    // Invalid experienceLevel
    const resBadExp = await request(app).get('/api/jobs?experienceLevel=grandmaster');
    assert(resBadExp.status === 400, 'Invalid experienceLevel returns 400 Bad Request');

    // Invalid sortBy field
    const resBadSort = await request(app).get('/api/jobs?sortBy=password');
    assert(resBadSort.status === 400, 'Invalid sortBy field returns 400 Bad Request');

    // Invalid order
    const resBadOrder = await request(app).get('/api/jobs?order=random');
    assert(resBadOrder.status === 400, 'Invalid sort order returns 400 Bad Request');

    // Maximum limit 50 accepted
    const resLimit50 = await request(app).get('/api/jobs?limit=50');
    assert(resLimit50.status === 200, 'limit=50 is valid and returns 200 OK');

    // -------------------------------------------------------------
    // Clean up test data
    // -------------------------------------------------------------
    await User.deleteMany({ email: { $regex: /@discoverytest\.local$/i } });
    await Job.deleteMany({ company: { $regex: /^DiscoveryCorp/i } });

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    await disconnectDB();
  }
}

runJobDiscoveryTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
