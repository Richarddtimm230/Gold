const bcrypt = require('bcryptjs');
const User = require('../models/User');

async function ensureSuperAdmin() {
  const superEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@goldlincschools.com';
  const superPassword = process.env.SUPERADMIN_PASSWORD || 'SuperSecurePassword123!';
  const superName = process.env.SUPERADMIN_NAME || 'Super Admin';

  const hash = await bcrypt.hash(superPassword, 10);

  // Update if exists, create if not
  await User.findOneAndUpdate(
    { email: superEmail },
    {
      name: superName,
      email: superEmail,
      password: hash,
      role: 'superadmin'
    },
    { upsert: true, new: true }
  );

  console.log('\x1b[32m%s\x1b[0m', '==> Superadmin ensured');
  console.log('Email:', superEmail);
  console.log('Password:', superPassword);
}

module.exports = ensureSuperAdmin;
