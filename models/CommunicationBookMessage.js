const mongoose = require('mongoose');

const CommunicationBookMessageSchema = new mongoose.Schema({
  class: { type: String, required: true },
  student: { type: String, required: true }, // Student ID or regNo
  senderId: { type: String },
  senderName: { type: String },
  senderRole: { type: String, enum: ['teacher', 'student', 'admin'], required: true },
  content: { type: String, required: true },
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('CommunicationBookMessage', CommunicationBookMessageSchema);
