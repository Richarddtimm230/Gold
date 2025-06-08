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

    // Fetch student from Firestore by regNo or id (support both for flexibility)
    let studentDoc;
    if (decoded.id) {
      studentDoc = await db.collection('students').doc(decoded.id).get();
    } else if (decoded.regNo) {
      const snap = await db.collection('students').where('regNo', '==', decoded.regNo).limit(1).get();
      if (!snap.empty) studentDoc = snap.docs[0];
    }

    if (!studentDoc || !studentDoc.exists) {
      return res.status(401).json({ error: 'Student not found.' });
    }

    // Remove password field if it exists
    const student = studentDoc.data();
    delete student.password;

    req.student = { id: studentDoc.id, ...student };
    req.user = req.student; // Also attach as req.user for role-based middleware compatibility
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

module.exports = studentAuthMiddleware;
