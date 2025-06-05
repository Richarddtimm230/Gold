const mongoose = require('mongoose');

const SessionSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., '2024-2025'
  is_active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Session', SessionSchema);
