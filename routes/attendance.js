const express = require('express');
const router = express.Router();
const { getFirestore } = require('firebase-admin/firestore');
const db = getFirestore();

// Attendance by Class and Date
router.get('/:classId/:date', async (req, res) => {
  const snap = await db.collection('attendance')
    .doc(req.params.classId)
    .collection('records')
    .doc(req.params.date)
    .get();
  res.json(snap.exists ? snap.data() : { students: [] });
});
router.post('/:classId/:date', async (req, res) => {
  await db.collection('attendance')
    .doc(req.params.classId)
    .collection('records')
    .doc(req.params.date)
    .set({ students: req.body.students }, { merge: true });
  res.status(200).json({ status: "ok" });
});

module.exports = router;
