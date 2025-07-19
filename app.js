// app.js
require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin');

// Create Express app
const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ========== Routes ==========
const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const studentsRoute = require('./routes/students');
const { router: authRoute, authMiddleware } = require('./routes/auth');
const academicsRoute = require('./routes/academics');
const examsRoute = require('./routes/exams');
const cbtRoute = require('./routes/cbt');
const assignmentsRoute = require('./routes/assignments');
const attendanceRoute = require('./routes/attendance');
const notificationsRoute = require('./routes/notifications');
const profileRoute = require('./routes/profile');
const dashboardRoute = require('./routes/dashboard');
const siteContentRouter = require('./routes/siteContent');
const adminRoute = require('./routes/admin');
const staffRoute = require('./routes/staff');
const teachersRoute = require('./routes/teachers');
const subjectsRoute = require('./routes/subjects');

// Route mounting
app.use('/api/auth', authRoute);
app.use('/api/staff', staffRoute);
app.use('/api', dashboardRoute);
app.use('/api/academics', academicsRoute);
app.use('/api/exams', examsRoute);
app.use('/api/cbt', cbtRoute);
app.use('/api/assignments', assignmentsRoute);
app.use('/api/attendance', attendanceRoute);
app.use('/api/notifications', notificationsRoute);
app.use('/api/profile', profileRoute);
app.use('/api/teachers', teachersRoute);
app.use('/api/results', resultsRoute);
app.use('/api/classes', classesRoute);
app.use('/api/subjects', subjectsRoute);
app.use('/api/students', studentsRoute);
app.use('/api/site', siteContentRouter);
app.use('/api/admin', adminRoute);

// Super Admin protected route
app.get('/api/dashboard', authMiddleware, (req, res) => {
  if (req.user.role !== 'superadmin') {
    return res.status(403).json({ error: 'Forbidden: Super Admin access only.' });
  }
  res.json({ message: 'Welcome, Super Admin!' });
});

// Serve index.html as fallback
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// MongoDB connection + boot
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myschoolapp';

(async () => {
  try {
    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true
    });
    console.log('✅ MongoDB connected');

    await ensureSuperAdmin(); // 👑 Ensure superadmin now that DB is ready

    app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
  } catch (err) {
    console.error('❌ App initialization failed:', err);
    process.exit(1);
  }
})();
