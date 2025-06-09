const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Subjects
router.get('/subjects', async (req, res) => {
  const snap = await db.collection('academics').doc('subjects').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/subjects', async (req, res) => {
  const ref = await db.collection('academics').doc('subjects').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// Schemes
router.get('/schemes', async (req, res) => {
  const snap = await db.collection('academics').doc('schemes').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/schemes', async (req, res) => {
  const ref = await db.collection('academics').doc('schemes').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// Topics
router.get('/topics', async (req, res) => {
  const snap = await db.collection('academics').doc('topics').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/topics', async (req, res) => {
  const ref = await db.collection('academics').doc('topics').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

module.exports = router;
