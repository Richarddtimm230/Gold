const jwt = require('jsonwebtoken');
const db = require('../firestore'); // Firestore instance

async function studentAuthMiddleware(req, res, next) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided.' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Fetch student from Firestore
    const studentDoc = await db.collection('students').doc(decoded.id).get();

    if (!studentDoc.exists) {
      return res.status(401).json({ error: 'Student not found.' });
    }

    // Remove password field if it exists
    const student = studentDoc.data();
    delete student.password;

    req.student = { id: studentDoc.id, ...student };
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = studentAuthMiddleware;
