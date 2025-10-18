const mongoose = require('mongoose');

const resultCBTSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true }, // <-- ADD THIS LINE
  answers: [{ type: Number }], // index of selected option for each question
  score: { type: Number },
  startedAt: { type: Date },
  finishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('ResultCBT', resultCBTSchema);
