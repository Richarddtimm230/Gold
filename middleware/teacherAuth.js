const jwt = require('jsonwebtoken');
const Staff = require('../models/Staff'); // Use your Mongoose model

async function teacherAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Find teacher in MongoDB by ID and check access_level
    const teacher = await Staff.findById(decoded.id);
    if (!teacher || teacher.access_level !== 'Teacher') {
      return res.status(401).json({ error: 'Teacher not found or not authorized.' });
    }
    req.staff = teacher; // Attach teacher info to request
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
module.exports = teacherAuthMiddleware;
