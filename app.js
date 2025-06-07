require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

// --- FIREBASE ADMIN/FIRESTORE INIT ---
const { initializeApp, cert } = require('firebase-admin/app');
const { getFirestore } = require('firebase-admin/firestore');
const serviceAccount = require('./firebaseServiceAccount.json'); // Place your downloaded serviceAccount file here

initializeApp({
  credential: cert(serviceAccount),
  // Uncomment if you want to specify the projectId explicitly:
  projectId: "myschoolapp-eac54",
});
const db = getFirestore();

// Optionally attach db to app locals for easy use in routes
// (you can also require this instance in each route file)
const app = express();
app.locals.firestoreDB = db;

// --- ROUTES ---
const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const subjectsRoute = require('./routes/subjects');
const studentsRoute = require('./routes/students');
const { router: authRoute, authMiddleware } = require('./routes/auth');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin');

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/staff', require('./routes/staff'));
app.use('/api/auth', authRoute);

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

// Firestore does not need a connection event; just ensureSuperAdmin and start server
(async () => {
  await ensureSuperAdmin(db); // Pass db if ensureSuperAdmin expects it
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
})();
