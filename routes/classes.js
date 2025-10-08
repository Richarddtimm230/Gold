// Converted class API to Mongoose
const express = require('express');
const router = express.Router();

const Class = require('../models/Class');
const Subject = require('../models/Subject');
// ... other code above

// Only keep THIS endpoint for adding subjects to a class as a teacher
const teacherAuth = require('../middleware/teacherAuth'); // Add this at top if not present

router.post('/:classId/subjects', teacherAuth, async (req, res) => {
  const { classId } = req.params;
  const { subjectName } = req.body;

  if (!subjectName || !subjectName.trim()) {
    return res.status(400).json({ error: "Subject name required" });
  }

  // Find or create subject, and ensure its class field is set
  let subject = await Subject.findOne({ name: subjectName.trim() });
  if (!subject) {
    subject = new Subject({ name: subjectName.trim(), class: classId });
    await subject.save();
  } else if (!subject.class || String(subject.class) !== String(classId)) {
    subject.class = classId;
    await subject.save();
  }

  const cls = await Class.findById(classId);
  if (!cls) return res.status(404).json({ error: "Class not found" });

  let justAdded = null;
  if (!cls.subjects.some(s =>
    s.subject &&
    String(s.subject._id) === String(subject._id) &&
    String(s.teacher) === String(req.staff._id)
  )) {
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
    s.subject &&
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
// NOTE: No authentication middleware here, so all authenticated users can access
router.get('/', async (req, res) => {
  try {
    const teacherId = req.query.teacher_id;
    let query = {};
    if (teacherId) query.teachers = teacherId; // teachers should be array of ObjectId
    const classes = await Class.find(query).populate('subjects');
    const output = classes.map(cls => {
      return {
        id: cls._id,
        name: cls.name,
        arms: Array.isArray(cls.arms) ? cls.arms : [],
        teachers: Array.isArray(cls.teachers) ? cls.teachers : [],
        subjects: cls.subjects.map(sub => ({ id: sub._id, name: sub.name }))
      };
    });
    res.json({ classes: output });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


// POST /api/classes/:id/teachers
router.post('/:id/teachers', async (req, res) => {
  try {
    const { teacherId } = req.body;
    if (!teacherId) return res.status(400).json({ error: 'Teacher ID required' });

    const cls = await Class.findById(req.params.id);
    if (!cls) return res.status(404).json({ error: 'Class not found' });

    cls.teachers.push(teacherId);
    await cls.save();

    res.json({ id: cls._id, ...cls.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// POST /api/classes - Create a new class
router.post('/', async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ error: 'Class name required' });

    const existing = await Class.findOne({ name });
    if (existing) return res.status(409).json({ error: 'Class already exists' });

    const newClass = new Class({ name, arms: [], subjects: [], teachers: [] });
    await newClass.save();
    res.status(201).json({ id: newClass._id, name });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/arms - Add/replace arms
router.post('/:id/arms', async (req, res) => {
  try {
    const { arms } = req.body;
    if (!Array.isArray(arms)) return res.status(400).json({ error: 'Arms array required' });

    const updated = await Class.findByIdAndUpdate(req.params.id, { arms }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Class not found' });

    res.json({ id: updated._id, ...updated.toObject() });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/classes/:id/subjects - Add/replace subjects
router.post('/non/:id/subjects', async (req, res) => {
  try {
    const { subjects } = req.body;
    if (!Array.isArray(subjects)) return res.status(400).json({ error: 'Subjects array required' });

    const subjectIds = [];
    for (const subj of subjects) {
      let found = null;
      if (typeof subj === 'string' && subj.length === 24) {
        found = await Subject.findById(subj);
      }
      if (!found) {
        found = await Subject.findOne({ name: subj });
      }
      if (!found) {
        const created = new Subject({ name: subj });
        await created.save();
        found = created;
      }
      subjectIds.push(found._id);
    }

    const updated = await Class.findByIdAndUpdate(req.params.id, { subjects: subjectIds }, { new: true }).populate('subjects');
    if (!updated) return res.status(404).json({ error: 'Class not found' });

    res.json({
      id: updated._id,
      name: updated.name,
      arms: updated.arms,
      teachers: updated.teachers,
      subjects: updated.subjects.map(sub => ({ id: sub._id, name: sub.name }))
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});



module.exports = router;
