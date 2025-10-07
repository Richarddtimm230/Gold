const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff'); // Use your Mongoose model

async function staffAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch staff/admin user from MongoDB by ID
    const staff = await Staff.findById(decoded.id);
    if (!staff) {
      return res.status(401).json({ error: 'Staff/Admin not found.' });
    }
    req.user = { id: staff._id, ...staff.toObject() }; // Attach user info and role
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = staffAuthMiddleware;
