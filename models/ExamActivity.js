const mongoose = require('mongoose');

const activitySchema = new mongoose.Schema({
  student: { type: mongoose.Schema.Types.ObjectId, ref: 'Student', required: true },
  exam: { type: mongoose.Schema.Types.ObjectId, ref: 'Exam', required: true },
  startedAt: { type: Date },
  finishedAt: { type: Date },
  status: { type: String, enum: ['Started', 'In Progress', 'Finished', 'Abandoned'], default: 'Started' },
  activityLog: [{ 
    timestamp: { type: Date, default: Date.now },
    event: String,
    meta: mongoose.Schema.Types.Mixed
  }]
}, { timestamps: true });

module.exports = mongoose.model('Activity', activitySchema);
