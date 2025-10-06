const express = require('express');
const router = express.Router();
const studentAuthMiddleware = require('../middleware/studentAuth');
const Student = require('../models/Student');

router.get('/me', studentAuthMiddleware, async (req, res) => {
  try {
    const student = req.student;
    res.json(student.transport || {});
  } catch (err) {
    res.status(500).json({ error: err.message || 'Server error.' });
  }
});

module.exports = router;
