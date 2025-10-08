const mongoose = require('mongoose');

const resultSchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  answers: [{ type: Number }], // index of selected option for each question
  score: { type: Number },
  startedAt: { type: Date },
  finishedAt: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Result', resultSchema);
