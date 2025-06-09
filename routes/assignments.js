const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Assignments by Class
router.get('/:classId', async (req, res) => {
  const snap = await db.collection('assignments').doc(req.params.classId).collection('list').get();
  res.json(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
});
router.post('/:classId', async (req, res) => {
  const ref = await db.collection('assignments').doc(req.params.classId).collection('list').add(req.body);
  res.status(201).json({ id: ref.id, ...req.body });
});

module.exports = router;
