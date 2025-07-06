const jwt = require('jsonwebtoken');
const db = require('../firestore'); // Firestore instance

async function teacherAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch teacher user from Firestore by ID
    const teacherDoc = await db.collection('teachers').doc(decoded.id).get();
    if (!teacherDoc.exists) {
      return res.status(401).json({ error: 'Teacher not found.' });
    }
    const teacher = teacherDoc.data();
    req.user = { id: teacherDoc.id, ...teacher }; // Attach user info and role
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
module.exports = teacherAuthMiddleware;
