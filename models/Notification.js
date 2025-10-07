const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  teacher: { type: mongoose.Schema.Types.ObjectId, ref: 'Staff', required: true },
  message: String,
  date: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', NotificationSchema);
