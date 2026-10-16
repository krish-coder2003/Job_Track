import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../src/config/db.js';
import User, { USER_ROLES, ACCOUNT_STATUS } from '../src/models/user.model.js';

let passedTests = 0;
let totalTests = 0;

function assert(condition, message) {
  totalTests++;
  if (!condition) {
    console.error(`  FAIL: ${message}`);
    throw new Error(message);
  }
  passedTests++;
  console.log(`  PASS: ${message}`);
}

async function runTests() {
  console.log('====================================================');
  console.log('   JobTrack - Mongoose User Model Verification Suite  ');
  console.log('====================================================\n');

  await connectDB();

  // Clean up any leftovers from prior runs
  await User.deleteMany({ email: { $regex: /@modeltest\.local$/i } });

  try {
    // -----------------------------------------------------------
    // Test 1: Complete User Creation with All Required Fields
    // -----------------------------------------------------------
    console.log('[Test 1] User creation with all profile fields:');
    const candidateData = {
      name: 'Jane Doe',
      email: 'Jane.Doe@ModelTest.local',
      password: 'StrongCandidatePassword123!',
      role: USER_ROLES.CANDIDATE,
      phone: '+1 555-123-4567',
      location: 'San Francisco, CA',
      skills: ['React', 'Node.js', 'MongoDB', 'TypeScript'],
      experience: [
        {
          title: 'Frontend Engineer',
          company: 'Tech Innovations Inc',
          location: 'San Francisco, CA',
          startDate: new Date('2022-01-01'),
          current: true,
          years: 2.5,
          description: 'Developing reactive ATS dashboards in React and Tailwind.',
        },
      ],
      resume: {
        url: 'https://storage.jobtrack.local/resumes/jane-doe.pdf',
        filename: 'jane-doe.pdf',
        fileSize: 1048576,
        mimeType: 'application/pdf',
      },
      status: ACCOUNT_STATUS.ACTIVE,
    };

    const user = await User.create(candidateData);

    assert(user._id !== undefined, 'User generated an _id');
    assert(user.name === 'Jane Doe', 'User name saved accurately');
    assert(user.email === 'jane.doe@modeltest.local', 'Email was normalized to lowercase');
    assert(user.role === 'candidate', 'Role defaults/saves to candidate');
    assert(user.phone === '+1 555-123-4567', 'Phone saved properly');
    assert(user.location === 'San Francisco, CA', 'Location saved properly');
    assert(user.skills.length === 4, 'Skills array has 4 items');
    assert(user.experience.length === 1, 'Experience entries saved');
    assert(user.resume.filename === 'jane-doe.pdf', 'Resume information saved');
    assert(user.status === 'active', 'Account status is active');
    assert(user.createdAt instanceof Date, 'createdAt timestamp populated');
    assert(user.updatedAt instanceof Date, 'updatedAt timestamp populated');

    // -----------------------------------------------------------
    // Test 2: Password Security & Plaintext Prevention
    // -----------------------------------------------------------
    console.log('\n[Test 2] Password security and hashing:');
    const userWithHash = await User.findById(user._id).select('+passwordHash');
    assert(
      typeof userWithHash.passwordHash === 'string' && userWithHash.passwordHash.startsWith('$2'),
      'Password was hashed with bcrypt ($2...)'
    );
    assert(
      !userWithHash.passwordHash.includes('StrongCandidatePassword123!'),
      'Plaintext password is never stored'
    );

    const isMatch = await userWithHash.comparePassword('StrongCandidatePassword123!');
    assert(isMatch === true, 'comparePassword validates correct plaintext password');

    const isWrongMatch = await userWithHash.comparePassword('WrongPassword123');
    assert(isWrongMatch === false, 'comparePassword rejects incorrect password');

    // Attempting to set a plaintext password directly into passwordHash must fail validation
    let plaintextDirectSaveFailed = false;
    try {
      await User.create({
        name: 'Plaintext Tester',
        email: 'plaintext@modeltest.local',
        passwordHash: 'insecure_short_password',
      });
    } catch (err) {
      plaintextDirectSaveFailed = true;
      assert(
        err.message.includes('Plaintext passwords cannot be stored directly'),
        'Direct plaintext passwordHash rejected by validator'
      );
    }
    assert(plaintextDirectSaveFailed, 'Plaintext direct store was successfully prevented');

    // -----------------------------------------------------------
    // Test 3: Never Expose passwordHash in Responses / JSON
    // -----------------------------------------------------------
    console.log('\n[Test 3] Password exclusion in API / JSON responses:');
    const jsonOutput = JSON.parse(JSON.stringify(user));
    assert(jsonOutput.passwordHash === undefined, 'passwordHash excluded from JSON serialization');
    assert(jsonOutput.__v === undefined, '__v excluded from JSON serialization');

    const toObjectOutput = user.toObject();
    assert(toObjectOutput.passwordHash === undefined, 'passwordHash excluded from toObject()');

    const publicProfile = user.toPublicProfile();
    assert(publicProfile.passwordHash === undefined, 'passwordHash excluded from toPublicProfile()');
    assert(publicProfile.email === 'jane.doe@modeltest.local', 'toPublicProfile includes public fields');

    const fetchedDefault = await User.findById(user._id);
    assert(fetchedDefault.passwordHash === undefined, 'Default Mongoose find() excludes passwordHash');

    // -----------------------------------------------------------
    // Test 4: Duplicate Email Handling & Normalization
    // -----------------------------------------------------------
    console.log('\n[Test 4] Duplicate email handling & normalization:');
    // Ensure unique index is created in MongoDB
    await User.syncIndexes();

    let duplicateFailed = false;
    try {
      await User.create({
        name: 'Duplicate Jane',
        // Mixed casing and spaces around the same email
        email: '   JANE.DOE@MODELTEST.LOCAL   ',
        password: 'AnotherPassword123!',
      });
    } catch (err) {
      duplicateFailed = true;
      assert(
        err.code === 11000 || err.name === 'MongoServerError',
        'Duplicate email blocked with Mongo duplicate key error (code 11000)'
      );
    }
    assert(duplicateFailed, 'Duplicate email was rejected by MongoDB unique constraint');

    // -----------------------------------------------------------
    // Test 5: Public Registration Admin Role Guard
    // -----------------------------------------------------------
    console.log('\n[Test 5] Public registration role restrictions:');
    let adminRegistrationBlocked = false;
    try {
      await User.registerPublicUser({
        name: 'Sneaky Admin',
        email: 'admin.attempt@modeltest.local',
        password: 'AdminPassword123!',
        role: 'admin',
      });
    } catch (err) {
      adminRegistrationBlocked = true;
      assert(
        err.message.includes('Public registration cannot assign the admin role'),
        'Public registration rejected admin role'
      );
    }
    assert(adminRegistrationBlocked, 'Admin role is prohibited in public registration flow');

    // Recruiter public registration should succeed
    const recruiter = await User.registerPublicUser({
      name: 'Bob Recruiter',
      email: 'bob.recruiter@modeltest.local',
      password: 'RecruiterPassword123!',
      role: 'recruiter',
    });
    assert(recruiter.role === 'recruiter', 'Recruiter public registration succeeded');

    // -----------------------------------------------------------
    // Test 6: Role & Account Status Enum Validation
    // -----------------------------------------------------------
    console.log('\n[Test 6] Role and status enum validation:');
    let invalidRoleFailed = false;
    try {
      await User.create({
        name: 'Bad Role',
        email: 'badrole@modeltest.local',
        password: 'ValidPassword123!',
        role: 'superadmin',
      });
    } catch (err) {
      invalidRoleFailed = true;
      assert(err.errors?.role !== undefined, 'Invalid role "superadmin" caught by schema enum');
    }
    assert(invalidRoleFailed, 'Invalid role was rejected');

    let invalidStatusFailed = false;
    try {
      await User.create({
        name: 'Bad Status',
        email: 'badstatus@modeltest.local',
        password: 'ValidPassword123!',
        status: 'suspended_forever',
      });
    } catch (err) {
      invalidStatusFailed = true;
      assert(err.errors?.status !== undefined, 'Invalid status caught by schema enum');
    }
    assert(invalidStatusFailed, 'Invalid status was rejected');

    console.log('\n----------------------------------------------------');
    console.log(`Summary: ${passedTests}/${totalTests} tests PASSED.`);
    console.log('----------------------------------------------------');
  } finally {
    // Clean up test documents
    await User.deleteMany({ email: { $regex: /@modeltest\.local$/i } });
    await disconnectDB();
  }
}

runTests().catch((err) => {
  console.error('\nVerification script failed:', err);
  process.exit(1);
});
