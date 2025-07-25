const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');

// Mongoose model
const Staff = require('../models/Staff');

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * GET /api/staff - Return all staff (summary)
 */
router.get('/', async (req, res) => {
  try {
    const staffList = await Staff.find({}, 'first_name last_name designation department photo').lean();

    // Format response
    const formattedStaff = staffList.map(s => ({
      id: s._id,
      first_name: s.first_name,
      last_name: s.last_name,
      designation: s.designation,
      department: s.department,
      photo_url: s.photo || null
    }));

    // Sort by last_name, then first_name
    formattedStaff.sort((a, b) => {
      if (a.last_name === b.last_name) {
        return a.first_name.localeCompare(b.first_name);
      }
      return a.last_name.localeCompare(b.last_name);
    });

    res.json(formattedStaff);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * GET /api/staff/:id - Return full details for a staff member
 */
router.get('/:id', async (req, res) => {
  try {
    const staff = await Staff.findById(req.params.id).lean();
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    staff.photo_url = staff.photo || null;
    staff.id_upload_url = staff.id_upload || null;
    delete staff.photo;
    delete staff.id_upload;
    delete staff.login_password;

    res.json({ id: staff._id, ...staff });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/staff - Enroll new staff
 */
router.post(
  '/',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_upload', maxCount: 1 }
  ]),
  async (req, res) => {
    try {
      const data = req.body;

      // Handle photo
      let photo;
      if (req.files && req.files['photo'] && req.files['photo'][0]) {
        const file = req.files['photo'][0];
        photo = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      // Handle ID upload
      let id_upload;
      if (req.files && req.files['id_upload'] && req.files['id_upload'][0]) {
        const file = req.files['id_upload'][0];
        id_upload = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(data.login_password, 10);

      // Convert fields
      let date_joined = data.date_joined ? new Date(data.date_joined) : null;
      let dob = data.dob ? new Date(data.dob) : null;
      let experience = data.experience ? Number(data.experience) : null;

      // Check for duplicate email or account number
      if (await Staff.findOne({ email: data.email })) {
        return res.status(400).json({ error: 'Duplicate email.' });
      }
      if (data.account_number && await Staff.findOne({ account_number: data.account_number })) {
        return res.status(400).json({ error: 'Duplicate account number.' });
      }

      // Prepare staff document
      const staffDoc = new Staff({
        ...data,
        login_password: hashedPassword,
        photo,
        id_upload,
        date_joined: date_joined || undefined,
        dob: dob || undefined,
        experience: experience || undefined
      });

      await staffDoc.save();
      res.status(201).json({ message: 'Staff enrolled successfully!' });
    } catch (error) {
      console.error('[STAFF ENROLL ERROR]', error);
      if (error.name === 'ValidationError') {
        let msg = error.message;
        if (error.errors) {
          msg = Object.values(error.errors).map(e => e.message).join('; ');
        }
        return res.status(400).json({ error: msg });
      }
      if (error.code === 11000) {
        return res.status(400).json({ error: 'Duplicate email or account number.' });
      }
      res.status(500).json({ error: error.message || 'Unknown server error.' });
    }
  }
);

module.exports = router;
