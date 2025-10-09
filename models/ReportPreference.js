const mongoose = require('mongoose');
const ReportPreferenceSchema = new mongoose.Schema({
  // Only one document is needed; use a static ID or adminId if you want per-admin
  _id: { type: String, default: "global" },
  showTeacherRemark: { type: Boolean, default: true },
  showPsychomotorSkills: { type: Boolean, default: true },
  showAffectiveSkills: { type: Boolean, default: true },
  showAttendance: { type: Boolean, default: true },
  showPrincipalComment: { type: Boolean, default: true },
  showSubjectPosition: { type: Boolean, default: true },
  showGradePoints: { type: Boolean, default: true },
  showGPA: { type: Boolean, default: true },
  showResultSummary: { type: Boolean, default: true }
}, { collection: "reportpreferences" });

module.exports = mongoose.model("ReportPreference", ReportPreferenceSchema);
