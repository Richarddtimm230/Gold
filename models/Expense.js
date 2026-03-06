const mongoose = require('mongoose');

const ExpenseSchema = new mongoose.Schema({
  requestNumber: {
    type: String,
    unique: true,
    required: true,
    // Format: EXP-XXXXXX
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
  category: {
    type: String,
    enum: ['supplies', 'utilities', 'maintenance', 'transport', 'staff', 'equipment', 'repairs', 'other'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  purpose: {
    type: String,
    required: true
  },
  description: String,
  attachments: [{
    fileName: String,
    fileUrl: String,
    uploadedAt: Date
  }],
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected', 'paid', 'cancelled'],
    default: 'pending'
  },
  requestDate: {
    type: Date,
    default: Date.now
  },
  approvalDate: Date,
  paidDate: Date,
  // Approval chain
  approver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  approverNotes: String,
  rejectionReason: String,
  // Payment details
  paymentMethod: {
    type: String,
    enum: ['cash', 'bank_transfer', 'cheque', 'other'],
    default: 'bank_transfer'
  },
  paymentReference: String,
  paidBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  // Budget tracking
  budgetCode: String,
  departmentCode: String,
  project: String,
  // Receipts and documentation
  receiptNumber: String,
  receiptAmount: Number,
  receiptDate: Date,
  // Additional fields
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  notes: String,
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
ExpenseSchema.pre('save', async function(next) {
  if (!this.requestNumber) {
    const count = await mongoose.model('Expense').countDocuments();
    this.requestNumber = `EXP-${String(count + 1).padStart(6, '0')}`;
  }
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
ExpenseSchema.index({ staff: 1 });
ExpenseSchema.index({ status: 1, requestDate: 1 });
ExpenseSchema.index({ category: 1 });
ExpenseSchema.index({ requestNumber: 1 });
ExpenseSchema.index({ approver: 1 });

// Export with check for existing model
module.exports = mongoose.models.Expense || mongoose.model('Expense', ExpenseSchema);
