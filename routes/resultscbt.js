const express = require('express');
const router = express.Router();
const Result = require('../models/ResultCBT');
const Exam = require('../models/CBTExam');
const Student = require('../models/Student');
const Class = require('../models/Class'); // Ensure this is available

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
    const { exam, answers, startedAt, finishedAt } = req.body;
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

    // --- Correct: Always save ObjectId for class ---
    // Find the student's class and always use the Class ObjectId
    const studentDoc = await Student.findById(studentId);
    if (!studentDoc) return res.status(400).json({ error: 'Student not found.' });
    let classId = studentDoc.class;

    // If it's a string and not an ObjectId, try to resolve using the name
    if (typeof classId === 'string' && !classId.match(/^[a-f\d]{24}$/i)) {
      const classDoc = await Class.findOne({ name: classId });
      if (!classDoc) return res.status(400).json({ error: 'Class not found for name: ' + classId });
      classId = classDoc._id;
    }

    const result = new Result({
      student: studentId,
      exam,
      answers,
      score: calculatedScore,
      startedAt,
      finishedAt,
      class: classId // Must be ObjectId
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
