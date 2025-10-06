const mongoose = require('mongoose');

const ArmSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true }, // e.g. "A", "B", "C"
  description: { type: String, default: "" }
}, { timestamps: true });

module.exports = mongoose.model('Arm', ArmSchema);
