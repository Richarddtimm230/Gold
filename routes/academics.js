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
const Subject = require('../models/Subject');

// Add a new subject to a class and assign to a teacher
router.post('/classes/:classId/subjects', adminAuth, async (req, res) => {
  const { classId } = req.params;
  const { subjectName, teacherId } = req.body;
  if (!subjectName || !teacherId) return res.status(400).json({ error: "Subject name and teacher required" });

  // Find or create subject
  let subject = await Subject.findOne({ name: subjectName });
  if (!subject) {
    subject = new Subject({ name: subjectName });
    await subject.save();
  }
  // Add to class if not already assigned
  let cls = await Class.findById(classId);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  // Check if this subject is already assigned in this class
  if (cls.subjects.some(s => String(s.subject) === String(subject._id))) {
    return res.status(409).json({ error: "Subject already assigned to class" });
  }

  cls.subjects.push({ subject: subject._id, teacher: teacherId });
  await cls.save();

  res.json({
    success: true,
    classId,
    subject: { id: subject._id, name: subject.name },
    teacherId
  });
});

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
// Get individual session by ID
router.get('/sessions/:id', adminAuth, async (req, res) => {
  const session = await Session.findById(req.params.id);
  if (!session) return res.status(404).json({ error: "Session not found" });
  res.json({
    _id: session._id,
    name: session.name,
    startDate: session.startDate,
    endDate: session.endDate
  });
});

// Get individual term by ID
router.get('/terms/:id', adminAuth, async (req, res) => {
  const term = await Term.findById(req.params.id);
  if (!term) return res.status(404).json({ error: "Term not found" });
  res.json({
    _id: term._id,
    name: term.name,
    sessionId: term.session,
    startDate: term.startDate,
    endDate: term.endDate
  });
});

// Get individual exam schedule by ID
router.get('/exams/schedules/:id', adminAuth, async (req, res) => {
  const exam = await ExamSchedule.findById(req.params.id);
  if (!exam) return res.status(404).json({ error: "Exam schedule not found" });
  res.json({
    _id: exam._id,
    title: exam.title,
    termId: exam.term,
    classId: exam.class,
    date: exam.date
  });
});

// Get individual exam mode by ID
router.get('/exams/modes/:id', adminAuth, async (req, res) => {
  const mode = await ExamMode.findById(req.params.id);
  if (!mode) return res.status(404).json({ error: "Exam mode not found" });
  res.json({
    _id: mode._id,
    examId: mode.exam,
    mode: mode.mode,
    duration: mode.duration
  });
});

// Get individual CBT/mock by ID
router.get('/cbt/mocks/:id', adminAuth, async (req, res) => {
  const cbt = await CBTMock.findById(req.params.id);
  if (!cbt) return res.status(404).json({ error: "CBT/mock not found" });
  res.json({
    _id: cbt._id,
    title: cbt.title,
    classId: cbt.class,
    mode: cbt.mode,
    date: cbt.date
  });
});
module.exports = router;
