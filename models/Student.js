const mongoose = require('mongoose');

const StudentSchema = new mongoose.Schema({
  student_id: { type: String, required: true, unique: true }, // e.g., 'STU001'
  surname: { type: String, required: true },
  firstname: { type: String, required: true },
  othernames: { type: String },
  dob: { type: Date, required: true },
  gender: { type: String, required: true },
  nationality: { type: String },
  state: { type: String },
  lga: { type: String },
  address: { type: String },
  photo: { type: String }, // Store URL or base64 string, or use Buffer for binary

  regNo: { type: String, required: true, unique: true }, // Admission/Registration Number
  class: { type: mongoose.Schema.Types.ObjectId, ref: 'Class', required: true },
  classArm: { type: String },
  previousSchool: { type: String },
  admissionDate: { type: Date },
  academicSession: { type: String },

  parentName: { type: String, required: true },
  parentRelationship: { type: String, required: true },
  parentPhone: { type: String, required: true },
  parentEmail: { type: String },
  parentAddress: { type: String },
  parentOccupation: { type: String },

  studentEmail: { type: String },
  studentPhone: { type: String },

  religion: { type: String },
  bloodGroup: { type: String },
  genotype: { type: String },
  medical: { type: String },

  password: { type: String, required: true }, // Should be hashed before saving!
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Student', StudentSchema);
