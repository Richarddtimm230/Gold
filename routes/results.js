const express = require('express');
const router = express.Router();

const Result = require('../models/Result');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Term = require('../models/Term');
const ClassModel = require('../models/Class');
const Subject = require('../models/Subject');

// POST /api/results/upload
// Allows bulk/manual upload of student results
router.post('/upload', async (req, res) => {
  try {
    const { session, term, class: className, subject, results } = req.body;
    // session, term, class, subject are names/ids; results is an array

    // Find or create session
    let sessionObj = await Session.findOne({ name: session });
    if (!sessionObj) sessionObj = await Session.create({ name: session });

    // Find or create term
    let termObj = await Term.findOne({ name: term });
    if (!termObj) termObj = await Term.create({ name: term });

    // Find or create class
    let classObj = await ClassModel.findOne({ name: className });
    if (!classObj) classObj = await ClassModel.create({ name: className });

    // Find or create subject
    let subjectObj = await Subject.findOne({ name: subject });
    if (!subjectObj) subjectObj = await Subject.create({ name: subject });

    // Validate & Insert results
    let insertedResults = [];
    for (const row of results) {
      // Find or create student
      let student = await Student.findOne({ student_id: row.student_id });
      if (!student) {
        student = await Student.create({
          student_id: row.student_id,
          name: row.student_name,
          class: classObj._id
        });
      }

      // Insert result
      const result = await Result.create({
        student: student._id,
        session: sessionObj._id,
        term: termObj._id,
        class: classObj._id,
        subject: subjectObj._id,
        score: row.score,
        grade: row.grade,
        remarks: row.remarks,
        status: row.status || 'Draft'
      });
      insertedResults.push(result);
    }

    res.json({ success: true, inserted: insertedResults.length });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
