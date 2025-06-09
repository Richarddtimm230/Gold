const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Get Teacher Profile
router.get('/:teacherId', async (req, res) => {
  const doc = await db.collection('teachers').doc(req.params.teacherId).get();
  res.json(doc.exists ? doc.data() : {});
});

// Update Teacher Profile
router.put('/:teacherId', async (req, res) => {
  await db.collection('teachers').doc(req.params.teacherId).set(req.body, { merge: true });
  res.status(200).json({ status: "updated" });
});

module.exports = router;
