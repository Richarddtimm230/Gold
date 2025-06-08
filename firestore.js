const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const { getStorage } = require('firebase-admin/storage');

let serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
serviceAccount.private_key = serviceAccount.private_key.replace(/\\n/g, '\n');

// Only initialize Firebase app if it hasn't been initialized yet
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET // Add this line for Storage!
  });
}

const db = getFirestore();
module.exports = db;

// Optionally, export storage for direct usage elsewhere:
module.exports.getStorage = getStorage;
