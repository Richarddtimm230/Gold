const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User'); // Adjust path if needed

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, regNo, password } = req.body;
  if ((!email && !regNo) || !password) {
    return res.status(400).json({ error: 'Email/RegNo and password required' });
  }

  // Find user by email or registration number
  const query = email ? { email } : { regNo };
  const user = await User.findOne(query);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  // Generate JWT
  const token = jwt.sign(
    { id: user._id, role: user.role, email: user.email, regNo: user.regNo },
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
});

module.exports = router;
