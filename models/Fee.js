const mongoose = require('mongoose');

const FeeSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  class: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Class',
    required: true
  },
  feeType: {
    type: String,
    enum: ['tuition', 'hostel', 'transport', 'uniform', 'books', 'exam', 'sports', 'activity', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['paid', 'pending', 'overdue', 'waived', 'partial'],
    default: 'pending'
  },
  term: {
    type: String,
    enum: ['Term 1', 'Term 2', 'Term 3'],
    required: true
  },
  session: {
    type: String,
    required: true,
    // e.g., "2023/2024"
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentDate: {
    type: Date
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque', 'other'],
    default: null
  },
  transactionRef: {
    type: String,
    // Reference number for the payment
  },
  description: String,
  notes: String,
  waiverReason: {
    type: String,
    // If fee is waived, reason for waiver
  },
  waivedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    // Admin who waived the fee
  },
  waivedDate: Date,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for faster queries
FeeSchema.index({ student: 1, term: 1, session: 1 });
FeeSchema.index({ status: 1, dueDate: 1 });
FeeSchema.index({ class: 1 });

// Update the updatedAt timestamp before saving
FeeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Export with check for existing model
module.exports = mongoose.models.Fee || mongoose.model('Fee', FeeSchema);
