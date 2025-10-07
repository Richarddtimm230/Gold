const mongoose = require('mongoose');

const DraftResultSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: String, required: true }, // or ObjectId ref to Class
  term: { type: String, required: true },
  status: { type: String, default: 'Draft' },
  updated: { type: Date, default: Date.now },
  data: {},
  affectiveRatings: {},
  psychomotorRatings: {},
  attendanceTotal: Number,
  attendancePresent: Number,
  attendanceAbsent: Number,
  attendancePercent: Number
}, { timestamps: true });

module.exports = mongoose.model('DraftResult', DraftResultSchema);
