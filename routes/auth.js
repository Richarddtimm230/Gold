const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'yoursecretkey';

// Register (for testing/setup; restrict in production)
router.post('/register', async (req, res) => {
  try {
    const { name, email, regNo, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: "Missing fields" });
    let exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ error: "Email already in use" });
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      regNo,
      password: hash,
      role: role ? role.toLowerCase() : 'student'
    });
    res.status(201).json({ message: "User registered" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post('/login', async (req, res) => {
  try {
    const { email, regNo, password } = req.body;
    // Login can be with email or regNo
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (regNo) {
      user = await User.findOne({ regNo });
    }
    if (!user) return res.status(401).json({ error: "Invalid credentials" });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });
    // Generate JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      JWT_SECRET,
      { expiresIn: '1d' }
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
    res.status(500).json({ error: err.message });
  }
});

// Get current user (profile)
router.get('/me', authMiddleware, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Middleware for JWT authentication
function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ error: "No token" });
  const token = authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: "No token" });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(401).json({ error: "Invalid token" });
    req.user = user; // { id, role, name }
    next();
  });
}

module.exports = { router, authMiddleware };
