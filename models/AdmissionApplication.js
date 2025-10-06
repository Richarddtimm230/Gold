const mongoose = require('mongoose');
const AdmissionApplicationSchema = new mongoose.Schema({
  name: { type: String, required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  term: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  armId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm", required: true },
  dateApplied: { type: Date, default: Date.now },
  status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
  email: String,
  phone: String,
  documents: String,
  // Any other applicant fields...
}, { timestamps: true });
module.exports = mongoose.model('AdmissionApplication', AdmissionApplicationSchema);
