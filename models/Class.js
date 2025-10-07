
const mongoose = require('mongoose');

const teacherSchema = new mongoose.Schema({
  name: String,
  arm: String // optional
}, { _id: false });

const classSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true },
  arms: [String],
  subjects: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Subject' }],
  teachers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Staff' }]
});

module.exports = mongoose.model('Class', classSchema);
