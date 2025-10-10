const mongoose = require('mongoose');
const ReportPreferenceSchema = new mongoose.Schema({
  _id: { type: String, default: "global" },
  showTeacherRemark: { type: Boolean, default: true },
  showPsychomotorSkills: { type: Boolean, default: true },
  showAffectiveSkills: { type: Boolean, default: true },
  showAttendance: { type: Boolean, default: true },
  showPrincipalComment: { type: Boolean, default: true },
  showSubjectPosition: { type: Boolean, default: true },
  showGradePoints: { type: Boolean, default: true },
  showGPA: { type: Boolean, default: true },
  showResultSummary: { type: Boolean, default: true },
  // --- Additional preferences ---
  showStudentPhoto: { type: Boolean, default: true },
  showClassSize: { type: Boolean, default: true },
  showStudentAge: { type: Boolean, default: true },
  showStudentEmail: { type: Boolean, default: true },
  showNextTermDate: { type: Boolean, default: true },
  showPrintedDate: { type: Boolean, default: true },
  showSchoolMotto: { type: Boolean, default: true },
  showSchoolLogo: { type: Boolean, default: true },
  showCoatOfArms: { type: Boolean, default: true },
  showKeyToGrades: { type: Boolean, default: true },
  showRedSeal: { type: Boolean, default: true },
  showAttendanceNoOfDays: { type: Boolean, default: true },
  showAttendancePresent: { type: Boolean, default: true },
  showAttendanceAbsent: { type: Boolean, default: true },
  showAttendancePercent: { type: Boolean, default: true },
  showResultSummaryLabel: { type: Boolean, default: true },
}, { collection: "reportpreferences" });

module.exports = mongoose.model("ReportPreference", ReportPreferenceSchema);
