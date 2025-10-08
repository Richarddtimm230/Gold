const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Subject = require('../models/Subject');
const Class = require('../models/Class'); // Assuming you have a Class model

// Helper to check for ObjectId
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

// GET /api/classes/:classId/subjects - Get subjects by class ObjectId
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
    const subjects = await Subject.find({ class: classValue });
    res.json(subjects.map(subj => ({
      id: subj._id,
      name: subj.name,
      class: subj.class
    })));
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

// GET /api/teachers/subjects?classId=xxx - Used by dashboard
router.get('/teacher/subjects', async (req, res) => {
  const { classId } = req.query;
  try {
    if (!classId || !isValidObjectId(classId)) return res.status(400).json({ error: 'Valid classId required' });
    const subjects = await Subject.find({ class: classId });
    res.json(subjects.map(subj => ({
      id: subj._id,
      name: subj.name,
      class: subj.class
    })));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:classId/subjects - Create a subject for a class
router.post('/classes/:classId/subjects', async (req, res) => {
  try {
    const { classId } = req.params;
    const { subjectName } = req.body;
    if (!isValidObjectId(classId)) return res.status(400).json({ error: 'Invalid classId' });
    if (!subjectName) return res.status(400).json({ error: 'Subject name required' });

    const classDoc = await Class.findById(classId);
    if (!classDoc) return res.status(404).json({ error: 'Class not found' });

    // Prevent duplicate subject in class
    const exists = await Subject.findOne({ name: subjectName, class: classId });
    if (exists) return res.status(409).json({ error: 'Subject already exists in this class' });

    const subject = new Subject({ name: subjectName, class: classId });
    await subject.save();
    res.status(201).json({ id: subject._id, name: subject.name, class: subject.class });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/classes/:classId/subjects/:subjectId - Update a subject's name for a class
router.patch('/classes/:classId/subjects/:subjectId', async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    const { name } = req.body;
    if (!isValidObjectId(classId) || !isValidObjectId(subjectId)) {
      return res.status(400).json({ error: 'Invalid classId or subjectId' });
    }
    if (!name) return res.status(400).json({ error: 'Subject name required' });
    const subject = await Subject.findOneAndUpdate(
      { _id: subjectId, class: classId },
      { name },
      { new: true }
    );
    if (!subject) return res.status(404).json({ error: 'Subject not found' });
    res.json({ id: subject._id, name: subject.name, class: subject.class });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/classes/:classId/subjects/:subjectId - Delete subject from class
router.delete('/classes/:classId/subjects/:subjectId', async (req, res) => {
  try {
    const { classId, subjectId } = req.params;
    if (!isValidObjectId(classId) || !isValidObjectId(subjectId)) {
      return res.status(400).json({ error: 'Invalid classId or subjectId' });
    }
    const deleted = await Subject.findOneAndDelete({ _id: subjectId, class: classId });
    if (!deleted) return res.status(404).json({ error: 'Subject not found in this class' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().sort({ name: 1 });
    const result = subjects.map(subj => ({ id: subj._id, name: subj.name, class: subj.class }));
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
    res.json({ id: subj._id, name: subj.name, class: subj.class });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/subjects - Create a new subject (not attached to a class)
router.post('/', async (req, res) => {
  try {
    const { name, class: classId } = req.body;
    if (!name) return res.status(400).json({ error: 'Subject name required' });

    // Optionally attach to a class if provided
    const exists = await Subject.findOne({ name, class: classId || null });
    if (exists) return res.status(409).json({ error: 'Subject already exists' });

    const subject = new Subject({ name, class: classId || null });
    await subject.save();
    res.status(201).json({ id: subject._id, name: subject.name, class: subject.class });
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
    res.json({ id: updated._id, name: updated.name, class: updated.class });
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
    res.json({ id: updated._id, name: updated.name, class: updated.class });
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
