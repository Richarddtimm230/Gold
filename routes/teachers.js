const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const DraftResult = require('../models/DraftResult');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const Student = require('../models/Student');
const teacherAuth = require('../middleware/teacherAuth'); // Should set req.staff

// GET /api/teachers/me - Get own teacher profile + classes + subjects
router.get('/me', teacherAuth, async (req, res) => {
  const teacher = req.staff;
  if (!teacher || teacher.access_level !== 'Teacher') return res.status(404).json({ error: "Teacher not found" });

  // Get classes assigned to this teacher (ObjectId match)
  const classes = await Class.find({ teachers: teacher._id })
    .populate({
      path: 'subjects.subject',
      model: 'Subject'
    })
    .populate({
      path: 'subjects.teacher',
      model: 'Staff',
      select: 'first_name last_name email'
    });

  // Structure classes and subjects in academic format
  const classData = classes.map(cls => ({
    id: cls._id,
    name: cls.name,
    arms: cls.arms,
    subjects: (cls.subjects || []).map(s => ({
      id: s.subject && s.subject._id,
      name: s.subject && s.subject.name,
      teacher: s.teacher ? {
        id: s.teacher._id,
        name: `${s.teacher.first_name} ${s.teacher.last_name}`,
        email: s.teacher.email
      } : null
    }))
  }));

  res.json({
    id: teacher._id,
    name: `${teacher.first_name} ${teacher.last_name}`,
    email: teacher.email,
    phone: teacher.phone,
    designation: teacher.designation,
    department: teacher.department,
    photo_url: teacher.photo || null,
    classes: classData
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

// GET /api/teachers - List all teachers (for assignments or admin)
router.get('/', async (req, res) => {
  const teachers = await Staff.find({ access_level: 'Teacher' });
  res.json(teachers.map(t => ({
    id: t._id,
    first_name: t.first_name,
    last_name: t.last_name,
    name: `${t.first_name} ${t.last_name}`,
    email: t.email,
    phone: t.phone,
    designation: t.designation,
    department: t.department,
    photo_url: t.photo || null,
  })));
});

// --- TEACHER CLASSES ---
// GET /api/teachers/classes - Classes assigned to logged-in teacher
router.get('/classes', teacherAuth, async (req, res) => {
  const classes = await Class.find({ teachers: req.staff._id });
  res.json(classes.map(cls => ({
    id: cls._id,
    name: cls.name,
    arms: cls.arms
  })));
});

// --- TEACHER SUBJECTS (per class) ---
router.get('/subjects', teacherAuth, async (req, res) => {
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: "classId is required" });
  const cls = await Class.findById(classId)
    .populate('subjects.subject')
    .populate('subjects.teacher');
  if (!cls) return res.json([]);
  const subjects = (cls.subjects || []).filter(
    s => s.teacher && String(s.teacher._id) === String(req.staff._id)
  ).map(s => ({
    id: s.subject ? s.subject._id : undefined,
    name: s.subject ? s.subject.name : undefined
  }));
  res.json(subjects);
});

router.get('/students', teacherAuth, async (req, res) => {
  const { classId } = req.query;
  if (!classId) return res.status(400).json({ error: "classId is required" });

  // Find the class by ObjectId
  const cls = await Class.findById(classId);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  // Find students by class name (string)
  const students = await Student.find({ class: cls.name });
  res.json(students.map(stu => ({
    id: stu._id,
    name: `${stu.firstname} ${stu.surname}`,
    regNo: stu.regNo,
    email: stu.studentEmail
  })));
});

// GET /api/teachers/:id/assignments
router.get('/:id/assignments', teacherAuth, async (req, res) => {
  try {
    const assignments = await Assignment.find({ teacher: req.params.id })
      .populate({ path: 'class', select: 'name' }) // ensures .class.name is available
      .sort({ dueDate: 1 });
    res.json({ assignments });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/teachers/:id/assignments
router.post('/:id/assignments', teacherAuth, async (req, res) => {
  try {
    const { class: classId, subject, title, description, dueDate } = req.body;
    const assignment = new Assignment({
      teacher: req.params.id,
      class: classId, // expects 'class' in body
      subject,
      title,
      description,
      dueDate
    });
    await assignment.save();
    // Optionally, populate class before returning
    await assignment.populate({ path: 'class', select: 'name' });
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
router.post('/classes/:classId/subjects', teacherAuth, async (req, res) => {
  const { classId } = req.params;
  const { subjectName } = req.body;
  // Find or create subject
  let subject = await Subject.findOne({ name: subjectName });
  if (!subject) {
    subject = new Subject({ name: subjectName });
    await subject.save();
  }
  const cls = await Class.findById(classId);
  // Prevent duplicate subject assignment
  let justAdded = null;
  if (!cls.subjects.some(s => String(s.subject) === String(subject._id) && String(s.teacher) === String(req.staff._id))) {
    cls.subjects.push({ subject: subject._id, teacher: req.staff._id });
    await cls.save();
    justAdded = { subject: subject._id, teacher: req.staff._id };
  }
  // Populate the subject for the response
  await cls.populate([
    { path: 'subjects.subject', model: 'Subject' },
    { path: 'subjects.teacher', model: 'Staff', select: 'first_name last_name email' }
  ]);
  // Find the just-added subject-teacher pair
  const added = cls.subjects.find(s =>
    String(s.subject._id) === String(subject._id) &&
    String(s.teacher._id) === String(req.staff._id)
  );
  res.json({
    success: true,
    subject: added
      ? {
          id: added.subject._id,
          name: added.subject.name,
          teacher: added.teacher
            ? {
                id: added.teacher._id,
                name: `${added.teacher.first_name} ${added.teacher.last_name}`,
                email: added.teacher.email
              }
            : null
        }
      : null
  });
});
module.exports = router;
