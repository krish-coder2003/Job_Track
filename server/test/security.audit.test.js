import dotenv from 'dotenv';
dotenv.config();

import request from 'supertest';
import app from '../src/app.js';
import { connectDB, disconnectDB, sanitizeMongoURI } from '../src/config/db.js';
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

async function runSecurityAuditTests() {
  console.log('====================================================');
  console.log('       JobTrack Security Audit Test Suite           ');
  console.log('====================================================\n');

  await connectDB();
  await User.syncIndexes();

  // Cleanup test documents from prior runs
  await User.deleteMany({ email: { $regex: /@sectest\.local$/i } });

  try {
    const testUser = await User.create({
      name: 'Security Test User',
      email: 'user@sectest.local',
      password: 'StrongPassword123!',
      role: 'candidate',
      status: 'active',
    });

    const authToken = generateToken({ id: testUser._id, role: testUser.role });

    // -------------------------------------------------------------
    // Test Group 1: OWASP Security Headers
    // -------------------------------------------------------------
    console.log('[Test Group 1] OWASP Security Headers:');
    const headerRes = await request(app).get('/');

    assert(headerRes.status === 200, 'Root endpoint responds with 200 OK');
    assert(
      headerRes.headers['x-content-type-options'] === 'nosniff',
      'X-Content-Type-Options is set to nosniff'
    );
    assert(
      headerRes.headers['x-frame-options'] === 'DENY',
      'X-Frame-Options is set to DENY (clickjacking protection)'
    );
    assert(
      headerRes.headers['x-xss-protection'] === '0',
      'X-XSS-Protection is set to 0 per modern OWASP guidance'
    );
    assert(
      headerRes.headers['referrer-policy'] === 'strict-origin-when-cross-origin',
      'Referrer-Policy is set to strict-origin-when-cross-origin'
    );

    // -------------------------------------------------------------
    // Test Group 2: Request Body Limits (DoS Prevention)
    // -------------------------------------------------------------
    console.log('\n[Test Group 2] Request Body Limits (DoS Prevention):');

    // Generate a payload exceeding 100KB limit (approx 150KB)
    const largePayload = {
      name: 'Oversized User',
      padding: 'X'.repeat(150 * 1024),
    };

    const oversizeRes = await request(app)
      .post('/api/auth/register')
      .send(largePayload);

    assert(oversizeRes.status === 413, `Oversized payload rejected with 413 (got ${oversizeRes.status})`);
    assert(oversizeRes.body.success === false, '413 response reports success: false');
    assert(
      oversizeRes.body.message.includes('100KB'),
      '413 response informs client about 100KB payload limit'
    );

    // -------------------------------------------------------------
    // Test Group 3: Rate Limiting Enforcement
    // -------------------------------------------------------------
    console.log('\n[Test Group 3] Rate Limiting Enforcement:');

    // Verify rate limit headers are present on normal requests
    const normalReq = await request(app)
      .get('/')
      .set('x-test-rate-limit', 'true');

    assert(
      normalReq.headers['ratelimit-limit'] !== undefined,
      'RateLimit-Limit header is returned'
    );
    assert(
      normalReq.headers['ratelimit-remaining'] !== undefined,
      'RateLimit-Remaining header is returned'
    );
    assert(
      normalReq.headers['ratelimit-reset'] !== undefined,
      'RateLimit-Reset header is returned'
    );

    // -------------------------------------------------------------
    // Test Group 4: CSRF Defense on Cookie-Authenticated State Mutations
    // -------------------------------------------------------------
    console.log('\n[Test Group 4] CSRF Defense for Cookie-Authenticated Requests:');

    // 4a. Cookie-authenticated mutation from malicious external origin -> 403 Forbidden
    const csrfBlockedRes = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`])
      .set('Origin', 'https://malicious-attacker-website.com')
      .send({ location: 'Hacked Location' });

    assert(
      csrfBlockedRes.status === 403,
      `Cross-origin cookie mutation rejected with 403 Forbidden (got ${csrfBlockedRes.status})`
    );
    assert(
      csrfBlockedRes.body.message.includes('CSRF Protection') ||
        csrfBlockedRes.body.message.includes('Origin not allowed'),
      'Clear CSRF protection error message returned'
    );

    // 4b. Cookie-authenticated mutation with legitimate client origin -> Allowed
    const legitimateOriginRes = await request(app)
      .put('/api/auth/profile')
      .set('Cookie', [`${COOKIE_NAME}=${authToken}`])
      .set('Origin', 'http://localhost:5173')
      .send({ location: 'Legitimate Silicon Valley, CA' });

    assert(
      legitimateOriginRes.status === 200,
      `Legitimate origin cookie mutation allowed with 200 OK (got ${legitimateOriginRes.status})`
    );
    assert(
      legitimateOriginRes.body.data.user.location === 'Legitimate Silicon Valley, CA',
      'Profile updated successfully for legitimate origin'
    );

    // 4c. Bearer token mutation from any origin is immune to CSRF -> Allowed
    const bearerOriginRes = await request(app)
      .put('/api/auth/profile')
      .set('Authorization', `Bearer ${authToken}`)
      .set('Origin', 'https://any-external-app.com')
      .send({ location: 'API Client Location' });

    assert(
      bearerOriginRes.status === 200,
      'Bearer token mutation allowed regardless of origin'
    );

    // -------------------------------------------------------------
    // Test Group 5: Environment Secrets & Credential Sanitization
    // -------------------------------------------------------------
    console.log('\n[Test Group 5] Environment Secrets & Credential Masking:');

    const rawMongoUri = 'mongodb+srv://admin_user:super_secret_password_123@cluster0.mongodb.net/test';
    const sanitized = sanitizeMongoURI(rawMongoUri);
    assert(
      !sanitized.includes('super_secret_password_123'),
      'sanitizeMongoURI completely hides database password'
    );
    assert(
      sanitized.includes('admin_user:****@cluster0'),
      'sanitizeMongoURI formats password mask as ****'
    );

    // Non-string inputs handled safely
    assert(sanitizeMongoURI(null) === '', 'sanitizeMongoURI handles null safely');
    assert(sanitizeMongoURI(undefined) === '', 'sanitizeMongoURI handles undefined safely');

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passed}/${total} security audit assertions PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    await User.deleteMany({ email: { $regex: /@sectest\.local$/i } });
    await disconnectDB();
  }
}

runSecurityAuditTests().catch((err) => {
  console.error('\nSecurity audit test suite execution failed:', err);
  process.exit(1);
});
