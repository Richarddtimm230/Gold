const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  student_id: { type: String, required: true, unique: true }, // e.g., 'STU001'
  name: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);
