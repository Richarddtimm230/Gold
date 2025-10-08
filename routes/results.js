const express = require('express');
const router = express.Router();

const Result = require('../models/Result');
const Student = require('../models/Student');
const Session = require('../models/Session');
const Term = require('../models/Term');
const Class = require('../models/Class');
const Subject = require('../models/Subject');

/**
 * UTILITY: Assign grade/remark based on total score
 */
function getGradeAndRemark(totalScore) {
  if (totalScore >= 70) return { grade: 'A', remark: 'Excellent' };
  if (totalScore >= 60) return { grade: 'B', remark: 'Very Good' };
  if (totalScore >= 50) return { grade: 'C', remark: 'Good' };
  if (totalScore >= 45) return { grade: 'D', remark: 'Pass' };
  if (totalScore >= 40) return { grade: 'E', remark: 'Poor' };
  return { grade: 'F', remark: 'Fail' };
}
function ordinalSuffix(pos) {
  if (typeof pos !== "number") pos = parseInt(pos);
  if (pos % 100 >= 11 && pos % 100 <= 13) return pos + "th";
  switch (pos % 10) {
    case 1: return pos + "st";
    case 2: return pos + "nd";
    case 3: return pos + "rd";
    default: return pos + "th";
  }
}

/**
 * Calculate and persist subject positions for a class/session/term/subject
 */
async function computeAndPersistSubjectPositions({ classId, sessionId, termId, subjectId }) {
  const filter = {
    class: classId,
    session: sessionId,
    term: termId,
    subject: subjectId,
    status: 'Published'
  };
  const results = await Result.find(filter);
  const arr = results.map(r => {
    let total = 0;
    if (r.ca1_score) total += parseFloat(r.ca1_score) || 0;
    if (r.ca2_score) total += parseFloat(r.ca2_score) || 0;
    if (r.midterm_score) total += parseFloat(r.midterm_score) || 0;
    if (r.exam_score) total += parseFloat(r.exam_score) || 0;
    if (!r.ca1_score && !r.ca2_score && !r.midterm_score && !r.exam_score && r.score) total = parseFloat(r.score) || 0;
    return { id: r._id.toString(), total };
  });
  arr.sort((a, b) => b.total - a.total);
  let posMap = {};
  let currentPos = 1, prevTotal = null, skip = 0;
  for (let i = 0; i < arr.length; i++) {
    if (prevTotal !== null && arr[i].total < prevTotal) {
      currentPos = i + 1; skip = 0;
    } else if (prevTotal !== null && arr[i].total === prevTotal) { skip++; }
    posMap[arr[i].id] = { position: ordinalSuffix(currentPos), numeric: currentPos };
    prevTotal = arr[i].total;
  }
  for (const id in posMap) {
    await Result.findByIdAndUpdate(id, {
      subject_position: posMap[id].position,
      subject_position_num: posMap[id].numeric
    });
  }
  return posMap;
}

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

// --- MAIN CHECK ROUTE (GET /check) ---
router.get('/check', async (req, res) => {
  try {
    const { regNo, scratchCard, class: className, session, term } = req.query;
    if (!regNo || !scratchCard || !className || !session || !term)
      return res.status(400).json({ error: 'Missing required parameters.' });

    let student = await Student.findOne({ regNo }) || await Student.findOne({ student_id: regNo });
    if (!student) return res.status(404).json({ error: 'Student not found.' });

    const storedCard = (student.scratchCard || 'ABCD').trim().toUpperCase();
    if (scratchCard.trim().toUpperCase() !== storedCard) {
      return res.status(401).json({ error: 'Invalid scratch card' });
    }

    const classObj = await Class.findOne({ name: className });
    if (!classObj) return res.status(404).json({ error: 'Result unavailable for selected session and term.' });

    const sessionObj = await Session.findOne({ name: session });
    if (!sessionObj) return res.status(404).json({ error: 'Result unavailable for selected session and term.' });

    const termObj = await Term.findOne({ name: term });
    if (!termObj) return res.status(404).json({ error: 'Result unavailable for selected session and term.' });

    // Find results and populate subject
    const results = await Result.find({
      student: student._id,
      class: classObj._id,
      session: sessionObj._id,
      term: termObj._id,
      status: 'Published'
    }).populate('subject');

    if (!results.length) return res.status(404).json({ error: 'Result unavailable for selected session and term.' });

    // --- Compose result data, auto-fill grade/remark/position ---
    const data = [];
    for (const r of results) {
      let total = 0;
      if (r.ca1_score) total += parseFloat(r.ca1_score) || 0;
      if (r.ca2_score) total += parseFloat(r.ca2_score) || 0;
      if (r.midterm_score) total += parseFloat(r.midterm_score) || 0;
      if (r.exam_score) total += parseFloat(r.exam_score) || 0;
      if (!r.ca1_score && !r.ca2_score && !r.midterm_score && !r.exam_score && r.score) total = parseFloat(r.score) || 0;

      // Assign grade/remark if missing or incorrect in DB
      const { grade, remark } = getGradeAndRemark(total);

      // --- Calculate and persist subject position for this subject ---
      let subjectPos = '';
      if (r.subject && r.subject.name) {
        const posMap = await computeAndPersistSubjectPositions({
          classId: classObj._id,
          sessionId: sessionObj._id,
          termId: termObj._id,
          subjectId: r.subject._id
        });
        subjectPos = posMap[r._id.toString()]?.position || r.subject_position || '';
        if (r.grade !== grade || r.remarks !== remark || r.subject_position !== subjectPos) {
          await Result.findByIdAndUpdate(r._id, {
            grade: grade,
            remarks: remark,
            subject_position: subjectPos
          });
        }
      }

      data.push({
        subject: r.subject?.name || '',
        ca1_score: r.ca1_score || '',
        ca2_score: r.ca2_score || '',
        midterm_score: r.midterm_score || '',
        exam_score: r.exam_score || '',
        total,
        grade,
        remarks: remark,
        subject_position: subjectPos
      });
    }

    const classSize = await Result.distinct('student', {
      class: classObj._id,
      session: sessionObj._id,
      term: termObj._id,
      status: 'Published'
    }).then(students => students.length);

    // --- improved skillsReport and attendance extraction ---
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

    // --- Always send principalComment and attendance at top-level too ---
    const principalComment = skillsReport.comment || "";
    const attendance = skillsReport.attendance || {};

    // --- Add class info to student object ---
    const studentInfo = {
      name: student.name || `${student.surname || ''} ${student.firstname || ''}`.trim(),
      regNo: student.regNo,
      gender: student.gender,
      DOB: student.dob,
      email: student.studentEmail,
      age: student.age,
      class: { name: classObj.name, _id: classObj._id },
      photoBase64: student.photoBase64 || ""
    };

    res.json({
      results: data,
      skillsReport,
      attendance,
      principalComment,
      classSize,
      student: studentInfo
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * BULK UPLOAD
 */
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

/**
 * GET: Filter results. Accepts session, term, student_id, class, subject
 */
router.get('/', async (req, res) => {
  try {
    const query = {};
    if (req.query.session) {
      const sess = await Session.findOne({ name: req.query.session });
      if (!sess) {
        return res.status(404).json({ error: "Result unavailable for selected session and term." });
      }
      query.session = sess._id;
    }
    if (req.query.term) {
      const term = await Term.findOne({ name: req.query.term });
      if (!term) {
        return res.status(404).json({ error: "Result unavailable for selected session and term." });
      }
      query.term = term._id;
    }
    if (req.query.student_id) {
      const student = await Student.findOne({ student_id: req.query.student_id });
      if (student) query.student = student._id;
    }
    if (req.query.class) {
      const klass = await Class.findOne({ name: req.query.class });
      if (klass) query.class = klass._id;
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

    if (!results.length) {
      return res.status(404).json({ error: "Result unavailable for selected session and term." });
    }

    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET: Single result
 */
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

/**
 * UPDATE: Full update
 */
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

/**
 * UPDATE: Partial update
 */
router.patch('/:id', async (req, res) => {
  try {
    const updated = await Result.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Result not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * PUBLISH a result
 */
router.post('/:id/publish', async (req, res) => {
  try {
    const updated = await Result.findByIdAndUpdate(req.params.id, { status: 'Published' }, { new: true });
    if (!updated) return res.status(404).json({ error: 'Result not found' });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE: Remove a result
 */
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
