require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// --- MONGOOSE INIT ---
const mongoose = require('mongoose');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin'); // Adjust path if needed

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/myschoolapp';
mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
}).then(() =>
  console.log('MongoDB connected!')
).catch((err) => {
  console.error('MongoDB connection error:', err);
  process.exit(1);
});

const app = express();

// --- ROUTER IMPORTS ---
const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const studentsRoute = require('./routes/students');
const { router: authRoute, authMiddleware } = require('./routes/auth');

// Modular routes for dashboard features
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

// --- APP MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---
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

// Example: Super Admin protected dashboard endpoint
app.get('/api/dashboard', authMiddleware, (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: "Forbidden" });
  res.json({ message: "Welcome, Super Admin!" });
});

// Serve SPA entry point
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

// Ensure Superadmin, then start server
(async () => {
  await ensureSuperAdmin(); // If ensureSuperAdmin expects db, pass mongoose.connection
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
})();
