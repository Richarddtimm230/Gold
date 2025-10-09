const express = require('express');
const router = express.Router();
const adminAuth = require('../middleware/adminAuth');
const ReportPreference = require('../models/ReportPreference');

// Get current preferences
router.get('/', adminAuth, async (req, res) => {
  let prefs = await ReportPreference.findById("global").lean();
  if (!prefs) {
    prefs = await ReportPreference.create({ _id: "global" }); // default prefs
  }
  res.json(prefs);
});

// Update preferences
router.post('/', adminAuth, async (req, res) => {
  let prefs = await ReportPreference.findByIdAndUpdate(
    "global", req.body, { upsert: true, new: true }
  );
  res.json(prefs);
});

module.exports = router;
