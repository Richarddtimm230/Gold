require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('./db');

const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const subjectsRoute = require('./routes/subjects');
const studentsRoute = require('./routes/students'); // <-- ADDED
const { router: authRoute, authMiddleware } = require('./routes/auth');
const ensureSuperAdmin = require('./utils/ensureSuperAdmin');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use('/api/staff', require('./routes/staff'));
// Auth routes
app.use('/api/auth', authRoute);

// Example: protect dashboard API
app.get('/api/dashboard', authMiddleware, (req, res) => {
  // Only superadmin can see this
  if (req.user.role !== 'superadmin') return res.status(403).json({ error: "Forbidden" });
  res.json({ message: "Welcome, Super Admin!" });
});

// ...other routes...
app.use('/api/results', resultsRoute);
app.use('/api/classes', classesRoute);
app.use('/api/subjects', subjectsRoute);
app.use('/api/students', studentsRoute); // <-- ADDED

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;

// Wait for MongoDB before creating superadmin and starting server
mongoose.connection.once('open', async () => {
  await ensureSuperAdmin();
  app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
});
