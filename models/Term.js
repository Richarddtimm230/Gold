const mongoose = require('mongoose');

const TermSchema = new mongoose.Schema({
  name: { type: String, required: true }, // e.g., 'FIRST TERM'
  is_active: { type: Boolean, default: true }
});

module.exports = mongoose.model('Term', TermSchema);
