// /app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin');

const app = express();

/* ================= CORS ================= */

const allowedOrigins = process.env.CORS_ORIGINS
  ? process.env.CORS_ORIGINS.split(',').map(origin => origin.trim())
  : [];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error('CORS not allowed for this origin'));
  },
  credentials: true
};

app.use(cors(corsOptions));

/* ================= Middleware ================= */

app.use(express.json({ limit: '20mb' }));
app.use(express.static(path.join(__dirname, 'public')));

/* ================= Routes ================= */

const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const studentsRoute = require('./routes/students');
const { router: authRoute, authMiddleware } = require('./routes/auth');
const adminAuth = require('./middleware/adminAuth');
const dashboardRoute = require('./routes/dashboard');
const adminRoute = require('./routes/admin');
const staffRoute = require('./routes/staff');
const staffsRoute = require('./routes/staffs');
const subjectsRoute = require('./routes/subjects');
const familiesRoute = require('./routes/families');
const parentsRoute = require('./routes/parents');
const feesRoute = require('./routes/fees');
const academicsRoute = require('./routes/academics');
const schoolAdminRoute = require('./routes/schoolAdmin');
const schoolAdminsRoute = require('./routes/schoolAdmins');
const transportRoute = require('./routes/transport');
const hostelRoute = require('./routes/hostel');
const assignmentsRoute = require('./routes/assignments');
const teachersRoute = require('./routes/teachers');
const teacherResultsRoute = require('./routes/teacherResults');
const examRoute = require('./routes/exam');
const activityRoute = require('./routes/activities');
const uploadRoute = require('./routes/upload');
const resultscbtRoute = require('./routes/resultscbt');
const admissionRoute = require('./routes/admission');
const paymentsRoute = require('./routes/payments');
const financeRoute = require('./routes/finance');
// Add this line with other route imports at the top:
const sessionSettingsRoute = require('./routes/sessionSettings');

// Add this line with other route mounting:
app.use('/api/report/session', sessionSettingsRoute);
/* ================= Route Mounting ================= */

app.use('/api/exam', examRoute);
app.use('/api/result', resultscbtRoute);
app.use('/api/activity', activityRoute);
app.use('/api/upload', uploadRoute);
app.use('/api/teachers', teacherResultsRoute);
app.use('/api/teachers', teachersRoute);
app.use('/api/assignments', assignmentsRoute);
app.use('/api/hostel', hostelRoute);
app.use('/api/subjects', subjectsRoute);
app.use('/api/transport', transportRoute);
app.use('/api', schoolAdminRoute);
app.use('/api', schoolAdminsRoute);
app.use('/api/fees', feesRoute);
app.use('/api/academics', academicsRoute);
app.use('/api/families', familiesRoute);
app.use('/api/parents', parentsRoute);
app.use('/api/auth', authRoute);
app.use('/api/staff', staffRoute);
app.use('/api/staffs', staffsRoute);
app.use('/api', dashboardRoute);
app.use('/api/results', resultsRoute);
app.use('/api/classes', authMiddleware, adminAuth, classesRoute);
app.use('/api/student', studentsRoute);
app.use('/api/students', studentsRoute);
app.use('/api/admin', adminRoute);
app.use('/api/report/preferences', require('./routes/reportPreferences'));
app.use('/api/admission', admissionRoute);
app.use('/api/payments', paymentsRoute);
app.use('/api/finance', financeRoute);

/* ================= Super Admin Route ================= */

app.get('/api/dashboard', authMiddleware, (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access only.' });
  }
  res.json({ message: 'Welcome, Super Admin!' });
});

/* ================= Fallback ================= */

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/* ================= Mongo Boot ================= */

const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myschoolapp';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });

    console.log('✅ MongoDB connected');

    await ensureSuperAdmin();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });

  } catch (err) {
    console.error('❌ App initialization failed:', err);
    process.exit(1);
  }
})();

module.exports = app;
