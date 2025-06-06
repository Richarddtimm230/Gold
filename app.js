require('dotenv').config();
const express = require('express');
const path = require('path');
const mongoose = require('mongoose');
require('./db');

const resultsRoute = require('./routes/results');
const classesRoute = require('./routes/classes');
const subjectsRoute = require('./routes/subjects');

const app = express();
app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/results', resultsRoute);
app.use('/api/classes', classesRoute);
app.use('/api/subjects', subjectsRoute);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
