require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// --- FIREBASE ADMIN/FIRESTORE INIT ---
const { initializeApp, getApps, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');

// Prefer environment variable for service account (for Render/deployment), fallback to local file
let serviceAccount;
if (process.env.FIREBASE_SERVICE_ACCOUNT) {
  serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
} else {
  serviceAccount = require('./firebaseServiceAccount.json');
}

// Guard against duplicate app initialization
if (!getApps().length) {
  initializeApp({
    credential: cert(serviceAccount),
    projectId: 'myschoolapp-eac54', // optional if included in service account
  });
}
const db = getFirestore();

const ensureSuperAdmin = require('./utils/ensureSuperAdmin'); // Adjust path if needed

const app = express();
app.locals.firestoreDB = db;

// --- ROUTER IMPORTS ---
const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const studentsRoute = require('./routes/students');
const { router: authRoute, authMiddleware } = require('./routes/auth');

// NEW: Modular routes for all dashboard features
const academicsRoute = require('./routes/academics');
const examsRoute = require('./routes/exams');
const cbtRoute = require('./routes/cbt');
const assignmentsRoute = require('./routes/assignments');
const attendanceRoute = require('./routes/attendance');
const notificationsRoute = require('./routes/notifications');
const profileRoute = require('./routes/profile');

// Legacy/combined dashboard route if needed
const dashboardRoute = require('./routes/dashboard');
const adminHomepageRouter = require('./routes/adminHomepage');

// --- NEW: SITE CONTENT ROUTE ---
const siteContentRouter = require('./routes/siteContent');

// --- APP MIDDLEWARE ---
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// --- API ROUTES ---
app.use('/api/auth', authRoute);
app.use('/api/staff', require('./routes/staff'));
app.use('/api', dashboardRoute); // legacy/combined routes

// Modular REST endpoints for dashboard features
app.use('/api/academics', academicsRoute);
app.use('/api/exams', examsRoute);
app.use('/api/cbt', cbtRoute);
app.use('/api/assignments', assignmentsRoute);
app.use('/api/attendance', attendanceRoute);
app.use('/api/notifications', notificationsRoute);
app.use('/api/profile', profileRoute);

app.use('/api/results', resultsRoute);
app.use('/api/classes', classesRoute);
app.use('/api/subjects', require('./routes/subjects'));
app.use('/api/students', studentsRoute);

// Admin homepage route
app.use('/api/admin', adminHomepageRouter);

// --- SITE CONTENT ROUTE ---
app.use('/api/site', siteContentRouter);

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
  await ensureSuperAdmin(db); // Pass db if ensureSuperAdmin expects it
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
})();
