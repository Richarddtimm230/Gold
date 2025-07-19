const mongoose = require('mongoose');

// --- Subject Schema ---
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ca1_score: { type: Number, default: 0 },
  ca2_score: { type: Number, default: 0 },
  midterm_score: { type: Number, default: 0 },
  exam_score: { type: Number, default: 0 },
  score: { type: Number, default: 0 }, // total or direct score
  grade: { type: String, default: "" },
  remarks: { type: String, default: "" }
}, { _id: false });

// --- Result Schema ---
const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'Term', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  ca1_score: { type: Number, default: 0 },
  ca2_score: { type: Number, default: 0 },
  midterm_score: { type: Number, default: 0 },
  exam_score: { type: Number, default: 0 },
  score: { type: Number, default: 0 },
  grade: { type: String, default: "" },
  remarks: { type: String, default: "" },
  status: { type: String, default: "Draft" }
}, { timestamps: true });



module.exports = mongoose.model('Result', resultSchema);
