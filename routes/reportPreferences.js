const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const ReportPreference = require('../models/ReportPreference');

// Get current preferences
router.get('/', adminAuth, async (req, res) => {
  let prefs = await ReportPreference.findById("global").lean();
  if (!prefs) {
    prefs = await ReportPreference.create({ _id: "global" }); // default prefs
  }
  res.json(prefs);
});

// Update preferences
router.post('/', adminAuth, async (req, res) => {
  // Only update fields defined in the schema (prevents accidental document pollution)
  const allowedFields = [
    "showTeacherRemark", "showPsychomotorSkills", "showAffectiveSkills", "showAttendance",
    "showPrincipalComment", "showSubjectPosition", "showGradePoints", "showGPA",
    "showResultSummary", "showStudentPhoto", "showClassSize", "showStudentAge",
    "showStudentEmail", "showNextTermDate", "showPrintedDate", "showSchoolMotto",
    "showSchoolLogo", "showCoatOfArms", "showKeyToGrades", "showRedSeal",
    "showAttendanceNoOfDays", "showAttendancePresent", "showAttendanceAbsent",
    "showAttendancePercent", "showResultSummaryLabel"
  ];
  const update = {};
  allowedFields.forEach(field => {
    if (typeof req.body[field] !== 'undefined') update[field] = req.body[field];
  });

  let prefs = await ReportPreference.findByIdAndUpdate(
    "global", update, { upsert: true, new: true }
  );
  res.json(prefs);
});

module.exports = router;
