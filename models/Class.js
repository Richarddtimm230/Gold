const mongoose = require('mongoose');

const ClassSchema = new mongoose.Schema({
  name: { type: String, required: true } // e.g., 'JSS1'
});

module.exports = mongoose.model('Class', ClassSchema);
