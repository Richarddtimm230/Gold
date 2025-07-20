const express = require('express');
const router = express.Router();

const Result = require('../models/Result');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Term = require('../models/Term');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

async function findOrCreateByName(Model, name, extra = {}) {
  if (!name) return null;
  let doc = await Model.findOne({ name });
  if (doc) return doc;
  doc = new Model({ name, ...extra });
  await doc.save();
  return doc;
}

async function findOrCreateStudent(row, classId) {
  if (!row.student_id) return null;
  let student = await Student.findOne({ student_id: row.student_id });
  if (student) return student;
  student = new Student({
    student_id: row.student_id,
    name: row.student_name,
    class: classId || null
  });
  await student.save();
  return student;
}
router.get('/check', async (req, res) => {
  try {
    const { regNo, scratchCard, class: className, session, term } = req.query;
    // ...validation code...
    let student = await Student.findOne({ regNo }) || await Student.findOne({ student_id: regNo });
    // ...scratch card, class, session, term lookups...

    const results = await Result.find({
      student: student._id,
      class: classObj._id,
      session: sessionObj._id,
      term: termObj._id,
      status: 'Published'
    }).populate('subject');

    // === Always build a skillsReport object ===
    let skillsReport = { skills: { affective: {}, psychomotor: {} }, attendance: {}, comment: "" };
    if (Array.isArray(student.skillsReports)) {
      const found = student.skillsReports.find(r =>
        r.session?.toLowerCase() === session.toLowerCase() &&
        r.term?.toLowerCase() === term.toLowerCase()
      );
      if (found) {
        skillsReport = {
          skills: found.skills || { affective: {}, psychomotor: {} },
          attendance: found.attendance || {},
          comment: found.comment || ""
        };
      }
    }

    // === Always include class info ===
    const classInfo = { name: classObj.name, _id: classObj._id };

    // === Student Info includes class and other details ===
    const studentInfo = {
      name: student.name || `${student.surname || ''} ${student.firstname || ''}`.trim(),
      regNo: student.regNo,
      gender: student.gender,
      DOB: student.dob,
      email: student.studentEmail,
      age: student.age,
      class: classInfo,
      photoBase64: student.photoBase64 || ""
    };

    res.json({
      results: results.map(r => ({
        subject: r.subject?.name || '',
        ca1_score: r.ca1_score || '',
        ca2_score: r.ca2_score || '',
        midterm_score: r.midterm_score || '',
        exam_score: r.exam_score || '',
        total: [r.ca1_score, r.ca2_score, r.midterm_score, r.exam_score].map(n => parseFloat(n || 0)).reduce((a, b) => a + b, 0),
        grade: r.grade || '',
        remarks: r.remarks || '',
      })),
      skillsReport,
      attendance: skillsReport.attendance,
      principalComment: skillsReport.comment, // always present (can be empty string)
      classSize,
      student: studentInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/upload', async (req, res) => {
  try {
    const { session, term, class: className, subject, resultType, results } = req.body;
    const sessionObj = await findOrCreateByName(Session, session);
    const termObj = await findOrCreateByName(Term, term);
    const classObj = await findOrCreateByName(Class, className);
    const subjectObj = await findOrCreateByName(Subject, subject);

    const insertedResults = [];
    for (const row of results) {
      const student = await findOrCreateStudent(row, classObj?._id);
      if (!student || !sessionObj || !termObj || !classObj || !subjectObj) {
        throw new Error(`Missing required reference: student=${!!student}, session=${!!sessionObj}, term=${!!termObj}, class=${!!classObj}, subject=${!!subjectObj}`);
      }

      const resultData = {
        student: student._id,
        session: sessionObj._id,
        term: termObj._id,
        class: classObj._id,
        subject: subjectObj._id,
        grade: row.grade,
        remarks: row.remarks,
        status: row.status || 'Draft'
      };

      resultData[`${resultType}_score`] = row.score;
      const result = new Result(resultData);
      await result.save();
      insertedResults.push(result);
    }

    res.json({ success: true, inserted: insertedResults.length, results: insertedResults });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.student_id) {
      const student = await Student.findOne({ student_id: req.query.student_id });
      if (student) query.student = student._id;
    }
    if (req.query.class) {
      const klass = await Class.findOne({ name: req.query.class });
      if (klass) query.class = klass._id;
    }
    if (req.query.session) {
      const sess = await Session.findOne({ name: req.query.session });
      if (sess) query.session = sess._id;
    }
    if (req.query.term) {
      const term = await Term.findOne({ name: req.query.term });
      if (term) query.term = term._id;
    }
    if (req.query.subject) {
      const subject = await Subject.findOne({ name: req.query.subject });
      if (subject) query.subject = subject._id;
    }

    const results = await Result.find(query)
      .populate('student')
      .populate('class')
      .populate('session')
      .populate('term')
      .populate('subject')
      .sort({ _id: -1 });

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// All :id routes are below /check route!
router.get('/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id)
      .populate('student')
      .populate('session')
      .populate('term')
      .populate('class')
      .populate('subject');
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  try {
    const updated = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true })
      .populate('student')
      .populate('session')
      .populate('term')
      .populate('class')
      .populate('subject');
    if (!updated) return res.status(404).json({ error: 'Result not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updated = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Result not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/:id/publish', async (req, res) => {
  try {
    const updated = await Result.findByIdAndUpdate(req.params.id, { status: 'Published' }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Result not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    const deleted = await Result.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Result not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
