const mongoose = require('mongoose');

const FamilySchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  contact: { type: String },
  parents: [{ type: String }],   // Names or Parent IDs (for now, names)
  students: [{ type: String }],  // Names or Student IDs (for now, names)
}, { timestamps: true });

module.exports = mongoose.model('Family', FamilySchema);
