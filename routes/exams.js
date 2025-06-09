const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Exam List
router.get('/list', async (req, res) => {
  const snap = await db.collection('exams').doc('list').collection('items').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/list', async (req, res) => {
  const ref = await db.collection('exams').doc('list').collection('items').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// Exam Timetable
router.get('/timetable', async (req, res) => {
  const snap = await db.collection('exams').doc('timetable').collection('items').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/timetable', async (req, res) => {
  const ref = await db.collection('exams').doc('timetable').collection('items').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// Exam Results
router.get('/results', async (req, res) => {
  const snap = await db.collection('exams').doc('results').collection('items').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/results', async (req, res) => {
  const ref = await db.collection('exams').doc('results').collection('items').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

module.exports = router;
