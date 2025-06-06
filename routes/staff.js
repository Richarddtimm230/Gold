const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcrypt');
const Staff = require('../models/Staff');

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * GET /api/staff
 * Return all staff (for staff list view)
 * (Consider pagination for large data sets)
 */
router.get('/', async (req, res) => {
  try {
    // Only select summary fields for the staff list
    const staffList = await Staff.find({}, {
      first_name: 1,
      last_name: 1,
      designation: 1,
      department: 1,
      photo: 1 // This is base64 data; you may want to return a thumbnail or use ui-avatars as fallback in frontend
    }).sort({ last_name: 1, first_name: 1 });

    // For each staff, optionally return just a thumbnail or a flag if photo exists
    const mapped = staffList.map(s => ({
      id: s._id,
      first_name: s.first_name,
      last_name: s.last_name,
      designation: s.designation,
      department: s.department,
      // Use photo directly, or send nothing if not present
      photo_url: s.photo || null
    }));

    res.json(mapped);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staff/:id
 * Return full details for a single staff member (for modal popup)
 */
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).lean();
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    // Rename photo/id_upload for frontend compatibility
    staff.photo_url = staff.photo || null;
    staff.id_upload_url = staff.id_upload || null;
    delete staff.photo;
    delete staff.id_upload;
    delete staff.login_password; // Never send hashed passwords

    res.json(staff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// POST /api/staff - enroll new staff
router.post(
  '/',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_upload', maxCount: 1 }
  ]),
  async (req, res) => {
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
  }
);

module.exports = router;
