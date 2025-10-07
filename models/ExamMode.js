const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExamModeSchema = new Schema({
  exam: { type: Schema.Types.ObjectId, ref: 'ExamSchedule', required: true },
  mode: { type: String, enum: ['Paper', 'CBT', 'Oral'], required: true },
  duration: { type: Number, required: true } // duration in minutes
}, { timestamps: true });

module.exports = mongoose.model('ExamMode', ExamModeSchema);
