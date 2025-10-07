const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const subjectSchema = new Schema({
  name: { type: String, required: true, unique: true },
  class: { type: Schema.Types.ObjectId, ref: 'Class' },      // Assigned class (optional for global subjects)
  teacher: { type: Schema.Types.ObjectId, ref: 'Staff' }     // Assigned teacher (optional)
});

module.exports = mongoose.model('Subject', subjectSchema);
