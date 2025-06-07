const express = require('express');
const router = express.Router();

// Firestore instance
const db = require('../firestore');
const subjectCollection = () => db.collection('subjects');

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    const snapshot = await subjectCollection().get();
    const subjects = [];
    snapshot.forEach(doc => {
      const subj = doc.data();
      subj.id = doc.id;
      subjects.push(subj);
    });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects - Create a new subject
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subject name required" });

    const existingSnap = await subjectCollection().where('name', '==', name).limit(1).get();
    if (!existingSnap.empty) return res.status(409).json({ error: "Subject already exists" });

    const docRef = await subjectCollection().add({ name });
    const subj = { id: docRef.id, name };
    res.status(201).json(subj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
