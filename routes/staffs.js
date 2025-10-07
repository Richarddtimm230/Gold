const express = require('express');
const router = express.Router();
const multer = require('multer');
const bcrypt = require('bcryptjs');
const Staff = require('../models/Staff');

const storage = multer.memoryStorage();
const upload = multer({ storage });

/**
 * GET /api/staff - Return all staff (summary)
 */
router.get('/', async (req, res) => {
  try {
    const staffList = await Staff.find({}, 'first_name last_name designation department photo').lean();

    const formattedStaff = staffList.map(s => ({
      id: s._id,
      first_name: s.first_name,
      last_name: s.last_name,
      designation: s.designation,
      department: s.department,
      photo_url: s.photo || null
    }));

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
 * FILTERED ENDPOINTS for each special staff section
 * You can add more below as needed!
 */
const departments = [
  { route: 'bursary', dep: 'Bursary' },
  { route: 'registrar', dep: 'Registrar' },
  { route: 'general', dep: 'General' },
  { route: 'librarian', dep: 'Library' },
  { route: 'hostel', dep: 'Hostel' },
  { route: 'transport', dep: 'Transport' }
];

// GET /api/staff/bursary etc.
departments.forEach(({route, dep}) => {
  // GET
  router.get(`/${route}`, async (req, res) => {
    try {
      const staffList = await Staff.find({
        department: new RegExp('^' + dep + '$', 'i')
      }, 'first_name last_name designation department photo').lean();

      const formattedStaff = staffList.map(s => ({
        id: s._id,
        first_name: s.first_name,
        last_name: s.last_name,
        designation: s.designation,
        department: s.department,
        photo_url: s.photo || null
      }));

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

  // PATCH
  router.patch(
    `/${route}/:id`,
    upload.fields([
      { name: 'photo', maxCount: 1 },
      { name: 'id_upload', maxCount: 1 }
    ]),
    async (req, res) => {
      req.body.department = dep; // enforce correct department
      return updateStaffById(req, res);
    }
  );

  // DELETE
  router.delete(`/${route}/:id`, async (req, res) => {
    return deleteStaffById(req, res);
  });
});
// PATCH /api/staffs/:id/classes
router.patch('/:id/classes', async (req, res) => {
  const staffId = req.params.id;
  const { classIds } = req.body; // classIds is array of class ObjectIds
  if (!Array.isArray(classIds)) return res.status(400).json({ error: "classIds must be an array" });

  try {
    // Update teacher's assigned classes
    const staff = await Staff.findByIdAndUpdate(
      staffId,
      { classes: classIds },
      { new: true }
    );
    // Optionally, update Class model to link to teacher as well
    await Class.updateMany(
      { _id: { $in: classIds } },
      { $addToSet: { teachers: staffId } }
    );
    res.json({ message: "Classes assigned to teacher!", staff });
  } catch (err) {
    res.status(500).json({ error: err.message });
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

/**
 * PATCH /api/staff/:id - Update staff member
 */
router.patch(
  '/:id',
  upload.fields([
    { name: 'photo', maxCount: 1 },
    { name: 'id_upload', maxCount: 1 }
  ]),
  updateStaffById
);

/**
 * DELETE /api/staff/:id - Delete staff member
 */
router.delete('/:id', deleteStaffById);

// --- Helper functions for PATCH/DELETE ---
async function updateStaffById(req, res) {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    const data = req.body;

    // If updating password, hash it
    if (data.login_password) {
      staff.login_password = await bcrypt.hash(data.login_password, 10);
    }

    // Handle photo
    if (req.files && req.files['photo'] && req.files['photo'][0]) {
      const file = req.files['photo'][0];
      staff.photo = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }
    // Handle ID upload
    if (req.files && req.files['id_upload'] && req.files['id_upload'][0]) {
      const file = req.files['id_upload'][0];
      staff.id_upload = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;
    }

    // Convert fields
    if (data.date_joined) staff.date_joined = new Date(data.date_joined);
    if (data.dob) staff.dob = new Date(data.dob);
    if (data.experience) staff.experience = Number(data.experience);

    // Update all other fields except protected ones
    const protectedFields = ['_id', 'id', 'login_password', 'photo', 'id_upload', 'createdAt', 'updatedAt'];
    for (const key in data) {
      if (protectedFields.includes(key)) continue;
      staff[key] = data[key];
    }

    // Check for duplicate email/account_number if changed
    if (data.email && data.email !== staff.email) {
      if (await Staff.findOne({ email: data.email, _id: { $ne: staff._id } })) {
        return res.status(400).json({ error: 'Duplicate email.' });
      }
    }
    if (data.account_number && data.account_number !== staff.account_number) {
      if (await Staff.findOne({ account_number: data.account_number, _id: { $ne: staff._id } })) {
        return res.status(400).json({ error: 'Duplicate account number.' });
      }
    }

    await staff.save();
    res.json({ message: 'Staff updated successfully!' });
  } catch (error) {
    console.error('[STAFF UPDATE ERROR]', error);
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

async function deleteStaffById(req, res) {
  try {
    const staff = await Staff.findById(req.params.id);
    if (!staff) return res.status(404).json({ error: 'Staff not found' });

    await Staff.deleteOne({ _id: req.params.id });
    res.json({ message: 'Staff deleted successfully!' });
  } catch (error) {
    console.error('[STAFF DELETE ERROR]', error);
    res.status(500).json({ error: error.message || 'Unknown server error.' });
  }
}

module.exports = router;
