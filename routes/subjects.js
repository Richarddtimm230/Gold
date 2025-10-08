const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Class = require('../models/Class'); // Assuming you have a Class model

// Helper to check for ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// Get subjects by class id or name
router.get('/class/:classParam', async (req, res) => {
  const { classParam } = req.params;
  let classValue = classParam;
  try {
    // If not valid ObjectId, treat as name
    if (!isValidObjectId(classParam)) {
      const classDoc = await Class.findOne({ name: classParam });
      if (!classDoc) return res.status(404).json({ error: 'Class not found' });
      classValue = classDoc._id;
    }
    // Now find subjects for the class ObjectId
    const subjects = await Subject.find({ class: classValue });
    res.json(subjects);
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});


// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    const result = subjects.map(subj => ({ id: subj._id, name: subj.name }));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subjects/:id - Get a single subject by ID
router.get('/:id', async (req, res) => {
  try {
    const subj = await Subject.findById(req.params.id);
    if (!subj) return res.status(404).json({ error: 'Subject not found' });
    res.json({ id: subj._id, name: subj.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects - Create a new subject
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name required' });

    const exists = await Subject.findOne({ name });
    if (exists) return res.status(409).json({ error: 'Subject already exists' });

    const subject = new Subject({ name });
    await subject.save();
    res.status(201).json({ id: subject._id, name: subject.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/subjects/:id - Update a subject (full update)
router.put('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name required' });

    const updated = await Subject.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Subject not found' });
    res.json({ id: updated._id, name: updated.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/subjects/:id - Partial update
router.patch('/:id', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name required' });

    const updated = await Subject.findByIdAndUpdate(req.params.id, { name }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Subject not found' });
    res.json({ id: updated._id, name: updated.name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/subjects/:id - Delete subject
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Subject.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Subject not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
