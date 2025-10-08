const express = require('express');
const router = express.Router();
const Result = require('../models/ResultCBT');
const Exam = require('../models/CBTExam');
const Student = require('../models/Student');

// GET /api/results - List all results
router.get('/', async (req, res) => {
  const results = await Result.find()
    .populate('student', 'first_name last_name class')
    .populate({
      path: 'exam',
      populate: [{ path: 'class', select: 'name' }, { path: 'subject', select: 'name' }]
    });
  res.json(results.map(r => ({
    _id: r._id,
    studentName: r.student?.first_name + ' ' + r.student?.last_name,
    className: r.student?.class,
    subjectName: r.exam?.subject?.name,
    examTitle: r.exam?.title,
    score: r.score,
    total: r.exam?.questions?.reduce((acc, q) => acc + (q.score||1), 0),
    startedAt: r.startedAt,
    finishedAt: r.finishedAt
  })));
});
// POST /api/result - Save a new CBT result
router.post('/', async (req, res) => {
  try {
    const { exam, answers, score, startedAt, finishedAt } = req.body;
    
const studentId = req.user ? req.user._id : req.body.student;
if (!exam || !answers || !studentId) {
  return res.status(400).json({ error: 'Missing required fields.' });
}

    // Calculate score, total, etc. here if you want, or trust frontend
    const result = new Result({
      student: studentId,
      exam,
      answers,
      score,
      startedAt,
      finishedAt
    });

    await result.save();
    res.status(201).json({ success: true, resultId: result._id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET /api/results/:id - Get single result
router.get('/:id', async (req, res) => {
  const r = await Result.findById(req.params.id)
    .populate('student', 'first_name last_name class')
    .populate({
      path: 'exam',
      populate: [{ path: 'class', select: 'name' }, { path: 'subject', select: 'name' }]
    });
  if (!r) return res.status(404).json({ error: 'Result not found' });
  res.json({
    _id: r._id,
    studentName: r.student?.first_name + ' ' + r.student?.last_name,
    className: r.student?.class,
    subjectName: r.exam?.subject?.name,
    examTitle: r.exam?.title,
    score: r.score,
    total: r.exam?.questions?.reduce((acc, q) => acc + (q.score||1), 0),
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    answers: r.answers
  });
});

module.exports = router;
