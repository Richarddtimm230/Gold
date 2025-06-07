const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  // fallback for local dev, if you have the file
  serviceAccount = require('./firebaseServiceAccount.json');
}

if (!global._firebaseAppInitialized) {
  initializeApp({
    credential: cert(serviceAccount),
  });
  global._firebaseAppInitialized = true;
}

const db = getFirestore();
module.exports = db;
