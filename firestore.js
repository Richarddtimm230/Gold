const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Use environment variable in production, fallback to local file for development
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  // On Render (or any host), use the env variable
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // Local development: use the file (make sure .gitignore is set)
  serviceAccount = require('./firebaseServiceAccount.json');
}

// Only initialize Firebase app if it hasn't been initialized yet
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
  });
}

const db = getFirestore();
module.exports = db;
