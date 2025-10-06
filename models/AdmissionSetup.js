const mongoose = require('mongoose');
const AdmissionSetupSchema = new mongoose.Schema({
  session: { type: mongoose.Schema.Types.ObjectId, ref: "Session", required: true },
  term: { type: String, required: true },
  classId: { type: mongoose.Schema.Types.ObjectId, ref: "Class", required: true },
  armId: { type: mongoose.Schema.Types.ObjectId, ref: "Arm", required: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  applicationFee: { type: Number, required: true }
}, { timestamps: true });
module.exports = mongoose.model('AdmissionSetup', AdmissionSetupSchema);
