const mongoose = require('mongoose');

const CashRequestSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    required: true,
    // Format: CASH-XXXXXX
  },
  requestedBy: {
    type: String,
    required: true,
    // Name or Staff ID of requester
  },
  staff: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  reason: {
    type: String,
    enum: ['petty_cash', 'operational', 'emergency', 'event', 'purchase', 'other'],
    required: true
  },
  description: String,
  purpose: String,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'disbursed', 'returned', 'cancelled'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: Date,
  disburseDate: Date,
  returnDate: Date,
  // Approval chain
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  approverNotes: String,
  rejectionReason: String,
  // Disbursement details
  disbursedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  disbursementMethod: {
    type: String,
    enum: ['hand_to_hand', 'bank_transfer', 'cheque', 'other'],
    default: 'hand_to_hand'
  },
  // Return management (for accountabilities)
  accountableAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  returnedAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  variance: {
    type: Number,
    default: 0
    // Can be positive (overage) or negative (shortfall)
  },
  // Supporting documents
  receipts: [{
    itemDescription: String,
    amount: Number,
    receiptNumber: String,
    receiptDate: Date,
    receiptUrl: String
  }],
  // Priority and tracking
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  budgetCode: String,
  departmentCode: String,
  // Status tracking
  notes: String,
  internalNotes: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Pre-save hook to generate request number
CashRequestSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('CashRequest').countDocuments();
    this.requestNumber = `CASH-${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
CashRequestSchema.index({ staff: 1 });
CashRequestSchema.index({ status: 1, requestDate: 1 });
CashRequestSchema.index({ reason: 1 });
CashRequestSchema.index({ requestNumber: 1 });
CashRequestSchema.index({ approver: 1 });

// Export with check for existing model
module.exports = mongoose.models.CashRequest || mongoose.model('CashRequest', CashRequestSchema);
