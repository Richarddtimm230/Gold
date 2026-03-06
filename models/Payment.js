const mongoose = require('mongoose');

const PaymentSchema = new mongoose.Schema({
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  invoice: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Invoice'
  },
  fee: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Fee'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  receiptNumber: {
    type: String,
    unique: true,
    required: true,
    // Auto-generated format: RCP-XXXXXX
  },
  status: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'],
    default: 'pending'
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'card', 'cheque', 'mobile_money', 'online', 'other'],
    required: true
  },
  transactionDate: {
    type: Date,
    default: Date.now
  },
  processedDate: Date,
  // For online/card payments
  paymentGateway: {
    type: String,
    enum: ['paystack', 'flutterwave', 'stripe', 'manual', 'none'],
    default: 'manual'
  },
  transactionRef: {
    type: String,
    // Reference from payment gateway
  },
  // For bank transfers
  bankName: String,
  bankAccountNumber: String,
  bankAccountName: String,
  // For cheques
  chequeNumber: String,
  chequeDate: Date,
  // For mobile money
  mobileNumber: String,
  mobileProvider: String,
  // Additional details
  description: String,
  notes: String,
  // Processing staff
  processedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  verificationStatus: {
    type: String,
    enum: ['unverified', 'verified', 'disputed'],
    default: 'unverified'
  },
  verifiedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  verifiedDate: Date,
  // Refund details (if applicable)
  refundAmount: {
    type: Number,
    default: 0
  },
  refundReason: String,
  refundDate: Date,
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
PaymentSchema.index({ student: 1 });
PaymentSchema.index({ status: 1, transactionDate: 1 });
PaymentSchema.index({ receiptNumber: 1 });
PaymentSchema.index({ invoice: 1 });
PaymentSchema.index({ fee: 1 });

// Pre-save hook to generate receipt number
PaymentSchema.pre('save', async function(next) {
  if (!this.receiptNumber) {
    const count = await mongoose.model('Payment').countDocuments();
    this.receiptNumber = `RCP-${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Export with check for existing model
module.exports = mongoose.models.Payment || mongoose.model('Payment', PaymentSchema);
