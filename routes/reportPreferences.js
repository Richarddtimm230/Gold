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
  // Only allow update of defined fields to prevent unwanted keys
  const allowedFields = [
    "showTeacherRemark", "showPsychomotorSkills", "showAffectiveSkills", "showAttendance",
    "showPrincipalComment", "showSubjectPosition", "showGradePoints", "showGPA", "showResultSummary",
    "showStudentPhoto", "showClassSize", "showStudentAge", "showStudentEmail", "showNextTermDate",
    "showPrintedDate", "showSchoolMotto", "showSchoolLogo", "showCoatOfArms", "showKeyToGrades",
    "showRedSeal", "showAttendanceNoOfDays", "showAttendancePresent", "showAttendanceAbsent", "showAttendancePercent"
  ];
  const toUpdate = {};
  allowedFields.forEach(f => { if (f in req.body) toUpdate[f] = req.body[f]; });

  let prefs = await ReportPreference.findByIdAndUpdate(
    "global", toUpdate, { upsert: true, new: true }
  );
  res.json(prefs);
});

module.exports = router;
