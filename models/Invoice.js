const mongoose = require('mongoose');

const InvoiceItemSchema = new mongoose.Schema({
  description: {
    type: String,
    required: true
  },
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  unitPrice: {
    type: Number,
    required: true,
    min: 0
  },
  subtotal: {
    type: Number,
    required: true,
    min: 0
  }
}, { _id: false });

const InvoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    unique: true,
    required: true,
    // Format: INV-XXXXXX
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Student',
    required: true
  },
  items: [InvoiceItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: 0
  },
  tax: {
    type: Number,
    default: 0,
    min: 0
  },
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  netAmount: {
    type: Number,
    required: true,
    min: 0
  },
  status: {
    type: String,
    enum: ['draft', 'sent', 'pending', 'partially_paid', 'paid', 'overdue', 'cancelled'],
    default: 'draft'
  },
  issueDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paymentTerms: {
    type: String,
    enum: ['immediate', 'net15', 'net30', 'net45', 'net60'],
    default: 'net30'
  },
  // Payment tracking
  amountPaid: {
    type: Number,
    default: 0,
    min: 0
  },
  amountDue: {
    type: Number,
    required: true
  },
  lastPaymentDate: Date,
  notes: String,
  internalNotes: String,
  // Issuing details
  issuedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff'
  },
  // Reminders
  remindersSent: {
    type: Number,
    default: 0
  },
  lastReminderDate: Date,
  // Cancellation
  cancelledDate: Date,
  cancellationReason: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Calculate net amount before saving
InvoiceSchema.pre('save', function(next) {
  // Calculate item subtotals
  this.totalAmount = this.items.reduce((sum, item) => {
    item.subtotal = item.quantity * item.unitPrice;
    return sum + item.subtotal;
  }, 0);

  // Calculate net amount
  this.netAmount = this.totalAmount + (this.tax || 0) - (this.discount || 0);
  this.amountDue = this.netAmount - (this.amountPaid || 0);
  
  this.updatedAt = Date.now();
  next();
});

// Index for faster queries
InvoiceSchema.index({ student: 1 });
InvoiceSchema.index({ status: 1, dueDate: 1 });
InvoiceSchema.index({ invoiceNumber: 1 });
InvoiceSchema.index({ issueDate: 1 });

// Export with check for existing model
module.exports = mongoose.models.Invoice || mongoose.model('Invoice', InvoiceSchema);
