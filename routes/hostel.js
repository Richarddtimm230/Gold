// Example routes/hostel.js
const express = require('express');
const router = express.Router();
const studentAuthMiddleware = require('../middleware/studentAuth');
const Student = require('../models/Student');

router.get('/fees/me', studentAuthMiddleware, async (req, res) => {
  try {
    const student = req.student;
    // Assuming hostel fees are stored on the student model, adjust as needed
    res.json(student.fees?.filter(f => f.type === 'hostel') || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

