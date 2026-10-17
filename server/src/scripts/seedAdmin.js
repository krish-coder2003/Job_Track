import dotenv from 'dotenv';
dotenv.config();

import { connectDB, disconnectDB } from '../config/db.js';
import User, { USER_ROLES, ACCOUNT_STATUS } from '../models/user.model.js';

/**
 * Secure Development-Only Admin Seed Script
 *
 * Rules:
 * - In production, explicitly requires ADMIN_EMAIL and ADMIN_PASSWORD environment variables.
 * - In development, falls back to safe local development credentials if omitted.
 * - Idempotent: safe to run multiple times without duplicating or corrupting admin records.
 */
async function seedAdmin() {
  const isProduction = process.env.NODE_ENV === 'production';

  const adminEmail = process.env.ADMIN_EMAIL || (isProduction ? null : 'admin@jobtrack.local');
  const adminPassword = process.env.ADMIN_PASSWORD || (isProduction ? null : 'AdminSecure2026!');
  const adminName = process.env.ADMIN_NAME || 'Platform Administrator';

  console.log('====================================================');
  console.log('      JobTrack - Administrative Seed Script         ');
  console.log('====================================================');

  if (!adminEmail || !adminPassword) {
    console.error(
      'CRITICAL SECURITY ERROR: In production, ADMIN_EMAIL and ADMIN_PASSWORD must be provided via environment variables.'
    );
    console.error('Seed aborted to prevent insecure credentials.\n');
    process.exit(1);
  }

  try {
    await connectDB();

    const normalizedEmail = adminEmail.toLowerCase().trim();
    const existingUser = await User.findOne({ email: normalizedEmail });

    if (existingUser) {
      let needsSave = false;

      if (existingUser.role !== USER_ROLES.ADMIN) {
        existingUser.role = USER_ROLES.ADMIN;
        needsSave = true;
        console.log(`[INFO] Promoted existing user '${normalizedEmail}' to role 'admin'.`);
      }

      if (existingUser.status !== ACCOUNT_STATUS.ACTIVE) {
        existingUser.status = ACCOUNT_STATUS.ACTIVE;
        existingUser.disabledReason = '';
        needsSave = true;
        console.log(`[INFO] Reactivated administrator account '${normalizedEmail}'.`);
      }

      if (needsSave) {
        await existingUser.save();
      } else {
        console.log(`[OK] Administrator account '${normalizedEmail}' already exists and is active.`);
      }
    } else {
      await User.create({
        name: adminName,
        email: normalizedEmail,
        password: adminPassword,
        role: USER_ROLES.ADMIN,
        status: ACCOUNT_STATUS.ACTIVE,
      });

      console.log(`[SUCCESS] Created new administrator account:`);
      console.log(`   Name:  ${adminName}`);
      console.log(`   Email: ${normalizedEmail}`);
      console.log(`   Role:  admin`);
      console.log(`   State: active`);
    }

    console.log('\nSeed process completed successfully.');
  } catch (error) {
    console.error('Seed failed with error:', error);
    process.exit(1);
  } finally {
    await disconnectDB();
  }
}

seedAdmin();
