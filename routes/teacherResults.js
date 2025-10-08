const express = require('express');
const router = express.Router();
const Result = require('../models/Result');
const Student = require('../models/Student');
const Class = require('../models/Class');
const Subject = require('../models/Subject');
const teacherAuth = require('../middleware/teacherAuth'); // sets req.staff

// --- TEACHER UPLOAD RESULTS ---
// POST /api/teachers/:id/results
router.post('/:id/results', teacherAuth, async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { student, class: classId, term, session, subjects, affectiveRatings, psychomotorRatings, attendanceTotal, attendancePresent, attendanceAbsent, attendancePercent, status } = req.body;

    // subjects: array of { subject, ca, mid, exam, comment }
    if (!Array.isArray(subjects) || !student || !classId)
      return res.status(400).json({ error: "Missing required fields." });

    const savedResults = [];

    for (const subjScore of subjects) {
      const { subject, ca, mid, exam, comment } = subjScore;

      // Compose result document
      const resultDoc = new Result({
        student,
        class: classId,
        term,
        session,
        subject,
        ca1_score: ca, // or ca1_score/midterm_score/exam_score as per your schema
        midterm_score: mid,
        exam_score: exam,
        remarks: comment,
        affectiveRatings, // Save as object
        psychomotorRatings, // Save as object
        attendance: {
          total: attendanceTotal,
          present: attendancePresent,
          absent: attendanceAbsent,
          percent: attendancePercent
        },
        createdBy: teacherId,
        status: status || 'Draft'
      });

      await resultDoc.save();
      savedResults.push(resultDoc);
    }

    res.json({ success: true, inserted: savedResults.length, results: savedResults });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEACHER VIEW OWN UPLOADED RESULTS ---
// GET /api/teachers/:id/results?class={classId}&student={studentId}&status={Published|Draft}
router.get('/:id/results', teacherAuth, async (req, res) => {
  try {
    const teacherId = req.params.id;
    const { class: classId, student, status } = req.query;
    const query = { createdBy: teacherId };

    if (classId) query.class = classId;
    if (student) query.student = student;
    if (status) query.status = status;

    const results = await Result.find(query)
      .populate('student')
      .populate('class')
      .populate('subject');

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// --- TEACHER VIEW ALL RESULTS FOR A CLASS ---
// GET /api/teachers/:id/class-results?class={classId}&status={Published|Draft}
router.get('/:id/class-results', teacherAuth, async (req, res) => {
  try {
    const { class: classId, status } = req.query;
    if (!classId) return res.status(400).json({ error: "classId is required." });

    const query = { class: classId };
    if (status) query.status = status;

    const results = await Result.find(query)
      .populate('student')
      .populate('class')
      .populate('subject');

    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
