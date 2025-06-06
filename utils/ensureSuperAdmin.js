const bcrypt = require('bcryptjs');
const User = require('../models/User');

// This function ensures the superadmin user is (re)created on startup.
// It deletes any existing superadmin(s), then creates a fresh one using environment variables.
async function ensureSuperAdmin() {
  const superEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@goldlincschools.com';
  const superPassword = process.env.SUPERADMIN_PASSWORD || 'SuperSecurePassword123!';
  const superName = process.env.SUPERADMIN_NAME || 'Super Admin';

  // Remove ALL existing superadmins (force recreate for debugging/fresh setup)
  await User.deleteMany({ role: 'superadmin' });

  // Hash the new password
  const hash = await bcrypt.hash(superPassword, 10);

  // Create the new superadmin
  await User.create({
    name: superName,
    email: superEmail,
    password: hash,
    role: 'superadmin'
  });

  console.log('\x1b[32m%s\x1b[0m', '==> Superadmin CREATED');
  console.log('Email:', superEmail);
  console.log('Password:', superPassword);
}

module.exports = ensureSuperAdmin;
