const mongoose = require('mongoose');

const SalaryPaymentSchema = new mongoose.Schema({
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  month: {
    type: String,
    enum: ['January', 'February', 'March', 'April', 'May', 'June', 
           'July', 'August', 'September', 'October', 'November', 'December'],
    required: true
  },
  year: {
    type: Number,
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['Paid', 'Unpaid', 'Pending', 'Waived'],
    default: 'Unpaid'
  },
  method: {
    type: String,
    enum: ['Cash', 'Bank Transfer', 'Check', 'Mobile Money'],
    default: null
  },
  reference: String, // Check number, transfer reference, etc.
  waiveNote: String, // Reason for waiving
  notes: String,
  paidDate: Date,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster queries
SalaryPaymentSchema.index({ staff: 1, year: 1, month: 1 });
SalaryPaymentSchema.index({ status: 1 });
SalaryPaymentSchema.index({ paidDate: -1 });

module.exports = mongoose.model('SalaryPayment', SalaryPaymentSchema);
