const bcrypt = require('bcryptjs');

/**
 * Ensures that a superadmin user exists in Firestore.
 * @param {FirebaseFirestore.Firestore} db - The Firestore instance.
 */
async function ensureSuperAdmin(db) {
  const superEmail = process.env.SUPERADMIN_EMAIL || 'superadmin@goldlincschools.com';
  const superPassword = process.env.SUPERADMIN_PASSWORD || 'SuperSecurePassword123!';
  const superName = process.env.SUPERADMIN_NAME || 'Super Admin';

  const hash = await bcrypt.hash(superPassword, 10);

  const usersCollection = db.collection('users');
  const q = usersCollection.where('email', '==', superEmail).limit(1);
  const snapshot = await q.get();

  if (!snapshot.empty) {
    // Update existing superadmin
    const userDoc = snapshot.docs[0];
    await userDoc.ref.update({
      name: superName,
      password: hash,
      role: 'superadmin'
    });
  } else {
    // Create new superadmin
    await usersCollection.add({
      name: superName,
      email: superEmail,
      password: hash,
      role: 'superadmin'
    });
  }

  console.log('\x1b[32m%s\x1b[0m', '==> Superadmin ensured');
  console.log('Email:', superEmail);
  console.log('Password:', superPassword);
}

module.exports = ensureSuperAdmin;
