const jwt = require('jsonwebtoken');
const db = require('../firestore'); // Firestore instance

async function staffAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // Fetch staff/admin user from Firestore by ID
    const staffDoc = await db.collection('staff').doc(decoded.id).get();
    if (!staffDoc.exists) {
      return res.status(401).json({ error: 'Staff/Admin not found.' });
    }
    const staff = staffDoc.data();
    req.user = { id: staffDoc.id, ...staff }; // Attach user info and role
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}
module.exports = staffAuthMiddleware;
