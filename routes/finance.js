const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const { authMiddleware } = require('./auth');
const adminAuth = require('../middleware/adminAuth');

// Models
const Fee = require('../models/Fee');
const Payment = require('../models/Payment');
const Invoice = require('../models/Invoice');
const Expense = require('../models/Expense');
const CashRequest = require('../models/CashRequest');
const Student = require('../models/Student');
const Class = require('../models/Class');

// ===== DASHBOARD STATISTICS =====

/**
 * GET /api/finance/statistics
 * Returns financial overview: total revenue, payments, pending, expenses
 */
router.get('/statistics', authMiddleware, adminAuth, async (req, res) => {
  try {
    const paidPayments = await Payment.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const pendingFees = await Fee.aggregate([
      { $match: { status: { $in: ['pending', 'overdue'] } } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const expenses = await Expense.aggregate([
      { $match: { status: 'approved' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]);

    const totalRevenue = (paidPayments[0]?.total || 0) + (await Fee.aggregate([
      { $match: { status: 'paid' } },
      { $group: { _id: null, total: { $sum: '$amount' } } }
    ]))[0]?.total || 0;

    res.json({
      totalRevenue,
      totalPayments: paidPayments[0]?.total || 0,
      totalPending: pendingFees[0]?.total || 0,
      totalExpenses: expenses[0]?.total || 0
    });
  } catch (err) {
    console.error('Error fetching statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== FEE MANAGEMENT =====

/**
 * GET /api/finance/fees
 * Fetch all student fees with filtering
 */
router.get('/fees', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, term, classId, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (term) query.term = term;
    if (classId) query.class = classId;
    if (search) {
      query.$or = [
        { 'student.name': { $regex: search, $options: 'i' } },
        { 'student.regNo': { $regex: search, $options: 'i' } }
      ];
    }

    const fees = await Fee.find(query)
      .populate('student', 'name regNo')
      .populate('class', 'name')
      .sort({ dueDate: 1 })
      .limit(100);

    res.json(fees);
  } catch (err) {
    console.error('Error fetching fees:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/finance/fees
 * Create a new fee record
 */
router.post('/fees', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { studentId, feeType, amount, term, session, dueDate, description } = req.body;

    if (!studentId || !feeType || !amount) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const fee = new Fee({
      student: studentId,
      class: student.class,
      feeType,
      amount,
      term,
      session,
      dueDate: new Date(dueDate),
      status: 'pending',
      description
    });

    await fee.save();
    await fee.populate('student class');

    res.status(201).json({ success: true, fee });
  } catch (err) {
    console.error('Error creating fee:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/finance/fees/:feeId
 * Update fee status
 */
router.patch('/fees/:feeId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, amountPaid, paymentMethod, notes } = req.body;
    const fee = await Fee.findById(req.params.feeId);

    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    if (status) fee.status = status;
    if (amountPaid !== undefined) fee.amountPaid = amountPaid;
    if (paymentMethod) fee.paymentMethod = paymentMethod;
    if (notes) fee.notes = notes;

    await fee.save();
    await fee.populate('student class');

    res.json({ success: true, fee });
  } catch (err) {
    console.error('Error updating fee:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * DELETE /api/finance/fees/:feeId
 * Delete a fee record
 */
router.delete('/fees/:feeId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const fee = await Fee.findByIdAndDelete(req.params.feeId);
    if (!fee) return res.status(404).json({ error: 'Fee not found' });

    res.json({ success: true, message: 'Fee deleted' });
  } catch (err) {
    console.error('Error deleting fee:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== INVOICE MANAGEMENT =====

/**
 * GET /api/finance/invoices
 * Fetch all invoices
 */
router.get('/invoices', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { invoiceNumber: { $regex: search, $options: 'i' } },
        { 'student.name': { $regex: search, $options: 'i' } }
      ];
    }

    const invoices = await Invoice.find(query)
      .populate('student', 'name email regNo')
      .sort({ createdAt: -1 })
      .limit(100);

    res.json(invoices);
  } catch (err) {
    console.error('Error fetching invoices:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/finance/invoices
 * Create a new invoice
 */
router.post('/invoices', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { studentId, items, notes } = req.body;

    if (!studentId || !items || items.length === 0) {
      return res.status(400).json({ error: 'Invalid invoice data' });
    }

    const student = await Student.findById(studentId);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const totalAmount = items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

    const invoice = new Invoice({
      student: studentId,
      items,
      totalAmount,
      status: 'pending',
      notes,
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
    });

    await invoice.save();
    const invoiceNumber = `INV-${invoice._id.toString().slice(-6).toUpperCase()}`;
    invoice.invoiceNumber = invoiceNumber;
    await invoice.save();

    await invoice.populate('student');

    res.status(201).json({ success: true, invoice });
  } catch (err) {
    console.error('Error creating invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/finance/invoices/:invoiceId
 * Update invoice status
 */
router.patch('/invoices/:invoiceId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const invoice = await Invoice.findByIdAndUpdate(
      req.params.invoiceId,
      { status },
      { new: true }
    ).populate('student');

    if (!invoice) return res.status(404).json({ error: 'Invoice not found' });

    res.json({ success: true, invoice });
  } catch (err) {
    console.error('Error updating invoice:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== PAYMENT RECEIPTS =====

/**
 * GET /api/finance/receipts
 * Fetch all payment receipts
 */
router.get('/receipts', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { search } = req.query;
    let query = { status: 'completed' };

    if (search) {
      query.$or = [
        { receiptNumber: { $regex: search, $options: 'i' } },
        { 'student.name': { $regex: search, $options: 'i' } }
      ];
    }

    const receipts = await Payment.find(query)
      .populate('student', 'name email regNo')
      .sort({ transactionDate: -1 })
      .limit(100);

    res.json(receipts);
  } catch (err) {
    console.error('Error fetching receipts:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/finance/receipts/:receiptId
 * Get single receipt details
 */
router.get('/receipts/:receiptId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const receipt = await Payment.findById(req.params.receiptId)
      .populate('student')
      .populate('invoice');

    if (!receipt) return res.status(404).json({ error: 'Receipt not found' });

    res.json(receipt);
  } catch (err) {
    console.error('Error fetching receipt:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== EXPENSE TRACKING =====

/**
 * GET /api/finance/expenses
 * Fetch all expense requests
 */
router.get('/expenses', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, category, search } = req.query;
    let query = {};

    if (status) query.status = status;
    if (category) query.category = category;
    if (search) {
      query.$or = [
        { purpose: { $regex: search, $options: 'i' } },
        { requestedBy: { $regex: search, $options: 'i' } }
      ];
    }

    const expenses = await Expense.find(query)
      .sort({ requestDate: -1 })
      .limit(100);

    res.json(expenses);
  } catch (err) {
    console.error('Error fetching expenses:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/finance/expenses
 * Create a new expense request
 */
router.post('/expenses', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { requestedBy, category, amount, purpose, description, attachments } = req.body;

    if (!requestedBy || !category || !amount || !purpose) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const expense = new Expense({
      requestedBy,
      category,
      amount,
      purpose,
      description,
      attachments,
      status: 'pending',
      requestDate: new Date()
    });

    await expense.save();

    res.status(201).json({ success: true, expense });
  } catch (err) {
    console.error('Error creating expense:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/finance/expenses/:expenseId
 * Update expense status (approve/reject/pay)
 */
router.patch('/expenses/:expenseId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, approverNotes } = req.body;
    const expense = await Expense.findById(req.params.expenseId);

    if (!expense) return res.status(404).json({ error: 'Expense not found' });

    expense.status = status;
    if (approverNotes) expense.approverNotes = approverNotes;

    if (status === 'approved') {
      expense.approvalDate = new Date();
    } else if (status === 'paid') {
      expense.paidDate = new Date();
    }

    await expense.save();

    res.json({ success: true, expense });
  } catch (err) {
    console.error('Error updating expense:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== CASH REQUESTS =====

/**
 * GET /api/finance/cash-requests
 * Fetch all cash requests
 */
router.get('/cash-requests', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status } = req.query;
    let query = {};

    if (status) query.status = status;

    const requests = await CashRequest.find(query)
      .sort({ requestDate: -1 })
      .limit(100);

    res.json(requests);
  } catch (err) {
    console.error('Error fetching cash requests:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/finance/cash-requests
 * Create a new cash request
 */
router.post('/cash-requests', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { requestedBy, amount, reason, description } = req.body;

    if (!requestedBy || !amount || !reason) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const cashRequest = new CashRequest({
      requestedBy,
      amount,
      reason,
      description,
      status: 'pending',
      requestDate: new Date()
    });

    await cashRequest.save();

    res.status(201).json({ success: true, cashRequest });
  } catch (err) {
    console.error('Error creating cash request:', err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * PATCH /api/finance/cash-requests/:requestId
 * Approve/reject/process cash request
 */
router.patch('/cash-requests/:requestId', authMiddleware, adminAuth, async (req, res) => {
  try {
    const { status, approverNotes } = req.body;
    const cashRequest = await CashRequest.findById(req.params.requestId);

    if (!cashRequest) return res.status(404).json({ error: 'Cash request not found' });

    cashRequest.status = status;
    if (approverNotes) cashRequest.approverNotes = approverNotes;

    if (status === 'approved') {
      cashRequest.approvalDate = new Date();
    } else if (status === 'disbursed') {
      cashRequest.disburseDate = new Date();
    }

    await cashRequest.save();

    res.json({ success: true, cashRequest });
  } catch (err) {
    console.error('Error updating cash request:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== MONTHLY REVENUE REPORT =====

/**
 * GET /api/finance/revenue/monthly
 * Get monthly revenue trend for the year
 */
router.get('/revenue/monthly', authMiddleware, adminAuth, async (req, res) => {
  try {
    const year = req.query.year || new Date().getFullYear();

    const monthlyData = await Payment.aggregate([
      {
        $match: {
          status: 'completed',
          transactionDate: {
            $gte: new Date(`${year}-01-01`),
            $lt: new Date(`${year}-12-31`)
          }
        }
      },
      {
        $group: {
          _id: { $month: '$transactionDate' },
          total: { $sum: '$amount' }
        }
      },
      { $sort: { _id: 1 } }
    ]);

    // Fill missing months with 0
    const fullYearData = Array.from({ length: 12 }, (_, i) => {
      const month = i + 1;
      const found = monthlyData.find(d => d._id === month);
      return {
        month,
        monthName: new Date(year, i).toLocaleString('default', { month: 'short' }),
        revenue: found?.total || 0
      };
    });

    res.json(fullYearData);
  } catch (err) {
    console.error('Error fetching monthly revenue:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== PAYMENT STATUS DISTRIBUTION =====

/**
 * GET /api/finance/payment-distribution
 * Get payment status breakdown
 */
router.get('/payment-distribution', authMiddleware, adminAuth, async (req, res) => {
  try {
    const distribution = await Fee.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalAmount: { $sum: '$amount' }
        }
      }
    ]);

    const formatted = {
      paid: 0,
      pending: 0,
      overdue: 0,
      waived: 0
    };

    distribution.forEach(item => {
      if (item._id in formatted) {
        formatted[item._id] = item.totalAmount;
      }
    });

    res.json(formatted);
  } catch (err) {
    console.error('Error fetching payment distribution:', err);
    res.status(500).json({ error: err.message });
  }
});

// ===== EXPORT DATA =====

/**
 * GET /api/finance/export/fees
 * Export fees data as CSV
 */
router.get('/export/fees', authMiddleware, adminAuth, async (req, res) => {
  try {
    const fees = await Fee.find()
      .populate('student', 'name regNo')
      .populate('class', 'name');

    let csv = 'Student Name,RegNo,Class,Fee Type,Amount,Status,Term,Session,Due Date,Payment Method\n';
    
    fees.forEach(fee => {
      csv += `"${fee.student?.name || ''}","${fee.student?.regNo || ''}","${fee.class?.name || ''}","${fee.feeType}",${fee.amount},"${fee.status}","${fee.term}","${fee.session}","${fee.dueDate?.toLocaleDateString()}","${fee.paymentMethod || ''}"\n`;
    });

    res.header('Content-Type', 'text/csv');
    res.header('Content-Disposition', 'attachment; filename="fees_export.csv"');
    res.send(csv);
  } catch (err) {
    console.error('Error exporting fees:', err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
