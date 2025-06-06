const express = require('express');
const router = express.Router();
const ClassModel = require('../models/Class');
const Subject = require('../models/Subject');

// GET /api/classes - Get all classes with arms, subjects, teachers
router.get('/', async (req, res) => {
  try {
    // Populate arms, subjects, and teachers arrays
    const classes = await ClassModel.find()
      .populate('subjects', 'name')
      .lean();

    // For each class, make sure arms and teachers are arrays
    classes.forEach(cls => {
      cls.arms = Array.isArray(cls.arms) ? cls.arms : [];
      cls.subjects = Array.isArray(cls.subjects)
        ? cls.subjects.map(s => (typeof s === "string" ? { name: s } : s))
        : [];
      cls.teachers = Array.isArray(cls.teachers) ? cls.teachers : [];
    });

    res.json(classes);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes - Create a new class
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: "Class name required" });
    let existing = await ClassModel.findOne({ name });
    if (existing) return res.status(409).json({ error: "Class already exists" });
    const cls = await ClassModel.create({
      name,
      arms: [],
      subjects: [],
      teachers: []
    });
    res.status(201).json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/arms - Add/replace arms for a class
router.post('/:id/arms', async (req, res) => {
  try {
    const { arms } = req.body; // Array of arm names
    if (!Array.isArray(arms)) return res.status(400).json({ error: "Arms array required" });
    const cls = await ClassModel.findByIdAndUpdate(
      req.params.id,
      { $set: { arms } },
      { new: true }
    );
    if (!cls) return res.status(404).json({ error: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/subjects - Add/replace subjects for a class
router.post('/:id/subjects', async (req, res) => {
  try {
    const { subjects } = req.body; // Array of subject names or ids
    if (!Array.isArray(subjects)) return res.status(400).json({ error: "Subjects array required" });
    // If subjects are names, convert to _ids (create if missing)
    const subjectIds = [];
    for (const subj of subjects) {
      let subjDoc;
      if (subj.length === 24) {
        subjDoc = await Subject.findById(subj);
      }
      if (!subjDoc) {
        subjDoc = await Subject.findOne({ name: subj });
        if (!subjDoc) subjDoc = await Subject.create({ name: subj });
      }
      subjectIds.push(subjDoc._id);
    }
    const cls = await ClassModel.findByIdAndUpdate(
      req.params.id,
      { $set: { subjects: subjectIds } },
      { new: true }
    ).populate('subjects', 'name');
    if (!cls) return res.status(404).json({ error: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/teachers - Add a teacher to a class (optionally to an arm)
router.post('/:id/teachers', async (req, res) => {
  try {
    const { teacher } = req.body; // { name: string, arm: string }
    if (!teacher || !teacher.name) return res.status(400).json({ error: "Teacher object with name required" });
    const cls = await ClassModel.findByIdAndUpdate(
      req.params.id,
      { $push: { teachers: teacher } },
      { new: true }
    );
    if (!cls) return res.status(404).json({ error: "Class not found" });
    res.json(cls);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
