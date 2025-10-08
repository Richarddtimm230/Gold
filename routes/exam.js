const express = require('express');
const router = express.Router();
const Exam = require('../models/CBTExam');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

// GET /api/exams - List all exams
router.get('/', async (req, res) => {
  const exams = await Exam.find()
    .populate('class', 'name')
    .populate('subject', 'name')
    .sort({ createdAt: -1 });
  res.json(exams.map(ex => ({
    _id: ex._id,
    title: ex.title,
    className: ex.class?.name,
    subjectName: ex.subject?.name,
    scheduledFor: ex.scheduledFor,
    duration: ex.duration,
    status: ex.status,
    questions: ex.questions // <-- ADD THIS LINE!
  })));
});
// GET /api/exams - List all exams (with status filter)
router.get('/student', async (req, res) => {
  // Allow status filtering via query param (e.g. ?status=Scheduled,Started)
  let statusFilter = req.query.status;
  let query = {};
  if (statusFilter) {
    // Accept comma-separated or single value
    let statusArray = statusFilter.split(',').map(s => s.trim());
    query.status = { $in: statusArray };
  }
  const exams = await Exam.find(query)
    .populate('class', 'name')
    .populate('subject', 'name')
    .sort({ createdAt: -1 });
  res.json(exams.map(ex => ({
    _id: ex._id,
    title: ex.title,
    className: ex.class?.name,
    subjectName: ex.subject?.name,
    scheduledFor: ex.scheduledFor,
    duration: ex.duration,
    status: ex.status,
    questions: ex.questions
  })));
});
// GET /api/exams/:id - Get single exam
router.get('/:id', async (req, res) => {
  const ex = await Exam.findById(req.params.id)
    .populate('class', 'name')
    .populate('subject', 'name');
  if (!ex) return res.status(404).json({ error: 'Exam not found' });
  res.json({
    _id: ex._id,
    title: ex.title,
    className: ex.class?.name,
    subjectName: ex.subject?.name,
    duration: ex.duration,
    status: ex.status,
    scheduledFor: ex.scheduledFor,
    questions: ex.questions
  });
});

// POST /api/exams - Create exam
router.post('/', async (req, res) => {
  const { title, class: classId, subject, duration, questions } = req.body;
  if (!title || !classId || !subject || !duration || !questions) {
    return res.status(400).json({ error: 'Missing required fields.' });
  }
  const exam = new Exam({ title, class: classId, subject, duration, questions });
  await exam.save();
  res.status(201).json({ success: true, examId: exam._id });
});

// PUT /api/exams/:id - Update exam (basic)
router.put('/:id', async (req, res) => {
  const { title, duration, questions } = req.body;
  const exam = await Exam.findByIdAndUpdate(req.params.id, { title, duration, questions }, { new: true });
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  res.json({ success: true, exam });
});

// DELETE /api/exams/:id - Delete exam
router.delete('/:id', async (req, res) => {
  const exam = await Exam.findByIdAndDelete(req.params.id);
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  res.json({ success: true });
});

// PATCH /api/exams/:id/schedule - Set schedule
router.patch('/:id/schedule', async (req, res) => {
  const { scheduledFor } = req.body;
  const exam = await Exam.findByIdAndUpdate(req.params.id, { scheduledFor, status: 'Scheduled' }, { new: true });
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  res.json({ success: true });
});

// POST /api/exams/:id/stop - Stop exam
router.post('/:id/stop', async (req, res) => {
  const exam = await Exam.findByIdAndUpdate(req.params.id, { status: 'Stopped' }, { new: true });
  if (!exam) return res.status(404).json({ error: 'Exam not found.' });
  res.json({ success: true });
});

module.exports = router;
