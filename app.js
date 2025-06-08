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

// --- ROUTES ---
const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const subjectsRoute = require('./routes/subjects');
const dashboardRoute = require('./routes/dashboard');
const studentsRoute = require('./routes/students');
const { router: authRoute, authMiddleware } = require('./routes/auth');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/auth', authRoute);
app.use('/api/dashboard', dashboardRoute);

app.get('/api/dashboard', authMiddleware, (req, res) => {
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: "Forbidden" });
  res.json({ message: "Welcome, Super Admin!" });
});

app.use('/api/results', resultsRoute);
app.use('/api/classes', classesRoute);
app.use('/api/subjects', subjectsRoute);
app.use('/api/students', studentsRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

// Ensure Superadmin, then start server
(async () => {
  await ensureSuperAdmin(db); // Pass db if ensureSuperAdmin expects it
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
})();
