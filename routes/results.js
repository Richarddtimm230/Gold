const express = require('express');
const router = express.Router();

const Result = require('../models/Result');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Term = require('../models/Term');
const ClassModel = require('../models/Class');
const Subject = require('../models/Subject');

// POST /api/results/upload - Bulk/manual upload of student results
router.post('/upload', async (req, res) => {
  try {
    const { session, term, class: className, subject, results } = req.body;
    let sessionObj = await Session.findOne({ name: session }) || await Session.create({ name: session });
    let termObj = await Term.findOne({ name: term }) || await Term.create({ name: term });
    let classObj = await ClassModel.findOne({ name: className }) || await ClassModel.create({ name: className });
    let subjectObj = await Subject.findOne({ name: subject }) || await Subject.create({ name: subject });

    let insertedResults = [];
    for (const row of results) {
      let student = await Student.findOne({ student_id: row.student_id });
      if (!student) {
        student = await Student.create({
          student_id: row.student_id,
          name: row.student_name,
          class: classObj._id
        });
      }
      const result = await Result.create({
        student: student._id,
        session: sessionObj._id,
        term: termObj._id,
        class: classObj._id,
        subject: subjectObj._id,
        score: row.score,
        grade: row.grade,
        remarks: row.remarks,
        status: row.status || 'Draft'
      });
      insertedResults.push(result);
    }
    res.json({ success: true, inserted: insertedResults.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/results - Fetch all results with populated references
router.get('/', async (req, res) => {
  try {
    // Optional query params: student_id, class, session, term, subject
    const filter = {};
    if (req.query.student_id) {
      const student = await Student.findOne({ student_id: req.query.student_id });
      if (student) filter.student = student._id;
    }
    if (req.query.class) {
      const classObj = await ClassModel.findOne({ name: req.query.class });
      if (classObj) filter.class = classObj._id;
    }
    if (req.query.session) {
      const sessionObj = await Session.findOne({ name: req.query.session });
      if (sessionObj) filter.session = sessionObj._id;
    }
    if (req.query.term) {
      const termObj = await Term.findOne({ name: req.query.term });
      if (termObj) filter.term = termObj._id;
    }
    if (req.query.subject) {
      const subjectObj = await Subject.findOne({ name: req.query.subject });
      if (subjectObj) filter.subject = subjectObj._id;
    }

    const results = await Result.find(filter)
      .populate('student')
      .populate('session')
      .populate('term')
      .populate('class')
      .populate('subject')
      .sort({ _id: -1 });
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:id - Fetch a single result by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('student')
      .populate('session')
      .populate('term')
      .populate('class')
      .populate('subject');
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/results/:id - Update a result
router.put('/:id', async (req, res) => {
  try {
    const update = req.body;
    const result = await Result.findByIdAndUpdate(req.params.id, update, { new: true })
      .populate('student')
      .populate('session')
      .populate('term')
      .populate('class')
      .populate('subject');
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/results/:id - Delete a result
router.delete('/:id', async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Result not found' });
    }
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
