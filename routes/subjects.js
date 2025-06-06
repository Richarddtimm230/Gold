const express = require('express');
const router = express.Router();
const Subject = require('../models/Subject');

// GET /api/subjects - Get all subjects
router.get('/', async (req, res) => {
  try {
    const subjects = await Subject.find().lean();
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
    let existing = await Subject.findOne({ name });
    if (existing) return res.status(409).json({ error: "Subject already exists" });
    const subj = await Subject.create({ name });
    res.status(201).json(subj);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
