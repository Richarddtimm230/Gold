const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const DraftResult = require('../models/DraftResult');
const teacherAuth = require('../middleware/teacherAuth'); // Should set req.staff

// GET /api/teachers/me - Get own teacher profile
router.get('/me', teacherAuth, async (req, res) => {
  const teacher = req.staff;
  if (!teacher || teacher.access_level !== 'Teacher') return res.status(404).json({ error: "Teacher not found" });
  res.json({
    id: teacher._id,
    name: `${teacher.first_name} ${teacher.last_name}`,
    email: teacher.email,
    phone: teacher.phone,
    designation: teacher.designation,
    department: teacher.department,
    photo_url: teacher.photo || null,
  });
});

// PATCH /api/teachers/me - Update own profile
router.patch('/me', teacherAuth, async (req, res) => {
  if (req.body.login_password) {
    req.body.login_password = await bcrypt.hash(req.body.login_password, 10);
  }
  const teacher = await Staff.findByIdAndUpdate(req.staff._id, req.body, { new: true });
  res.json({
    id: teacher._id,
    name: `${teacher.first_name} ${teacher.last_name}`,
    email: teacher.email,
    phone: teacher.phone,
    designation: teacher.designation,
    department: teacher.department,
    photo_url: teacher.photo || null,
  });
});

// GET /api/teachers - List all teachers
router.get('/', async (req, res) => {
  const teachers = await Staff.find({ access_level: 'Teacher' });
  res.json(teachers.map(t => ({
    id: t._id,
    name: `${t.first_name} ${t.last_name}`,
    email: t.email,
    phone: t.phone,
    designation: t.designation,
    department: t.department,
    photo_url: t.photo || null,
  })));
});

// --- ASSIGNMENTS ---
// GET /api/teachers/:id/assignments
router.get('/:id/assignments', teacherAuth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacher: req.params.id }).sort({ dueDate: 1 });
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers/:id/assignments
router.post('/:id/assignments', teacherAuth, async (req, res) => {
  try {
    const { classId, title, description, dueDate } = req.body;
    const assignment = new Assignment({
      teacher: req.params.id,
      class: classId,
      title,
      description,
      dueDate
    });
    await assignment.save();
    res.status(201).json({ assignment });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- NOTIFICATIONS ---
// GET /api/teachers/:id/notifications
router.get('/:id/notifications', teacherAuth, async (req, res) => {
  try {
    const notifications = await Notification.find({ teacher: req.params.id }).sort({ date: -1 });
    res.json({ notifications });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- DRAFT RESULTS ---
// GET /api/teachers/:id/draft-results
router.get('/:id/draft-results', teacherAuth, async (req, res) => {
  try {
    const draftResults = await DraftResult.find({ teacher: req.params.id });
    res.json({ draftResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers/:id/draft-results
router.post('/:id/draft-results', teacherAuth, async (req, res) => {
  try {
    const input = req.body;
    let draft = await DraftResult.findOne({
      teacher: req.params.id,
      student: input.studentId,
      class: input.classId,
      term: input.term
    });
    if (!draft) {
      draft = new DraftResult({ ...input, teacher: req.params.id });
    } else {
      Object.assign(draft, input);
    }
    draft.updated = new Date();
    await draft.save();
    res.json({ draftResult: draft });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
