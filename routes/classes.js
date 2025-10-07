// Converted class API to Mongoose
const express = require('express');
const router = express.Router();

const Class = require('../models/Class');
const Subject = require('../models/Subject');

// GET /api/classes - Get all classes with arms, subjects, teachers
router.get('/', async (req, res) => {
  try {
    const teacherId = req.query.teacher_id;
    let query = {};
    if (teacherId) query.teachers = teacherId; // teachers should be array of ObjectId
    const classes = await Class.find(query).populate('subjects');
    const output = classes.map(cls => {
      return {
        id: cls._id,
        name: cls.name,
        arms: Array.isArray(cls.arms) ? cls.arms : [],
        teachers: Array.isArray(cls.teachers) ? cls.teachers : [],
        subjects: cls.subjects.map(sub => ({ id: sub._id, name: sub.name }))
      };
    });
    res.json({ classes: output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/classes/:id/teachers
router.post('/:id/teachers', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID required' });

    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    cls.teachers.push(teacherId);
    await cls.save();

    res.json({ id: cls._id, ...cls.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/classes - Create a new class
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name required' });

    const existing = await Class.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Class already exists' });

    const newClass = new Class({ name, arms: [], subjects: [], teachers: [] });
    await newClass.save();
    res.status(201).json({ id: newClass._id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/arms - Add/replace arms
router.post('/:id/arms', async (req, res) => {
  try {
    const { arms } = req.body;
    if (!Array.isArray(arms)) return res.status(400).json({ error: 'Arms array required' });

    const updated = await Class.findByIdAndUpdate(req.params.id, { arms }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Class not found' });

    res.json({ id: updated._id, ...updated.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/subjects - Add/replace subjects
router.post('/:id/subjects', async (req, res) => {
  try {
    const { subjects } = req.body;
    if (!Array.isArray(subjects)) return res.status(400).json({ error: 'Subjects array required' });

    const subjectIds = [];
    for (const subj of subjects) {
      let found = null;
      if (typeof subj === 'string' && subj.length === 24) {
        found = await Subject.findById(subj);
      }
      if (!found) {
        found = await Subject.findOne({ name: subj });
      }
      if (!found) {
        const created = new Subject({ name: subj });
        await created.save();
        found = created;
      }
      subjectIds.push(found._id);
    }

    const updated = await Class.findByIdAndUpdate(req.params.id, { subjects: subjectIds }, { new: true }).populate('subjects');
    if (!updated) return res.status(404).json({ error: 'Class not found' });

    res.json({
      id: updated._id,
      name: updated.name,
      arms: updated.arms,
      teachers: updated.teachers,
      subjects: updated.subjects.map(sub => ({ id: sub._id, name: sub.name }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
