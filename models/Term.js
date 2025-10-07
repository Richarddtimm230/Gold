const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const TermSchema = new Schema({
  name: { type: String, required: true },
  session: { type: Schema.Types.ObjectId, ref: 'Session', required: true },
  startDate: { type: Date },
  endDate: { type: Date }
}, { timestamps: true });

module.exports = mongoose.model('Term', TermSchema);
