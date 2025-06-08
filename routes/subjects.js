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

// GET /api/subjects/:id - Get a single subject by ID
router.get('/:id', async (req, res) => {
  try {
    const doc = await subjectCollection().doc(req.params.id).get();
    if (!doc.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }
    const subj = doc.data();
    subj.id = doc.id;
    res.json(subj);
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

// PUT /api/subjects/:id - Update a subject (full update)
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Subject name required" });

    const docRef = subjectCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    await docRef.update({ name });
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/subjects/:id - Partial update of subject (edit)
router.patch('/:id', async (req, res) => {
  try {
    const update = req.body;
    if (!update.name) return res.status(400).json({ error: "Subject name required" });

    const docRef = subjectCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }

    await docRef.update(update);
    const updated = (await docRef.get()).data();
    updated.id = req.params.id;
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id - Delete a subject
router.delete('/:id', async (req, res) => {
  try {
    const docRef = subjectCollection().doc(req.params.id);
    const docSnap = await docRef.get();
    if (!docSnap.exists) {
      return res.status(404).json({ error: "Subject not found" });
    }
    await docRef.delete();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
