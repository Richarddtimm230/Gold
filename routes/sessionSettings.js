const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const adminAuth = require('../middleware/adminAuth');

// In-memory storage (replace with database in production)
let sessionSettings = {
  principalName: '',
  classAssignments: {}
};

// GET session settings
router.get('/', authMiddleware, adminAuth, (req, res) => {
  res.json(sessionSettings);
});

// POST/UPDATE session settings
router.post('/', authMiddleware, adminAuth, (req, res) => {
  try {
    const { principalName, classAssignments } = req.body;

    sessionSettings.principalName = principalName || '';
    sessionSettings.classAssignments = classAssignments || {};

    res.json({
      success: true,
      message: 'Session settings saved successfully',
      data: sessionSettings
    });
  } catch (err) {
    res.status(500).json({ message: 'Error saving session settings', error: err.message });
  }
});

module.exports = router;
