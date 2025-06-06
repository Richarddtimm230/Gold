const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  regNo: { type: String, unique: true, sparse: true }, // for students
  password: { type: String, required: true },
  role: { 
    type: String, 
    enum: ['superadmin', 'admin', 'teacher', 'student'],
    default: 'student'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
