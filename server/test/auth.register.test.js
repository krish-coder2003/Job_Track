import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';

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

async function runRegisterTests() {
  console.log('====================================================');
  console.log('   POST /api/auth/register Integration Test Suite   ');
  console.log('====================================================\n');

  await connectDB();
  await User.syncIndexes();

  // Cleanup test documents from any prior runs
  await User.deleteMany({ email: { $regex: /@regtest\.local$/i } });

  try {
    // ----------------------------------------------------------------
    // 1. Successful Candidate Registration
    // ----------------------------------------------------------------
    console.log('[Test Group 1] Successful Registration:');
    const res1 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Candidate',
        email: '  Alice.Candidate@RegTest.local  ',
        password: 'Password123!',
      });

    assert(res1.status === 201, `Status is 201 Created (got ${res1.status})`);
    assert(res1.body.success === true, 'Response has success: true');
    assert(res1.body.data?.user !== undefined, 'Response includes user object in data');
    assert(res1.body.data.user.name === 'Alice Candidate', 'User name matches');
    assert(
      res1.body.data.user.email === 'alice.candidate@regtest.local',
      'Email is trimmed and normalized to lowercase'
    );
    assert(res1.body.data.user.role === 'candidate', 'Role defaults to candidate');
    assert(res1.body.data.user.passwordHash === undefined, 'passwordHash is NOT in API response');
    assert(res1.body.data.user.password === undefined, 'password is NOT in API response');

    // Verify DB state
    const dbUser1 = await User.findOne({ email: 'alice.candidate@regtest.local' }).select('+passwordHash');
    assert(dbUser1 !== null, 'User saved to MongoDB');
    assert(dbUser1.passwordHash.startsWith('$2'), 'Password stored as bcrypt hash in DB');
    assert(!dbUser1.passwordHash.includes('Password123!'), 'Plaintext password not in DB');

    // ----------------------------------------------------------------
    // 2. Successful Recruiter Registration
    // ----------------------------------------------------------------
    console.log('\n[Test Group 2] Successful Recruiter Registration:');
    const res2 = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Bob Recruiter',
        email: 'Bob.Recruiter@RegTest.local',
        password: 'RecruiterSecure123!',
        role: 'recruiter',
      });

    assert(res2.status === 201, `Status is 201 Created (got ${res2.status})`);
    assert(res2.body.data.user.role === 'recruiter', 'Role is recruiter');
    assert(res2.body.data.user.passwordHash === undefined, 'passwordHash is NOT in API response');

    // ----------------------------------------------------------------
    // 3. Attempted Admin Registration Must Be Rejected (403)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 3] Attempted Admin Registration:');
    const resAdmin = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Hacker Admin',
        email: 'hacker.admin@regtest.local',
        password: 'AdminPassword123!',
        role: 'admin',
      });

    assert(resAdmin.status === 403, `Status is 403 Forbidden (got ${resAdmin.status})`);
    assert(resAdmin.body.success === false, 'success is false');
    assert(
      resAdmin.body.message.includes('Public registration cannot assign the admin role'),
      'Clear error message rejecting admin role'
    );

    const adminInDb = await User.findOne({ email: 'hacker.admin@regtest.local' });
    assert(adminInDb === null, 'Admin user was NOT created in DB');

    // ----------------------------------------------------------------
    // 4. Duplicate Email Rejection (409 Conflict)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 4] Duplicate Email Rejection:');
    const resDuplicate = await request(app)
      .post('/api/auth/register')
      .send({
        name: 'Alice Impostor',
        email: 'ALICE.CANDIDATE@REGTEST.LOCAL', // Same as test 1, different casing
        password: 'AnotherPassword123!',
      });

    assert(resDuplicate.status === 409, `Status is 409 Conflict (got ${resDuplicate.status})`);
    assert(resDuplicate.body.success === false, 'success is false on duplicate email');
    assert(
      resDuplicate.body.message.includes('already exists'),
      'Error message notes account already exists'
    );

    // ----------------------------------------------------------------
    // 5. Input Validation Failures (400 Bad Request)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 5] Input Validation Failures:');

    // Missing Name
    const resMissingName = await request(app).post('/api/auth/register').send({
      email: 'noname@regtest.local',
      password: 'Password123!',
    });
    assert(resMissingName.status === 400, 'Missing name yields 400');
    assert(
      resMissingName.body.errors?.some((e) => e.field === 'name'),
      'Error details report name is required'
    );

    // Name too short
    const resShortName = await request(app).post('/api/auth/register').send({
      name: 'A',
      email: 'shortname@regtest.local',
      password: 'Password123!',
    });
    assert(resShortName.status === 400, 'Name < 2 chars yields 400');

    // Invalid Email Format
    const resBadEmail = await request(app).post('/api/auth/register').send({
      name: 'Bad Email',
      email: 'not-an-email-address',
      password: 'Password123!',
    });
    assert(resBadEmail.status === 400, 'Malformed email yields 400');
    assert(
      resBadEmail.body.errors?.some((e) => e.field === 'email'),
      'Error details report invalid email'
    );

    // Missing Password
    const resNoPass = await request(app).post('/api/auth/register').send({
      name: 'No Password',
      email: 'nopass@regtest.local',
    });
    assert(resNoPass.status === 400, 'Missing password yields 400');

    // Short Password (< 8 chars)
    const resShortPass = await request(app).post('/api/auth/register').send({
      name: 'Short Password',
      email: 'shortpass@regtest.local',
      password: 'short',
    });
    assert(resShortPass.status === 400, 'Password < 8 chars yields 400');
    assert(
      resShortPass.body.errors?.some((e) => e.field === 'password'),
      'Error details report password length constraint'
    );

    // Invalid Role (non-existent role)
    const resBadRole = await request(app).post('/api/auth/register').send({
      name: 'Invalid Role User',
      email: 'badrole@regtest.local',
      password: 'ValidPassword123!',
      role: 'superhero',
    });
    assert(resBadRole.status === 400, 'Unrecognized role yields 400');
    assert(
      resBadRole.body.errors?.some((e) => e.field === 'role'),
      'Error details report invalid role'
    );

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    // Clean up test documents
    await User.deleteMany({ email: { $regex: /@regtest\.local$/i } });
    await disconnectDB();
  }
}

runRegisterTests().catch((err) => {
  console.error('\nTest suite execution failed:', err);
  process.exit(1);
});
