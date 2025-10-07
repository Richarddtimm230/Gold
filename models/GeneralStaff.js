const mongoose = require('mongoose');

const GeneralStaffSchema = new mongoose.Schema({
  name: { type: String, required: true },
  position: { type: String, required: true },
  contact: { type: String },
  duties: [{ type: String }]
}, { timestamps: true });

module.exports = mongoose.model('GeneralStaff', GeneralStaffSchema);
