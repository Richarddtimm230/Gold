const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Student = require('../models/Student');

// --- UNIFIED LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  const { email, regNo, password } = req.body;
  if ((!email && !regNo) || !password) {
    return res.status(400).json({ error: 'Email/registration number and password are required.' });
  }
  try {
    // Try User (staff/admin/superadmin)
    let user = null;
    if (email) {
      user = await User.findOne({ email });
    } else if (regNo) {
      user = await User.findOne({ regNo });
    }
    if (user && await bcrypt.compare(password, user.password)) {
      const token = jwt.sign(
        {
          id: user._id,
          role: user.role,
          email: user.email,
          regNo: user.regNo
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          regNo: user.regNo,
          role: user.role
        }
      });
    }

    // Try Student (regNo or email)
    let student = null;
    if (regNo) {
      student = await Student.findOne({ regNo });
    } else if (email) {
      student = await Student.findOne({ studentEmail: email });
    }
    if (student && await bcrypt.compare(password, student.password)) {
      const token = jwt.sign(
        {
          id: student._id,
          role: 'student',
          regNo: student.regNo
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
      );
      return res.json({
        token,
        user: {
          id: student._id,
          name: `${student.firstname} ${student.surname}`,
          regNo: student.regNo,
          role: 'student'
        }
      });
    }

    return res.status(401).json({ error: 'Invalid credentials.' });
  } catch (err) {
    console.error('[LOGIN ERROR]', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- AUTH MIDDLEWARE ---
async function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Try fetching user (staff/admin)
    let user = await User.findById(decoded.id).select('-password');
    if (user) {
      req.user = user;
      return next();
    }
    // Fallback: Try fetching student
    let student = await Student.findById(decoded.id).select('-password');
    if (student) {
      req.user = {
        id: student._id,
        name: `${student.firstname} ${student.surname}`,
        regNo: student.regNo,
        role: 'student'
        // Add more fields as needed
      };
      return next();
    }
    return res.status(401).json({ error: 'User not found.' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

// --- GET CURRENT USER ROUTE ---
router.get('/me', authMiddleware, (req, res) => {
  // req.user is set by authMiddleware and does not include password
  res.json(req.user);
});

module.exports = { router, authMiddleware };
