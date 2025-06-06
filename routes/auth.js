const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

// --- LOGIN ROUTE ---
router.post('/login', async (req, res) => {
  const { email, regNo, password } = req.body;
  if ((!email && !regNo) || !password) {
    return res.status(400).json({ error: 'Email/registration number and password are required.' });
  }
  try {
    // Find user by email or regNo
    const query = email ? { email } : { regNo };
    const user = await User.findOne(query);
    if (!user) return res.status(401).json({ error: 'Invalid credentials.' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ error: 'Invalid credentials.' });

    // Generate JWT
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

    res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        regNo: user.regNo,
        role: user.role
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// --- AUTH MIDDLEWARE ---
function authMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = { router, authMiddleware };
