const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Make sure you have already initialized admin.firestore() in your app

router.get('/dashboard/summary', async (req, res) => {
  try {
    const db = admin.firestore();

    // Count active students and total students
    const studentsSnap = await db.collection('students').get();
    const students = [];
    studentsSnap.forEach(doc => students.push(doc.data()));

    const activeStudents = students.filter(s => s.accountStatus === 'Active').length;
    const totalStudents = students.length;

    // Count employees
    const employeesSnap = await db.collection('employees').get();
    const employees = employeesSnap.size;

    // Count parents
    const parentsSnap = await db.collection('parents').get();
    const parents = parentsSnap.size;

    // Payments today and this month
    const paymentsSnap = await db.collection('payments').get();
    let todayPayments = { count: 0, amount: 0 };
    let monthPayments = { count: 0, amount: 0 };
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    paymentsSnap.forEach(doc => {
      const payment = doc.data();
      const payDate = payment.date ? payment.date.toDate ? payment.date.toDate() : new Date(payment.date) : null;
      if (!payDate) return;
      if (payDate >= startOfToday) {
        todayPayments.count += 1;
        todayPayments.amount += payment.amount || 0;
      }
      if (payDate >= startOfMonth) {
        monthPayments.count += 1;
        monthPayments.amount += payment.amount || 0;
      }
    });

    // Example for other data (make sure to create collections as needed)
    const cashRequests = (await db.collection('cashRequests').get()).size;
    const expiringSubscriptions = students.filter(s => s.subscriptionStatus === 'Expired').length;
    const ongoingAdmissions = (await db.collection('admissions').where('status', '==', 'ongoing').get()).size;
    const totalAdmissions = (await db.collection('admissions').get()).size;

    // Hostel, transport, library, inventory, leave
    const hostelApplications = (await db.collection('hostelApplications').where('status', '==', 'pending').get()).size;
    const transportApplications = (await db.collection('transportApplications').where('status', '==', 'pending').get()).size;
    const libraryRequests = (await db.collection('libraryRequests').where('status', '==', 'pending').get()).size;
    const inventoryRequests = (await db.collection('inventoryRequests').where('status', '==', 'pending').get()).size;
    const leaveApplications = (await db.collection('leaveApplications').where('status', '==', 'pending').get()).size;

    // Monthly finance summary for chart
    const months = [];
    const incomes = [];
    const expenditures = [];
    // For demo: 24 months, real app: group payments by month
    for (let i = 0; i < 24; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() - 23 + i, 1);
      months.push(d.toLocaleString('default', { month: 'short', year: 'numeric' }));
      // TODO: aggregate payments for this month (replace zeros with actual sums)
      incomes.push(0);
      expenditures.push(0);
    }

    // Example: aggregate payments by month (you can optimize this with Firestore queries)
    paymentsSnap.forEach(doc => {
      const payment = doc.data();
      const payDate = payment.date ? payment.date.toDate ? payment.date.toDate() : new Date(payment.date) : null;
      if (!payDate) return;
      const idx = (payDate.getFullYear() - now.getFullYear()) * 12 + payDate.getMonth() - now.getMonth() + 23;
      if (idx >= 0 && idx < 24) {
        incomes[idx] += payment.amount || 0;
      }
    });

    res.json({
      todayPayments,
      monthPayments,
      cashRequests,
      expiringSubscriptions,
      employees,
      parents,
      activeStudents,
      totalStudents,
      ongoingAdmissions,
      totalAdmissions,
      hostelApplications,
      transportApplications,
      libraryRequests,
      inventoryRequests,
      leaveApplications,
      session: "2024–2025", // You can make this dynamic
      financeSummary: {
        labels: months,
        incomes,
        expenditures,
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

module.exports = router;
