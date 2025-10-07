const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ExamScheduleSchema = new Schema({
  title: { type: String, required: true },
  term: { type: Schema.Types.ObjectId, ref: 'Term', required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  date: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('ExamSchedule', ExamScheduleSchema);
