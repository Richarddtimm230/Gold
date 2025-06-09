const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Notifications
router.get('/', async (req, res) => {
  const snap = await db.collection('notifications').orderBy('date', 'desc').limit(30).get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});

module.exports = router;
