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

async function runAuthorizationTests() {
  console.log('====================================================');
  console.log('   JobTrack - Authorization & Middleware Tests     ');
  console.log('====================================================\n');

  await connectDB();
  await User.syncIndexes();

  // Clean up any test users from prior runs
  await User.deleteMany({ email: { $regex: /@authtest\.local$/i } });

  try {
    // -------------------------------------------------------------
    // Setup Test Users (Candidate, Recruiter, Admin, Disabled)
    // -------------------------------------------------------------
    const candidate = await User.create({
      name: 'Alice Candidate',
      email: 'alice.candidate@authtest.local',
      password: 'CandidatePass123!',
      role: 'candidate',
      status: 'active',
    });

    const otherCandidate = await User.create({
      name: 'Bob Other Candidate',
      email: 'bob.other@authtest.local',
      password: 'BobCandidatePass123!',
      role: 'candidate',
      status: 'active',
    });

    const recruiter = await User.create({
      name: 'Rachel Recruiter',
      email: 'rachel.recruiter@authtest.local',
      password: 'RecruiterPass123!',
      role: 'recruiter',
      status: 'active',
    });

    const admin = await User.create({
      name: 'Arthur Admin',
      email: 'arthur.admin@authtest.local',
      password: 'AdminPassword123!',
      role: 'admin',
      status: 'active',
    });

    const disabledUser = await User.create({
      name: 'Dave Disabled',
      email: 'dave.disabled@authtest.local',
      password: 'DisabledPass123!',
      role: 'candidate',
      status: 'disabled',
    });

    // Tokens
    const candidateToken = generateToken({ id: candidate._id, role: candidate.role });
    const otherCandidateToken = generateToken({ id: otherCandidate._id, role: otherCandidate.role });
    const recruiterToken = generateToken({ id: recruiter._id, role: recruiter.role });
    const adminToken = generateToken({ id: admin._id, role: admin.role });
    const disabledToken = generateToken({ id: disabledUser._id, role: disabledUser.role });

    // ----------------------------------------------------------------
    // 1. Unauthenticated Access Rejection (401 Unauthorized)
    // ----------------------------------------------------------------
    console.log('[Test Group 1] Unauthenticated Access Protection:');
    const resNoTokenRecruiter = await request(app).get('/api/auth/recruiter-only');
    assert(resNoTokenRecruiter.status === 401, 'Unauthenticated request to recruiter API yields 401');
    assert(resNoTokenRecruiter.body.success === false, 'success is false');

    const resNoTokenAdmin = await request(app).get('/api/auth/admin-only');
    assert(resNoTokenAdmin.status === 401, 'Unauthenticated request to admin API yields 401');

    const resNoTokenProfile = await request(app)
      .put('/api/auth/profile')
      .send({ name: 'New Name' });
    assert(resNoTokenProfile.status === 401, 'Unauthenticated request to profile update yields 401');

    // ----------------------------------------------------------------
    // 2. Role-Based Access: Candidates Cannot Manage Recruiter APIs (403)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 2] Recruiter Domain Boundaries:');
    const resCandidateToRecruiter = await request(app)
      .get('/api/auth/recruiter-only')
      .set('Authorization', `Bearer ${candidateToken}`);

    assert(
      resCandidateToRecruiter.status === 403,
      `Candidate accessing recruiter API is rejected with 403 Forbidden (got ${resCandidateToRecruiter.status})`
    );
    assert(
      resCandidateToRecruiter.body.message.includes('Candidates cannot create or manage recruiter job listings'),
      'Clear descriptive message that candidates cannot access recruiter listings'
    );

    // Recruiter accessing recruiter endpoint succeeds
    const resRecruiterToRecruiter = await request(app)
      .get('/api/auth/recruiter-only')
      .set('Authorization', `Bearer ${recruiterToken}`);
    assert(resRecruiterToRecruiter.status === 200, 'Recruiter accessing recruiter API yields 200 OK');

    // Admin accessing recruiter endpoint succeeds
    const resAdminToRecruiter = await request(app)
      .get('/api/auth/recruiter-only')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(resAdminToRecruiter.status === 200, 'Admin accessing recruiter API yields 200 OK');

    // ----------------------------------------------------------------
    // 3. Role-Based Access: Recruiters Cannot Access Admin APIs (403)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 3] Admin API Restrictions:');
    const resRecruiterToAdmin = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${recruiterToken}`);

    assert(
      resRecruiterToAdmin.status === 403,
      `Recruiter accessing admin API is rejected with 403 Forbidden (got ${resRecruiterToAdmin.status})`
    );
    assert(
      resRecruiterToAdmin.body.message.includes('Recruiters cannot access admin APIs'),
      'Clear descriptive message that recruiters cannot access admin APIs'
    );

    // Candidate accessing admin API is also rejected with 403
    const resCandidateToAdmin = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${candidateToken}`);
    assert(resCandidateToAdmin.status === 403, 'Candidate accessing admin API yields 403 Forbidden');

    // Admin accessing admin API succeeds
    const resAdminToAdmin = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${adminToken}`);
    assert(resAdminToAdmin.status === 200, 'Admin accessing admin API yields 200 OK');

    // ----------------------------------------------------------------
    // 4. Account Status Verification: Disabled Accounts Blocked (403)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 4] Disabled Account Verification:');
    const resDisabledAccess = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${disabledToken}`);

    assert(resDisabledAccess.status === 403, 'Disabled account access yields 403 Forbidden');
    assert(
      resDisabledAccess.body.message.includes('account has been disabled'),
      'Reports account is disabled'
    );

    // ----------------------------------------------------------------
    // 5. Users Cannot Change Their Own Role Through Profile Updates (403)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 5] Role Escalation Prevention:');
    // Candidate attempts to promote self to recruiter
    const resPromoteRecruiter = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        name: 'Alice Trying To Escalate',
        role: 'recruiter',
      });

    assert(
      resPromoteRecruiter.status === 403,
      `Self-promotion to recruiter rejected with 403 Forbidden (got ${resPromoteRecruiter.status})`
    );
    assert(
      resPromoteRecruiter.body.message.includes('Users cannot change their own role'),
      'Clear error message prohibiting role alteration'
    );

    // Candidate attempts to promote self to admin
    const resPromoteAdmin = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        role: 'admin',
      });
    assert(resPromoteAdmin.status === 403, 'Self-promotion to admin rejected with 403 Forbidden');

    // Recruiter attempts to promote self to admin
    const resRecruiterPromoteAdmin = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${recruiterToken}`)
      .send({
        role: 'admin',
      });
    assert(resRecruiterPromoteAdmin.status === 403, 'Recruiter promoting self to admin rejected with 403');

    // Verify in DB that candidate role was NOT modified
    const dbCandidateAfterAttempt = await User.findById(candidate._id);
    assert(dbCandidateAfterAttempt.role === 'candidate', 'DB confirms candidate role unchanged');

    // Legitimate profile update without role change succeeds
    const resLegitUpdate = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        name: 'Alice Updated',
        location: 'Seattle, WA',
        skills: ['React', 'Node.js', 'MongoDB', 'Docker'],
      });
    assert(resLegitUpdate.status === 200, 'Legitimate profile update succeeds with 200 OK');
    assert(resLegitUpdate.body.data.user.name === 'Alice Updated', 'Updated name reflected');
    assert(resLegitUpdate.body.data.user.location === 'Seattle, WA', 'Updated location reflected');
    assert(resLegitUpdate.body.data.user.skills.length === 4, 'Updated skills reflected');

    // ----------------------------------------------------------------
    // 6. Resource Ownership Verification (checkOwnership)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 6] Resource Ownership Verification:');

    // 6a. Owner updates own resource -> 200 OK
    const resOwnerUpdate = await request(app)
      .put(`/api/auth/users/${candidate._id}/profile`)
      .set('Authorization', `Bearer ${candidateToken}`)
      .send({
        location: 'San Francisco, CA',
      });
    assert(resOwnerUpdate.status === 200, 'Owner updating own resource returns 200 OK');
    assert(resOwnerUpdate.body.data.user.location === 'San Francisco, CA', 'Location updated by owner');

    // 6b. Non-owner (Bob) attempts to update Alice's resource -> 403 Forbidden
    const resNonOwnerUpdate = await request(app)
      .put(`/api/auth/users/${candidate._id}/profile`)
      .set('Authorization', `Bearer ${otherCandidateToken}`)
      .send({
        name: 'Hacked by Bob',
      });

    assert(
      resNonOwnerUpdate.status === 403,
      `Non-owner modifying another user resource returns 403 Forbidden (got ${resNonOwnerUpdate.status})`
    );
    assert(
      resNonOwnerUpdate.body.message.includes('You do not have permission to access or modify this resource'),
      'Clear error message on unauthorized ownership access'
    );

    // Verify in DB that Alice was NOT modified by Bob
    const aliceInDb = await User.findById(candidate._id);
    assert(aliceInDb.name === 'Alice Updated', 'Alice name was NOT overwritten by Bob');

    // 6c. Admin updates Alice's resource -> 200 OK (admin override)
    const resAdminUpdate = await request(app)
      .put(`/api/auth/users/${candidate._id}/profile`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Alice Managed by Admin',
      });
    assert(resAdminUpdate.status === 200, 'Admin updating user resource returns 200 OK');
    assert(resAdminUpdate.body.data.user.name === 'Alice Managed by Admin', 'Admin update applied');

    // ----------------------------------------------------------------
    // 7. Frontend Spoofing Does Not Replace Backend Authorization
    // ----------------------------------------------------------------
    console.log('\n[Test Group 7] Backend Immunity to Frontend Header Spoofing:');
    const resSpoofedHeader = await request(app)
      .get('/api/auth/admin-only')
      .set('Authorization', `Bearer ${candidateToken}`)
      .set('X-User-Role', 'admin') // Fake client header
      .set('X-Admin-Override', 'true');

    assert(
      resSpoofedHeader.status === 403,
      'Backend rejects client-side role claims and relies strictly on verified JWT'
    );

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    // Cleanup
    await User.deleteMany({ email: { $regex: /@authtest\.local$/i } });
    await disconnectDB();
  }
}

runAuthorizationTests().catch((err) => {
  console.error('\nAuthorization test execution failed:', err);
  process.exit(1);
});
