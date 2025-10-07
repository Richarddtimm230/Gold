const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CBTMockResultSchema = new Schema({
  student: { type: Schema.Types.ObjectId, ref: 'Student', required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  session: { type: Schema.Types.ObjectId, ref: 'Session' },
  type: { type: String, enum: ['CBT', 'Mock'], required: true },
  exam: { type: Schema.Types.ObjectId, ref: 'ExamSchedule' },
  mock: { type: Schema.Types.ObjectId, ref: 'CBTMock' },
  score: { type: Number, required: true },
  date: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CBTMockResult', CBTMockResultSchema);
