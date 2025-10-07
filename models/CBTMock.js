const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const CBTMockSchema = new Schema({
  title: { type: String, required: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class', required: true },
  mode: { type: String, enum: ['Multiple Choice', 'Essay', 'Mixed'], required: true },
  date: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('CBTMock', CBTMockSchema);
