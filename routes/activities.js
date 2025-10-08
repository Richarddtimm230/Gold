const express = require('express');
const router = express.Router();
const Activity = require('../models/ExamActivity');
const Student = require('../models/Student');
const Exam = require('../models/CBTExam');

// GET /api/activity - List all activities
router.get('/', async (req, res) => {
  const acts = await Activity.find()
    .populate('student', 'first_name last_name class')
    .populate('exam', 'title');
  res.json(acts.map(a => ({
    _id: a._id,
    studentName: a.student?.first_name + ' ' + a.student?.last_name,
    className: a.student?.class,
    examTitle: a.exam?.title,
    startedAt: a.startedAt,
    finishedAt: a.finishedAt,
    status: a.status
  })));
});

// GET /api/activity/:id - Get activity detail
router.get('/:id', async (req, res) => {
  const a = await Activity.findById(req.params.id)
    .populate('student', 'first_name last_name class')
    .populate('exam', 'title');
  if (!a) return res.status(404).json({ error: 'Activity not found' });
  res.json({
    _id: a._id,
    studentName: a.student?.first_name + ' ' + a.student?.last_name,
    className: a.student?.class,
    examTitle: a.exam?.title,
    startedAt: a.startedAt,
    finishedAt: a.finishedAt,
    status: a.status,
    activityLog: a.activityLog
  });
});

module.exports = router;
