const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const classSchema = new Schema({
  name: { type: String, required: true, unique: true },
  arms: [String],
  teachers: [{ type: Schema.Types.ObjectId, ref: 'Staff' }],
  subjects: [{
    subject: { type: Schema.Types.ObjectId, ref: 'Subject' },
    teacher: { type: Schema.Types.ObjectId, ref: 'Staff' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Class', classSchema);
