const mongoose = require('mongoose');

const optionSchema = new mongoose.Schema({
  value: { type: String, required: true }
}, { _id: false });

const questionSchema = new mongoose.Schema({
  text: { type: String, required: true }, // HTML (Quill) supported
  options: { type: [optionSchema], required: true },
  answer: { type: Number, required: true }, // index of the correct option
  score: { type: Number, default: 1 }
}, { _id: false });

const examSchema = new mongoose.Schema({
  title: { type: String, required: true },
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  subject: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject', required: true },
  duration: { type: Number, required: true },
  questions: { type: [questionSchema], required: true },
  scheduledFor: { type: Date },
  status: { type: String, enum: ['Draft', 'Scheduled', 'Active', 'Completed', 'Stopped'], default: 'Draft' }
}, { timestamps: true });

module.exports = mongoose.model('Exam', examSchema);
