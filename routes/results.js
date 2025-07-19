const express = require('express');
const router = express.Router();

const mongoose = require('mongoose');
const Result = require('../models/Result');
const Student = require('../models/Student');

// Helper: Find or create by name for Session, Term, Class, Subject
async function findOrCreate(model, field, value, extra = {}) {
  if (!value) return null;
  let doc = await model.findOne({ [field]: value });
  if (doc) return doc;
  doc = await model.create({ [field]: value, ...extra });
  return doc;
}

// Helper: Find or create student by student_id
async function findOrCreateStudent(row, className) {
  if (!row.student_id) return null;
  let student = await Student.findOne({ student_id: row.student_id });
  if (student) return student;
  student = await Student.create({
    student_id: row.student_id,
    surname: row.surname || "",
    firstname: row.firstname || "",
    class: className || "",
    name: row.student_name || (row.firstname || "") + " " + (row.surname || ""),
    regNo: row.regNo || "",
  });
  return student;
}

// POST /api/results/upload - Bulk/manual upload of student results
router.post('/upload', async (req, res) => {
  try {
    const { session, term, class: className, subject, resultType, results } = req.body;
    let insertedResults = [];
    for (const row of results) {
      // Find or create student
      let student = await findOrCreateStudent(row, className);

      // Build subjects array for Result model
      const subjectEntry = {
        name: subject,
        score: row.score,
        grade: row.grade,
        remarks: row.remarks,
      };
      // Support resultType (exam, ca1, ca2, midterm)
      if (resultType === "exam") subjectEntry.exam_score = row.score;
      else if (resultType === "ca1") subjectEntry.ca1_score = row.score;
      else if (resultType === "ca2") subjectEntry.ca2_score = row.score;
      else if (resultType === "midterm") subjectEntry.midterm_score = row.score;

      // Compose the result
      const newResult = await Result.create({
        student_id: student.student_id,
        regNo: student.regNo,
        session: session,
        term: term,
        class: className,
        classArm: row.classArm || "",
        subjects: [subjectEntry],
        total: row.total || row.score || 0,
        average: row.average || 0,
        position: row.position || 0,
        comments: row.remarks,
        teacherRemarks: row.teacherRemarks || "",
        principalRemarks: row.principalRemarks || "",
        published: false,
        createdAt: new Date(),
        updatedAt: new Date(),
        status: row.status || "Draft",
      });
      insertedResults.push(newResult);
    }
    res.json({ success: true, inserted: insertedResults.length, results: insertedResults });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// GET /api/results - Fetch all results with populated references
router.get('/', async (req, res) => {
  try {
    const { student_id, class: className, session, term, subject } = req.query;
    let query = {};
    if (student_id) query.student_id = student_id;
    if (className) query.class = className;
    if (session) query.session = session;
    if (term) query.term = term;
    if (subject) query['subjects.name'] = subject;

    const results = await Result.find(query).sort({ createdAt: -1 });

    // Populate student details
    const populatedResults = await Promise.all(results.map(async (result) => {
      let student = await Student.findOne({ student_id: result.student_id });
      return {
        ...result.toObject(),
        student: student ? {
          student_id: student.student_id,
          name: (student.firstname || "") + " " + (student.surname || ""),
          regNo: student.regNo,
          gender: student.gender,
          dob: student.dob,
          email: student.studentEmail,
        } : null
      };
    }));
    res.json(populatedResults);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/:id - Fetch a single result by ID
router.get('/:id', async (req, res) => {
  try {
    const result = await Result.findById(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found' });

    let student = await Student.findOne({ student_id: result.student_id });
    const output = {
      ...result.toObject(),
      student: student ? {
        student_id: student.student_id,
        name: (student.firstname || "") + " " + (student.surname || ""),
        regNo: student.regNo,
        gender: student.gender,
        dob: student.dob,
        email: student.studentEmail,
      } : null
    };
    res.json(output);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/results/:id - Update a result (full update)
router.put('/:id', async (req, res) => {
  try {
    const update = req.body;
    update.updatedAt = new Date();
    const result = await Result.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!result) return res.status(404).json({ error: 'Result not found' });

    let student = await Student.findOne({ student_id: result.student_id });
    const output = {
      ...result.toObject(),
      student: student ? {
        student_id: student.student_id,
        name: (student.firstname || "") + " " + (student.surname || ""),
        regNo: student.regNo,
        gender: student.gender,
        dob: student.dob,
        email: student.studentEmail,
      } : null
    };
    res.json(output);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PATCH /api/results/:id - Partial update (edit)
router.patch('/:id', async (req, res) => {
  try {
    const update = req.body;
    update.updatedAt = new Date();
    const result = await Result.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/results/:id/publish - Set status = "Published"
router.post('/:id/publish', async (req, res) => {
  try {
    const result = await Result.findByIdAndUpdate(
      req.params.id,
      { published: true, status: "Published", publishedAt: new Date(), updatedAt: new Date() },
      { new: true }
    );
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/results/:id - Delete a result
router.delete('/:id', async (req, res) => {
  try {
    const result = await Result.findByIdAndDelete(req.params.id);
    if (!result) return res.status(404).json({ error: 'Result not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/results/check - Result check endpoint
router.get('/check', async (req, res) => {
  try {
    const { regNo, scratchCard, class: className, session, term } = req.query;
    if (!regNo || !scratchCard || !className || !session || !term)
      return res.status(400).json({ error: 'Missing required parameters.' });

    // Find student by regNo or student_id (case-insensitive)
    let student = await Student.findOne({ regNo });
    if (!student) student = await Student.findOne({ student_id: regNo });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    // Scratch card logic
    const defaultScratch = 'ABCD';
    const studentScratch = student.scratchCard && student.scratchCard.trim().length > 0
      ? student.scratchCard.trim().toUpperCase()
      : defaultScratch;
    if (scratchCard.trim().toUpperCase() !== studentScratch) {
      return res.status(401).json({ error: 'Invalid scratch card' });
    }

    // Query results for the student, class, session, term, published
    const results = await Result.find({
      student_id: student.student_id,
      class: className,
      session: session,
      term: term,
      published: true,
      status: "Published"
    });

    // Compose table of subjects & scores
    const formattedResults = results.flatMap(result =>
      (result.subjects || []).map(subject => ({
        subject: subject.name || "",
        ca1_score: subject.ca1_score || "",
        ca2_score: subject.ca2_score || "",
        midterm_score: subject.midterm_score || "",
        exam_score: subject.exam_score || "",
        total: subject.total || subject.score || "",
        grade: subject.grade || "",
        remark: subject.remarks || ""
      }))
    );

    // Skills report for the session/term
    let skillsReport = null;
    if (Array.isArray(student.skillsReports)) {
      skillsReport = student.skillsReports.find(r =>
        r.session?.toLowerCase() === session.toLowerCase() &&
        r.term?.toLowerCase() === term.toLowerCase()
      );
    }

    // Calculate class size
    const classmates = await Result.find({
      class: className,
      session: session,
      term: term,
      published: true,
      status: "Published"
    });
    const studentIds = new Set(classmates.map(r => r.student_id));
    const classSize = studentIds.size;

    // Extra student info
    const studentInfo = {
      name: student.name || student.surname + ' ' + student.firstname,
      regNo: student.regNo,
      gender: student.gender,
      DOB: student.dob,
      email: student.studentEmail,
      age: student.age
    };

    if (!formattedResults.length) return res.status(404).json({ error: 'No result found.' });

    res.json({
      results: formattedResults,
      skillsReport: skillsReport || null,
      classSize,
      student: studentInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
