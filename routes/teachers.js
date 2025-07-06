const express = require('express');
const router = express.Router();

// Middleware to check authentication (use your actual auth middleware!)
const { authMiddleware } = require('./auth'); // adjust path as needed

// Firestore DB instance (attach via req.app.locals.firestoreDB if using app.js setup)
const db = require('../firestore');

// Get the teachers collection
function teachersCollection(req) {
  return (req.app && req.app.locals.firestoreDB ? req.app.locals.firestoreDB : db).collection('teachers');
}

/**
 * GET /api/teachers/me - Returns profile of currently logged-in teacher
 */
router.get('/me', authMiddleware, async (req, res) => {
  try {
    // req.user should have teacher's unique id (set by auth middleware)
    const teacherId = req.user && (req.user.teacher_id || req.user.uid || req.user.id);
    if (!teacherId) return res.status(401).json({ error: "Unauthorized: No teacher ID." });

    const doc = await teachersCollection(req).doc(teacherId).get();
    if (!doc.exists) return res.status(404).json({ error: "Teacher not found" });

    const teacher = doc.data();
    // Remove sensitive info
    delete teacher.password;
    delete teacher.login_password;
    // Add id field for frontend
    teacher.id = teacherId;

    res.json(teacher);
  } catch (err) {
    res.status(500).json({ error: err.message || "Server error" });
  }
});

module.exports = router;
