const mongoose = require('mongoose');

const ParentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  contact: { type: String },
  families: [{ type: String }], // Names or Family IDs (for now, names)
}, { timestamps: true });

module.exports = mongoose.models.Parent || mongoose.model('Parent', ParentSchema);
