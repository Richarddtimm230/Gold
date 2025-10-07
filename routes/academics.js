const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const Session = require('../models/Session');
const Term = require('../models/Term');
const Class = require('../models/Class');
const ExamSchedule = require('../models/ExamSchedule');
const ExamMode = require('../models/ExamMode');
const CBTMock = require('../models/CBTMock');
const CBTMockResult = require('../models/CBTMockResult');

const Staff = require('../models/Staff');

router.post('/classes', adminAuth, async (req, res) => {
  const { name, arms, teacherId } = req.body;
  if (!name) return res.status(400).json({ error: "Class name required" });

  let existing = await Class.findOne({ name });
  if (existing) return res.status(409).json({ error: "Class already exists" });

  const newClass = new Class({
    name,
    arms: Array.isArray(arms) ? arms : [],
    teachers: teacherId ? [teacherId] : [],
    subjects: []
  });
  await newClass.save();

  // Assign this class to the teacher's Staff document if teacherId provided
  if (teacherId) {
    await Staff.findByIdAndUpdate(
      teacherId,
      { $addToSet: { classes: newClass._id } }
    );
  }

  res.status(201).json({
    _id: newClass._id,
    name: newClass.name,
    arms: newClass.arms,
    teachers: newClass.teachers,
    subjects: newClass.subjects
  });
});
router.get('/classes', adminAuth, async (req, res) => {
  const classes = await Class.find().populate('teachers');
  res.json(classes.map(c => ({
    _id: c._id,
    name: c.name,
    arms: c.arms,
    teachers: c.teachers.map(t => ({
      _id: t._id,
      first_name: t.first_name,
      last_name: t.last_name,
      email: t.email
    })),
    subjects: c.subjects
  })));
});
router.get('/sessions', adminAuth, async (req, res) => {
  const sessions = await Session.find().sort('-createdAt');
  res.json(sessions.map(s => ({
    _id: s._id,
    name: s.name,
    startDate: s.startDate,
    endDate: s.endDate
  })));
});
router.post('/sessions', adminAuth, async (req, res) => {
  const { name, startDate, endDate } = req.body;
  if (!name) return res.status(400).json({ error: "Session name required" });
  let session;
  if (req.body._id) {
    session = await Session.findByIdAndUpdate(
      req.body._id,
      { name, startDate, endDate },
      { new: true }
    );
  } else {
    session = new Session({ name, startDate, endDate });
    await session.save();
  }
  res.json(session);
});
router.get('/terms', adminAuth, async (req, res) => {
  try {
    const terms = await Term.find().populate('session').sort('-createdAt');
    res.json(terms.map(t => ({
      _id: t._id,
      name: t.name,
      session: t.session ? { _id: t.session._id, name: t.session.name } : null,
      startDate: t.startDate,
      endDate: t.endDate
    })));
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/terms', adminAuth, async (req, res) => {
  const { name, sessionId, startDate, endDate } = req.body;
  if (!name || !sessionId) return res.status(400).json({ error: "Term name and session required" });
  let term;
  if (req.body._id) {
    term = await Term.findByIdAndUpdate(
      req.body._id,
      { name, session: sessionId, startDate, endDate },
      { new: true }
    );
  } else {
    term = new Term({ name, session: sessionId, startDate, endDate });
    await term.save();
  }
  res.json(term);
});

router.get('/classes', adminAuth, async (req, res) => {
  const classes = await Class.find().sort('name');
  res.json(classes.map(c => ({ _id: c._id, name: c.name })));
});

router.get('/exams/schedules', adminAuth, async (req, res) => {
  const schedules = await ExamSchedule.find().populate('term class').sort('-date');
  res.json(schedules.map(e => ({
    _id: e._id,
    title: e.title,
    term: e.term ? { _id: e.term._id, name: e.term.name } : undefined,
    class: e.class ? { _id: e.class._id, name: e.class.name } : undefined,
    date: e.date
  })));
});
router.post('/exams/schedules', adminAuth, async (req, res) => {
  const { title, termId, classId, date } = req.body;
  if (!title || !termId || !classId || !date) return res.status(400).json({ error: "All fields required" });
  let exam;
  if (req.body._id) {
    exam = await ExamSchedule.findByIdAndUpdate(
      req.body._id,
      { title, term: termId, class: classId, date },
      { new: true }
    );
  } else {
    exam = new ExamSchedule({ title, term: termId, class: classId, date });
    await exam.save();
  }
  res.json(exam);
});

router.get('/exams/modes', adminAuth, async (req, res) => {
  const modes = await ExamMode.find().populate('exam');
  res.json(modes.map(m => ({
    _id: m._id,
    exam: m.exam ? { _id: m.exam._id, title: m.exam.title } : undefined,
    mode: m.mode,
    duration: m.duration
  })));
});
router.post('/exams/modes', adminAuth, async (req, res) => {
  const { examId, mode, duration } = req.body;
  if (!examId || !mode || !duration) return res.status(400).json({ error: "All fields required" });
  let examMode = await ExamMode.findOneAndUpdate(
    { exam: examId },
    { mode, duration },
    { upsert: true, new: true }
  );
  res.json(examMode);
});

router.get('/cbt/mocks', adminAuth, async (req, res) => {
  const cbts = await CBTMock.find().populate('class').sort('-date');
  res.json(cbts.map(c => ({
    _id: c._id,
    title: c.title,
    class: c.class ? { _id: c.class._id, name: c.class.name } : undefined,
    mode: c.mode,
    date: c.date
  })));
});
router.post('/cbt/mocks', adminAuth, async (req, res) => {
  const { title, classId, mode, date } = req.body;
  if (!title || !classId || !mode || !date) return res.status(400).json({ error: "All fields required" });
  let cbt;
  if (req.body._id) {
    cbt = await CBTMock.findByIdAndUpdate(
      req.body._id,
      { title, class: classId, mode, date },
      { new: true }
    );
  } else {
    cbt = new CBTMock({ title, class: classId, mode, date });
    await cbt.save();
  }
  res.json(cbt);
});

router.get('/results/cbt-mocks', adminAuth, async (req, res) => {
  const { sessionId, classId, type } = req.query;
  let filter = {};
  if (sessionId) filter.session = sessionId;
  if (classId) filter.class = classId;
  if (type) filter.type = type;
  const results = await CBTMockResult.find(filter)
    .populate('student class exam mock')
    .sort('-date');
  res.json(results.map(r => ({
    _id: r._id,
    student: r.student ? { _id: r.student._id, name: r.student.name } : undefined,
    class: r.class ? { _id: r.class._id, name: r.class.name } : undefined,
    type: r.type,
    exam: r.exam ? { _id: r.exam._id, title: r.exam.title } : undefined,
    mock: r.mock ? { _id: r.mock._id, title: r.mock.title } : undefined,
    score: r.score,
    date: r.date
  })));
});

module.exports = router;
