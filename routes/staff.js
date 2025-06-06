const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const Staff = require('../models/Staff');

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

// POST /api/staff - enroll new staff
router.post('/', upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'id_upload', maxCount: 1 }
]), async (req, res) => {
  try {
    const data = req.body;

    // Hash password
    const hashedPassword = await bcrypt.hash(data.login_password, 10);

    // Handle photo
    let photo;
    if (req.files['photo']) {
      const file = req.files['photo'][0];
      photo = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    // Handle ID upload
    let id_upload;
    if (req.files['id_upload']) {
      const file = req.files['id_upload'][0];
      id_upload = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    // Create staff document
    const staff = new Staff({
      ...data,
      login_password: hashedPassword,
      photo,
      id_upload
    });

    await staff.save();
    res.status(201).json({ message: 'Staff enrolled successfully!' });
  } catch (error) {
    console.error('[STAFF ENROLL ERROR]', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ error: error.message });
    }
    if (error.code === 11000) {
      return res.status(400).json({ error: 'Duplicate email or account number.' });
    }
    res.status(500).json({ error: error.message || 'Unknown server error.' });
  }
});

module.exports = router;
