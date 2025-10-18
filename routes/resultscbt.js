const express = require('express');
const router = express.Router();
const Result = require('../models/ResultCBT');
const Exam = require('../models/CBTExam');
const Student = require('../models/Student');

// GET /api/results - List all results
router.get('/', async (req, res) => {
  const results = await Result.find()
    .populate('student', 'firstname surname othernames class')
    .populate({
      path: 'exam',
      populate: [{ path: 'class', select: 'name' }, { path: 'subject', select: 'name' }]
    });

  res.json(results.map(r => ({
    _id: r._id,
    studentName: ((r.student?.firstname || '') + ' ' + (r.student?.surname || '')).trim(),
    className: r.student?.class,
    subjectName: r.exam?.subject?.name,
    examTitle: r.exam?.title,
    score: r.score,
    total: Array.isArray(r.exam?.questions) ? r.exam.questions.reduce((acc, q) => acc + (q.score || 1), 0) : 0,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt
  })));
});
// DELETE /api/results/:id - Delete a CBT result
router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Result.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Result not found.' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/result - Save a new CBT result
router.post('/', async (req, res) => {
  try {
    const { exam, class, answers, startedAt, finishedAt } = req.body;
    const studentId = req.user ? req.user._id : req.body.student;

    if (!exam || !answers || !studentId) {
      return res.status(400).json({ error: 'Missing required fields.' });
    }

    // Fetch the exam to calculate the score
    const examDoc = await Exam.findById(exam);
    if (!examDoc) return res.status(400).json({ error: 'Exam not found.' });

    let calculatedScore = 0;
    if (Array.isArray(examDoc.questions) && Array.isArray(answers)) {
      for (let i = 0; i < answers.length; i++) {
        // Accept both object or number answers in the DB
        const correct = typeof examDoc.questions[i]?.answer === 'number'
            ? examDoc.questions[i].answer
            : null;
        if (
          answers[i] !== null &&
          typeof answers[i] !== 'undefined' &&
          correct !== null &&
          answers[i] === correct
        ) {
          calculatedScore += examDoc.questions[i]?.score || 1;
        }
      }
    }

    const result = new Result({
      student: studentId,
      exam,
      answers,
      class,
      score: calculatedScore,
      startedAt,
      finishedAt
    });

    await result.save();
    res.status(201).json({ success: true, resultId: result._id, score: calculatedScore });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:id - Get single result
router.get('/:id', async (req, res) => {
  const r = await Result.findById(req.params.id)
    .populate('student', 'firstname surname othernames class')
    .populate({
      path: 'exam',
      populate: [{ path: 'class', select: 'name' }, { path: 'subject', select: 'name' }]
    });

  if (!r) return res.status(404).json({ error: 'Result not found' });
  res.json({
    _id: r._id,
    studentName: ((r.student?.firstname || '') + ' ' + (r.student?.surname || '')).trim(),
    className: r.student?.class,
    subjectName: r.exam?.subject?.name,
    examTitle: r.exam?.title,
    score: r.score,
    total: Array.isArray(r.exam?.questions) ? r.exam.questions.reduce((acc, q) => acc + (q.score || 1), 0) : 0,
    startedAt: r.startedAt,
    finishedAt: r.finishedAt,
    answers: r.answers
  });
});

module.exports = router;
