const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  // Unique identifier
  _id: { type: mongoose.Schema.Types.ObjectId, auto: true },
  teacher_id: { type: String, index: true, unique: true, sparse: true },

  // Basic info
  firstname: { type: String, required: true },
  surname: { type: String, required: true },
  othernames: { type: String, default: "" },
  gender: { type: String, default: "" },
  dob: { type: Date },

  // Contact info
  email: { type: String, index: true, unique: true, sparse: true },
  phone: { type: String, default: "" },
  address: { type: String, default: "" },

  // Account info
  password: { type: String },
  login_password: { type: String }, // If separate from hashed password
  role: { type: String, default: "teacher" },

  // Professional info
  staffNo: { type: String, index: true, unique: true, sparse: true }, // Staff number
  subjects: [{ type: String }], // Names or codes of subjects taught
  classes: [{ type: String }],  // Names or codes of classes taught

  // Profile image
  photoBase64: { type: String, default: "" },

  // Extra fields
  qualifications: { type: String, default: "" },
  employmentDate: { type: Date },
  status: { type: String, default: "active" },

  // Auditing
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Teacher', teacherSchema);
