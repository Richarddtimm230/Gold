require('dotenv').config();
const express = require('express');
const path = require('path');
require('./db'); // Just require, do NOT call as a function!

const resultsRoute = require('./routes/results');

const app = express();

// Middleware
app.use(express.json());

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// API route
app.use('/api/results', resultsRoute);

// Root route (optional: can redirect to index.html or just provide text)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
