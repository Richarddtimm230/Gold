require('dotenv').config();
const express = require('express');
const connectDB = require('./db');

const resultsRoute = require('./routes/results');

const app = express();

// Middleware
app.use(express.json());

// Connect to MongoDB Atlas
connectDB();

// Routes
app.use('/api/results', resultsRoute);

app.get('/', (req, res) => {
  res.send('School Results API running');
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
