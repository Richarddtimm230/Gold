const express = require('express');
const router = express.Router();
const Student = require('../models/Student');
const studentAuth = require('../middleware/studentAuth');

// GET /api/fees/me - Return current student's fee summary and breakdown
router.get('/me', studentAuth, async (req, res) => {
  try {
    const student = req.student;
    const fees = Array.isArray(student.fees) ? student.fees : [];

    let paid = 0, due = 0, total = 0;
    let breakdown = [];

    for (const fee of fees) {
      total += fee.amount || 0;
      if (String(fee.status).toLowerCase() === 'paid' || String(fee.status).toLowerCase() === 'waived') {
        paid += fee.amount || 0;
      } else {
        due += fee.amount || 0;
      }
      breakdown.push({
        type: fee.type,
        amount: fee.amount,
        status: fee.status,
        session: fee.session,
        term: fee.term,
        due: fee.date ? (new Date(fee.date)).toISOString().slice(0, 10) : "",
        method: fee.method || ""
      });
    }

    res.json({
      name: student.firstname + ' ' + student.surname,
      photo_url: student.photoBase64 || '',
      fees: {
        paid,
        due,
        total,
        breakdown
      }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/fees/class/:classId/me - Return all unique fees for the student's class
router.get('/class/:classId/me', studentAuth, async (req, res) => {
  try {
    const { classId } = req.params;
    // Find all students in this class
    const studentsInClass = await Student.find({ class: classId });
    // Aggregate all unique fees for the class
    const feeMap = {};
    studentsInClass.forEach(student => {
      (student.fees || []).forEach(fee => {
        const key = [fee.term, fee.session, fee.type, fee.amount].join(":");
        feeMap[key] = {
          class: { name: classId },
          term: fee.term,
          session: fee.session,
          type: fee.type,
          amount: fee.amount,
          status: fee.status,
          dueDate: fee.date ? (new Date(fee.date)).toISOString().slice(0,10) : ""
        };
      });
    });
    // Return unique fee structures
    res.json(Object.values(feeMap));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
