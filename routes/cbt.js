const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Question Bank
router.get('/question-bank', async (req, res) => {
  const snap = await db.collection('cbt').doc('questionBank').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/question-bank', async (req, res) => {
  const ref = await db.collection('cbt').doc('questionBank').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// Instruction Sets
router.get('/instruction-sets', async (req, res) => {
  const snap = await db.collection('cbt').doc('instructionSets').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/instruction-sets', async (req, res) => {
  const ref = await db.collection('cbt').doc('instructionSets').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// CBT Schedules
router.get('/schedules', async (req, res) => {
  const snap = await db.collection('cbt').doc('schedules').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/schedules', async (req, res) => {
  const ref = await db.collection('cbt').doc('schedules').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// CBT Scores
router.get('/scores', async (req, res) => {
  const snap = await db.collection('cbt').doc('scores').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/scores', async (req, res) => {
  const ref = await db.collection('cbt').doc('scores').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

// CBT Practice
router.get('/practice', async (req, res) => {
  const snap = await db.collection('cbt').doc('practice').collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/practice', async (req, res) => {
  const ref = await db.collection('cbt').doc('practice').collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

module.exports = router;
