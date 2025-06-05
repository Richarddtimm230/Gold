require('dotenv').config();
const express = require('express');
require('./db'); // Just require, do NOT call as a function!

const resultsRoute = require('./routes/results');

const app = express();
app.use(express.json());
app.use('/api/results', resultsRoute);

app.get('/', (req, res) => {
  res.send('School Results API running');
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
