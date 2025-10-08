const mongoose = require('mongoose');

// --- Subject Schema (used for embedded subject results, NOT primary results) ---
const subjectSchema = new mongoose.Schema({
  name: { type: String, required: true },
  ca1_score: { type: Number, default: 0 },
  ca2_score: { type: Number, default: 0 },
  midterm_score: { type: Number, default: 0 },
  exam_score: { type: Number, default: 0 },
  score: { type: Number, default: 0 }, // total or direct score
  grade: { type: String, default: "" },
  remarks: { type: String, default: "" },
  subject_position: { type: String, default: "" },
  subject_position_num: { type: Number, default: 0 }
}, { _id: false });

// --- Result Schema (UNIVERSAL: Teacher/Admin uploads) ---
const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  session: { type: mongoose.Schema.Types.ObjectId, ref: 'Session', required: true },
  term: { type: mongoose.Schema.Types.ObjectId, ref: 'Term', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },

  // Scores
  ca1_score: { type: Number, default: 0 },
  ca2_score: { type: Number, default: 0 },
  midterm_score: { type: Number, default: 0 },
  exam_score: { type: Number, default: 0 },
  score: { type: Number, default: 0 }, // total or direct score

  // Grading & remarks
  grade: { type: String, default: "" },
  remarks: { type: String, default: "" },

  // Subject positions
  subject_position: { type: String, default: "" },
  subject_position_num: { type: Number, default: 0 },

  // Status (Draft, Published)
  status: { type: String, enum: ["Draft", "Published"], default: "Draft" },

  // Uploader tracking
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }, // Teacher/Admin ID

  // Skills (affective, psychomotor)
  affectiveRatings: { type: Object, default: {} },   // e.g. { Punctuality: 5, ... }
  psychomotorRatings: { type: Object, default: {} }, // e.g. { HandWriting: 4, ... }

  // Attendance info
  attendance: {
    total: { type: Number, default: 0 },
    present: { type: Number, default: 0 },
    absent: { type: Number, default: 0 },
    percent: { type: Number, default: 0 }
  }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
