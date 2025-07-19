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
  student_id: { type: String, required: true, index: true },
  regNo: { type: String, required: false, index: true },
  session: { type: String, required: true, index: true },
  term: { type: String, required: true, index: true },
  class: { type: String, required: true, index: true },
  classArm: { type: String, default: "" },
  subjects: { type: [subjectSchema], default: [] },
  total: { type: Number, default: 0 },
  average: { type: Number, default: 0 },
  position: { type: Number, default: 0 },
  comments: { type: String, default: "" },
  teacherRemarks: { type: String, default: "" },
  principalRemarks: { type: String, default: "" },
  published: { type: Boolean, default: false },
  publishedAt: { type: Date },
  status: { type: String, default: "Draft" }, // "Draft", "Published", etc.
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Result', resultSchema);
