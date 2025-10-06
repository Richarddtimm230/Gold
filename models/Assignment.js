const mongoose = require('mongoose');

const AssignmentSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, default: "" },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  assignedTo: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Student' }], // which students
  class: { type: String }, // optional: class name/id for bulk assignment
  files: [{ url: String, name: String }], // assignment files
  dueDate: { type: Date, required: true },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }, // or 'Teacher'
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

module.exports = mongoose.model('Assignment', AssignmentSchema);
