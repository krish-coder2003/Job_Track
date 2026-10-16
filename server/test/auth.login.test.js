import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB } from '../src/config/db.js';
import User from '../src/models/user.model.js';
import { generateToken, COOKIE_NAME } from '../src/utils/jwt.js';

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

async function runLoginTests() {
  console.log('====================================================');
  console.log('   JobTrack Auth - Login, Logout & Session Tests    ');
  console.log('====================================================\n');

  await connectDB();
  await User.syncIndexes();

  // Cleanup test documents from any prior runs
  await User.deleteMany({ email: { $regex: /@logintest\.local$/i } });

  try {
    // Setup test users:
    // 1. Active candidate user
    const candidateUser = await User.create({
      name: 'Charlie Candidate',
      email: 'charlie@logintest.local',
      password: 'CorrectPassword123!',
      role: 'candidate',
      status: 'active',
    });

    // 2. Disabled recruiter user
    const disabledUser = await User.create({
      name: 'Diana Disabled',
      email: 'diana.disabled@logintest.local',
      password: 'DisabledPassword123!',
      role: 'recruiter',
      status: 'disabled',
    });

    // ----------------------------------------------------------------
    // 1. Successful Login
    // ----------------------------------------------------------------
    console.log('[Test Group 1] Successful Login:');
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: '  CHARLIE@LOGINTEST.LOCAL  ', // Verify normalization
        password: 'CorrectPassword123!',
      });

    assert(loginRes.status === 200, `Login status is 200 OK (got ${loginRes.status})`);
    assert(loginRes.body.success === true, 'Response indicates success: true');
    assert(loginRes.body.data?.user !== undefined, 'Response includes user object');
    assert(loginRes.body.data.user.email === 'charlie@logintest.local', 'Email matches normalized email');
    assert(loginRes.body.data.user.role === 'candidate', 'Role is candidate');
    assert(loginRes.body.data.user.passwordHash === undefined, 'passwordHash is NOT in login response');
    assert(typeof loginRes.body.data?.token === 'string', 'Token is returned in response body');

    // Verify Set-Cookie header for HTTP-only cookie
    const cookies = loginRes.headers['set-cookie'];
    assert(Array.isArray(cookies) && cookies.length > 0, 'Set-Cookie header is present');
    const authCookie = cookies.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    assert(authCookie !== undefined, `Set-Cookie contains ${COOKIE_NAME}`);
    assert(authCookie.includes('HttpOnly'), 'Cookie has HttpOnly flag set');
    assert(authCookie.includes('Path=/'), 'Cookie path is /');

    // ----------------------------------------------------------------
    // 2. Current Session Restoration (GET /api/auth/me)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 2] Session Restoration (GET /api/auth/me):');

    // 2a. Via Cookie
    const cookieHeader = authCookie.split(';')[0];
    const meViaCookie = await request(app)
      .get('/api/auth/me')
      .set('Cookie', [cookieHeader]);

    assert(meViaCookie.status === 200, 'GET /api/auth/me via Cookie returns 200 OK');
    assert(meViaCookie.body.success === true, 'Response success: true');
    assert(meViaCookie.body.data.user.email === 'charlie@logintest.local', 'User email restored correctly');
    assert(meViaCookie.body.data.user.passwordHash === undefined, 'passwordHash excluded from /me response');

    // 2b. Via Authorization Bearer Token
    const jwtToken = loginRes.body.data.token;
    const meViaBearer = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${jwtToken}`);

    assert(meViaBearer.status === 200, 'GET /api/auth/me via Bearer token returns 200 OK');
    assert(meViaBearer.body.data.user.email === 'charlie@logintest.local', 'User matches via Bearer token');

    // ----------------------------------------------------------------
    // 3. Logout (POST /api/auth/logout)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 3] Logout (POST /api/auth/logout):');
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', [cookieHeader]);

    assert(logoutRes.status === 200, 'Logout status is 200 OK');
    assert(logoutRes.body.success === true, 'Logout reports success: true');

    // Verify cookie was cleared
    const logoutCookies = logoutRes.headers['set-cookie'];
    const clearedAuthCookie = logoutCookies?.find((c) => c.startsWith(`${COOKIE_NAME}=`));
    assert(
      clearedAuthCookie && (clearedAuthCookie.includes('Expires=') || clearedAuthCookie.includes('Max-Age=0')),
      'Auth cookie was cleared on logout'
    );

    // ----------------------------------------------------------------
    // 4. Failed Login Scenarios
    // ----------------------------------------------------------------
    console.log('\n[Test Group 4] Failed Login Handling:');

    // 4a. Wrong Password -> Generic 401
    const wrongPassRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'charlie@logintest.local',
        password: 'IncorrectPassword999!',
      });
    assert(wrongPassRes.status === 401, 'Wrong password yields 401 Unauthorized');
    assert(wrongPassRes.body.success === false, 'success is false');
    assert(
      wrongPassRes.body.message === 'Invalid email or password.',
      'Generic error message for wrong password'
    );

    // 4b. Non-existent User -> Same Generic 401
    const noUserRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'ghost.user@logintest.local',
        password: 'SomePassword123!',
      });
    assert(noUserRes.status === 401, 'Non-existent user yields 401 Unauthorized');
    assert(
      noUserRes.body.message === 'Invalid email or password.',
      'Generic error message avoids user enumeration'
    );

    // 4c. Disabled Account Rejection -> 403 Forbidden
    const disabledRes = await request(app)
      .post('/api/auth/login')
      .send({
        email: 'diana.disabled@logintest.local',
        password: 'DisabledPassword123!',
      });
    assert(disabledRes.status === 403, 'Disabled account login yields 403 Forbidden');
    assert(
      disabledRes.body.message.includes('account has been disabled'),
      'Clear message indicating disabled account'
    );

    // 4d. Missing Fields -> 400 Bad Request
    const missingEmailRes = await request(app).post('/api/auth/login').send({
      password: 'SomePassword123!',
    });
    assert(missingEmailRes.status === 400, 'Missing email yields 400 Bad Request');

    const missingPassRes = await request(app).post('/api/auth/login').send({
      email: 'charlie@logintest.local',
    });
    assert(missingPassRes.status === 400, 'Missing password yields 400 Bad Request');

    // ----------------------------------------------------------------
    // 5. Protected Route Token Errors (Expired & Invalid Tokens)
    // ----------------------------------------------------------------
    console.log('\n[Test Group 5] Protected Route Token Errors:');

    // 5a. No Token Provided
    const noTokenRes = await request(app).get('/api/auth/me');
    assert(noTokenRes.status === 401, 'No token yields 401');
    assert(
      noTokenRes.body.message.includes('Authentication required'),
      'Requires authentication message'
    );

    // 5b. Invalid / Tampered Token
    const invalidTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer invalid.tampered.token');
    assert(invalidTokenRes.status === 401, 'Invalid token yields 401');
    assert(
      invalidTokenRes.body.message.includes('Invalid authentication token'),
      'Reports invalid token'
    );

    // 5c. Expired Token
    const expiredToken = generateToken(
      { id: candidateUser._id, role: candidateUser.role },
      { expiresIn: '-1s' }
    );
    const expiredTokenRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);
    assert(expiredTokenRes.status === 401, 'Expired token yields 401');
    assert(
      expiredTokenRes.body.message.includes('Session expired'),
      'Reports session expired'
    );

    // 5d. Token for Disabled User on Protected Route
    const disabledToken = generateToken({ id: disabledUser._id, role: disabledUser.role });
    const disabledMeRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${disabledToken}`);
    assert(disabledMeRes.status === 403, 'Disabled user on protected route yields 403');
    assert(
      disabledMeRes.body.message.includes('account has been disabled'),
      'Reports disabled account'
    );

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    // Cleanup test users
    await User.deleteMany({ email: { $regex: /@logintest\.local$/i } });
    await disconnectDB();
  }
}

runLoginTests().catch((err) => {
  console.error('\nLogin test suite execution failed:', err);
  process.exit(1);
});
